import os
import json
import zipfile
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.job import GenerationJob, JobStatus
from app.models.certificate import Certificate, CertificateStatus
from app.schemas.job import JobCreate
from app.services.pdf_generator import generate_pdf_certificate

logger = logging.getLogger("certiflow.job_service")

def create_job_with_recipients(db: Session, job_in: JobCreate) -> GenerationJob:
    """
    Creates a new bulk generation job and all child recipient certificate records atomically.
    """
    job = GenerationJob(
        event_name=job_in.event_name,
        issuer_name=job_in.issuer_name,
        issue_date=job_in.issue_date,
        expiry_date=job_in.expiry_date,
        status=JobStatus.PENDING,
        total_count=len(job_in.recipients),
        processed_count=0,
        successful_count=0,
        failed_count=0,
    )
    db.add(job)
    db.flush()  # Populates job.id

    for r in job_in.recipients:
        cert = Certificate(
            job_id=job.id,
            recipient_name=r.name,
            recipient_email=r.email,
            organization=r.organization,
            status=CertificateStatus.PENDING
        )
        db.add(cert)

    db.commit()
    db.refresh(job)
    return job

def process_job_background(job_id: str):
    """
    Background worker task for processing recipient certificate generation.
    Isolates per-recipient errors and updates overall job progress.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found for background processing.")
            return

        # Update job to PROCESSING if PENDING
        if job.status in [JobStatus.PENDING, JobStatus.COMPLETED_WITH_ERRORS, JobStatus.FAILED]:
            job.status = JobStatus.PROCESSING
            if not job.started_at:
                job.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()

        # Fetch pending recipients
        pending_certs = db.query(Certificate).filter(
            Certificate.job_id == job_id,
            Certificate.status == CertificateStatus.PENDING
        ).all()

        job_dir = settings.CERTIFICATES_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        for cert in pending_certs:
            try:
                # Intentionally trigger failure for testing failure isolation if email contains @simulate-failure.test
                if "simulate-failure" in cert.recipient_email:
                    raise ValueError(f"Simulated generation failure for recipient {cert.recipient_email}")

                pdf_filename = f"{cert.id}.pdf"
                pdf_output_path = job_dir / pdf_filename

                # Generate ReportLab PDF
                generate_pdf_certificate(
                    output_path=pdf_output_path,
                    recipient_name=cert.recipient_name,
                    event_name=job.event_name,
                    issuer_name=job.issuer_name,
                    issue_date=job.issue_date,
                    certificate_id=cert.id,
                    organization=cert.organization,
                    expiry_date=job.expiry_date
                )

                cert.status = CertificateStatus.SUCCESS
                cert.pdf_path = str(pdf_output_path)
                cert.error_message = None
                job.successful_count += 1

            except Exception as e:
                logger.exception(f"Failed to generate certificate for {cert.recipient_email} in job {job_id}")
                cert.status = CertificateStatus.FAILED
                cert.error_message = str(e)
                cert.pdf_path = None
                job.failed_count += 1

            finally:
                job.processed_count += 1
                cert.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()

        # Final status check for job
        db.refresh(job)
        if job.processed_count >= job.total_count:
            job.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            if job.failed_count == 0:
                job.status = JobStatus.COMPLETED
            elif job.successful_count > 0:
                job.status = JobStatus.COMPLETED_WITH_ERRORS
                job.error_summary = f"{job.failed_count} out of {job.total_count} recipient certificates failed."
            else:
                job.status = JobStatus.FAILED
                job.error_summary = "All recipient certificates failed to generate."
            db.commit()

    except Exception as exc:
        logger.exception(f"Fatal error encountered while processing job {job_id}")
        if 'job' in locals() and job:
            job.status = JobStatus.FAILED
            job.error_summary = f"Fatal system error: {str(exc)}"
            db.commit()
    finally:
        db.close()

def retry_failed_recipients_service(db: Session, job: GenerationJob) -> int:
    """
    Resets status for failed recipients in a job so they can be re-processed.
    Returns the count of re-queued recipients.
    """
    if job.status == JobStatus.PROCESSING:
        raise ValueError("Cannot retry job while it is currently processing.")

    failed_certs = db.query(Certificate).filter(
        Certificate.job_id == job.id,
        Certificate.status == CertificateStatus.FAILED
    ).all()

    if not failed_certs:
        return 0

    count = len(failed_certs)
    for cert in failed_certs:
        cert.status = CertificateStatus.PENDING
        cert.error_message = None
        cert.pdf_path = None

    job.failed_count = max(0, job.failed_count - count)
    job.processed_count = max(0, job.processed_count - count)
    job.status = JobStatus.PROCESSING
    job.completed_at = None
    job.error_summary = None

    db.commit()
    db.refresh(job)
    return count

def create_job_zip(db: Session, job_id: str) -> Path:
    """
    Creates a ZIP file containing all successfully generated certificates for a job,
    along with a manifest.json.
    """
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ValueError("Job not found")

    successful_certs = db.query(Certificate).filter(
        Certificate.job_id == job_id,
        Certificate.status == CertificateStatus.SUCCESS
    ).all()

    if not successful_certs:
        raise ValueError("No successful certificates available for download in this job")

    zip_filename = f"certiflow_job_{job_id[:8]}_certificates.zip"
    zip_path = settings.ZIPS_DIR / zip_filename

    manifest_data = {
        "job_id": job.id,
        "event_name": job.event_name,
        "issuer_name": job.issuer_name,
        "issue_date": str(job.issue_date),
        "total_successful": len(successful_certs),
        "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "certificates": []
    }

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for cert in successful_certs:
            if cert.pdf_path and os.path.exists(cert.pdf_path):
                # Safe filename in ZIP
                safe_name = "".join(c for c in cert.recipient_name if c.isalnum() or c in (' ', '_', '-')).strip()
                filename_in_zip = f"{safe_name}_{cert.id[:8]}.pdf"
                zipf.write(cert.pdf_path, arcname=filename_in_zip)
                
                manifest_data["certificates"].append({
                    "certificate_id": cert.id,
                    "recipient_name": cert.recipient_name,
                    "recipient_email": cert.recipient_email,
                    "organization": cert.organization,
                    "filename": filename_in_zip
                })

        # Add manifest.json inside ZIP archive
        zipf.writestr("manifest.json", json.dumps(manifest_data, indent=2))

    return zip_path
