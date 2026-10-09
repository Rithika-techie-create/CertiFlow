import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.db.session import Base

class CertificateStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("generation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    recipient_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False, index=True)
    organization = Column(String(255), nullable=True)
    
    status = Column(SQLEnum(CertificateStatus), default=CertificateStatus.PENDING, nullable=False, index=True)
    pdf_path = Column(String(512), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    job = relationship("GenerationJob", back_populates="certificates")
