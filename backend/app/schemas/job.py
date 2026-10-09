from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.job import JobStatus
from app.models.certificate import CertificateStatus

class RecipientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Recipient full name")
    email: EmailStr = Field(..., description="Valid recipient email address")
    organization: Optional[str] = Field(None, max_length=255, description="Optional recipient organization/university")

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Recipient name cannot be blank")
        return s

    @field_validator("email")
    @classmethod
    def email_must_be_lowercase(cls, v: EmailStr) -> str:
        return str(v).lower().strip()

class JobCreate(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=255, description="Event or course name")
    issuer_name: str = Field(..., min_length=1, max_length=255, description="Issuer or organization name")
    issue_date: date = Field(..., description="Certificate issue date")
    expiry_date: Optional[date] = Field(None, description="Optional certificate expiration date")
    recipients: List[RecipientCreate] = Field(..., min_length=1, description="List of recipient records")

    @field_validator("event_name", "issuer_name")
    @classmethod
    def text_must_not_be_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be blank")
        return s

    @field_validator("expiry_date")
    @classmethod
    def expiry_must_be_after_issue(cls, v: Optional[date], info) -> Optional[date]:
        if v and "issue_date" in info.data and info.data["issue_date"]:
            if v < info.data["issue_date"]:
                raise ValueError("Expiry date cannot be prior to issue date")
        return v

class RecipientResultResponse(BaseModel):
    id: str
    recipient_name: str
    recipient_email: str
    organization: Optional[str] = None
    status: CertificateStatus
    certificate_id: Optional[str] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}

class JobResponse(BaseModel):
    id: str
    event_name: str
    issuer_name: str
    issue_date: date
    expiry_date: Optional[date] = None
    status: JobStatus
    total_count: int
    processed_count: int
    successful_count: int
    failed_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_summary: Optional[str] = None

    model_config = {"from_attributes": True}

class JobDetailResponse(JobResponse):
    recipients: List[RecipientResultResponse] = []

class JobListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    jobs: List[JobResponse]

class RetryResponse(BaseModel):
    job_id: str
    status: JobStatus
    retried_count: int
    message: str
