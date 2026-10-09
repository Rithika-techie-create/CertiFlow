import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.session import get_db
from app.core.config import settings
from app.models.job import GenerationJob
from app.models.certificate import Certificate, CertificateStatus
from app.schemas.certificate import CertificateResponse, CertificateListResponse

router = APIRouter(prefix="/certificates", tags=["Certificates"])

@router.get("/", response_model=CertificateListResponse)
def list_certificates(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[CertificateStatus] = Query(None),
    search: Optional[str] = Query(None, description="Search by recipient name, email, or org"),
    event_name: Optional[str] = Query(None, description="Filter by event name"),
    db: Session = Depends(get_db)
):
    """
    Search and filter generated certificates across all jobs.
    """
    query = db.query(Certificate, GenerationJob).join(GenerationJob, Certificate.job_id == GenerationJob.id)

    if status:
        query = query.filter(Certificate.status == status)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Certificate.recipient_name.ilike(search_fmt),
                Certificate.recipient_email.ilike(search_fmt),
                Certificate.organization.ilike(search_fmt)
            )
        )

    if event_name:
        query = query.filter(GenerationJob.event_name.ilike(f"%{event_name.strip()}%"))

    total = query.count()
    items = query.order_by(desc(Certificate.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    response_items = []
    for cert, job in items:
        cert_data = CertificateResponse(
            id=cert.id,
            job_id=cert.job_id,
            recipient_name=cert.recipient_name,
            recipient_email=cert.recipient_email,
            organization=cert.organization,
            status=cert.status,
            event_name=job.event_name,
            issuer_name=job.issuer_name,
            issue_date=job.issue_date,
            error_message=cert.error_message,
            created_at=cert.created_at,
            updated_at=cert.updated_at
        )
        response_items.append(cert_data)

    return CertificateListResponse(
        total=total,
        page=page,
        page_size=page_size,
        certificates=response_items
    )

@router.get("/{certificate_id}/download/")
def download_individual_certificate(
    certificate_id: str,
    inline: bool = Query(False, description="Open inline in browser preview"),
    db: Session = Depends(get_db)
):
    """
    Download or stream individual generated PDF certificate.
    """
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate with ID '{certificate_id}' not found"
        )

    if cert.status != CertificateStatus.SUCCESS or not cert.pdf_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate PDF has not been successfully generated"
        )

    file_path = Path(cert.pdf_path).resolve()
    storage_root = settings.STORAGE_DIR.resolve()

    # Security path traversal check
    try:
        file_path.relative_to(storage_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: File path outside storage root"
        )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate file does not exist on disk"
        )

    safe_name = "".join(c for c in cert.recipient_name if c.isalnum() or c in (' ', '_', '-')).strip()
    filename = f"Certificate_{safe_name}_{cert.id[:8]}.pdf"
    disposition = "inline" if inline else f'attachment; filename="{filename}"'

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={"Content-Disposition": disposition}
    )
