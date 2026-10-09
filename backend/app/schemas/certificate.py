from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel
from app.models.certificate import CertificateStatus

class CertificateResponse(BaseModel):
    id: str
    job_id: str
    recipient_name: str
    recipient_email: str
    organization: Optional[str] = None
    status: CertificateStatus
    event_name: Optional[str] = None
    issuer_name: Optional[str] = None
    issue_date: Optional[date] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class CertificateListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    certificates: List[CertificateResponse]
