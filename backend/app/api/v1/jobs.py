from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.session import get_db
from app.core.config import settings
from app.models.job import GenerationJob, JobStatus
from app.models.certificate import Certificate, CertificateStatus
from app.schemas.job import (
    JobCreate, JobResponse, JobDetailResponse,
    RecipientResultResponse, JobListResponse, RetryResponse
)
from app.services.job_service import (
    create_job_with_recipients, process_job_background,
    retry_failed_recipients_service, create_job_zip
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    job_in: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submit a bulk certificate generation job with multiple recipients.
    Returns immediately with HTTP 202 Accepted and starts background processing.
    """
    if len(job_in.recipients) > settings.MAX_RECIPIENTS_PER_JOB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Recipient count exceeds maximum allowed limit of {settings.MAX_RECIPIENTS_PER_JOB}"
        )

    # Deduplicate recipient emails within the request body
    seen_emails = set()
    for r in job_in.recipients:
        if r.email in seen_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate recipient email '{r.email}' found in request payload"
            )
        seen_emails.add(r.email)

    # Save job and child certificate records
    job = create_job_with_recipients(db=db, job_in=job_in)

    # Queue background processing
    background_tasks.add_task(process_job_background, job.id)

    return job

@router.get("/", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[JobStatus] = Query(None, description="Filter by job status"),
    search: Optional[str] = Query(None, description="Search by event name or issuer"),
    db: Session = Depends(get_db)
):
    """
    List all generation jobs with pagination and optional search/status filters.
    """
    query = db.query(GenerationJob)

    if status:
        query = query.filter(GenerationJob.status == status)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                GenerationJob.event_name.ilike(search_fmt),
                GenerationJob.issuer_name.ilike(search_fmt)
            )
        )

    total = query.count()
    jobs = query.order_by(desc(GenerationJob.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return JobListResponse(
        total=total,
        page=page,
        page_size=page_size,
        jobs=jobs
    )

@router.get("/{job_id}/", response_model=JobDetailResponse)
def get_job_detail(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve full details for a specific generation job, including recipient statuses.
    """
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found"
        )

    certs = db.query(Certificate).filter(Certificate.job_id == job_id).all()

    recipient_results = [
        RecipientResultResponse(
            id=c.id,
            recipient_name=c.recipient_name,
            recipient_email=c.recipient_email,
            organization=c.organization,
            status=c.status,
            certificate_id=c.id if c.status == CertificateStatus.SUCCESS else None,
            error_message=c.error_message
        )
        for c in certs
    ]

    response_data = JobDetailResponse.model_validate(job)
    response_data.recipients = recipient_results
    return response_data

@router.get("/{job_id}/recipients/")
def list_job_recipients(
    job_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[CertificateStatus] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Paginated list of recipient results for a specific job with optional status filtering.
    """
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    query = db.query(Certificate).filter(Certificate.job_id == job_id)
    if status:
        query = query.filter(Certificate.status == status)

    total = query.count()
    certs = query.order_by(Certificate.recipient_name).offset((page - 1) * page_size).limit(page_size).all()

    results = [
        RecipientResultResponse(
            id=c.id,
            recipient_name=c.recipient_name,
            recipient_email=c.recipient_email,
            organization=c.organization,
            status=c.status,
            certificate_id=c.id if c.status == CertificateStatus.SUCCESS else None,
            error_message=c.error_message
        )
        for c in certs
    ]

    return {
        "job_id": job_id,
        "total": total,
        "page": page,
        "page_size": page_size,
        "recipients": results
    }

@router.post("/{job_id}/retry-failed/", response_model=RetryResponse)
def retry_failed_job_recipients(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Retry generation for failed recipients of a job without regenerating successful certificates.
    """
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        retried_count = retry_failed_recipients_service(db, job)
        if retried_count > 0:
            background_tasks.add_task(process_job_background, job.id)
            message = f"Successfully re-queued {retried_count} failed recipients for processing."
        else:
            message = "No failed recipients found to retry."

        return RetryResponse(
            job_id=job.id,
            status=job.status,
            retried_count=retried_count,
            message=message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{job_id}/download/")
def download_job_certificates_zip(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Download all successful certificates for a job as a ZIP archive.
    """
    try:
        zip_path = create_job_zip(db, job_id)
        return FileResponse(
            path=str(zip_path),
            media_type="application/zip",
            filename=zip_path.name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate ZIP archive: {str(e)}")
