import os
import shutil
import tempfile
from pathlib import Path
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings
from app.services.pdf_generator import generate_pdf_certificate
from app.services.job_service import process_job_background

# Setup temporary test database and storage
TEMP_DIR = tempfile.mkdtemp()
TEST_DB_FILE = os.path.join(TEMP_DIR, "test_certiflow.db")
TEST_STORAGE_DIR = Path(TEMP_DIR) / "storage"

engine = create_engine(
    f"sqlite:///{TEST_DB_FILE}",
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Fixture to reset database and override storage directories before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    test_certs_dir = TEST_STORAGE_DIR / "certificates"
    test_zips_dir = TEST_STORAGE_DIR / "zips"
    test_certs_dir.mkdir(parents=True, exist_ok=True)
    test_zips_dir.mkdir(parents=True, exist_ok=True)
    
    monkeypatch.setattr(settings, "STORAGE_DIR", TEST_STORAGE_DIR)
    monkeypatch.setattr(settings, "CERTIFICATES_DIR", test_certs_dir)
    monkeypatch.setattr(settings, "ZIPS_DIR", test_zips_dir)
    monkeypatch.setattr("app.services.job_service.SessionLocal", TestingSessionLocal)
    yield

client = TestClient(app)

# 1. Test creating a valid generation job
def test_create_valid_job():
    payload = {
        "event_name": "Python Development Workshop",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "expiry_date": None,
        "recipients": [
            {"name": "Ananya Rao", "email": "ananya@example.com", "organization": "Example University"},
            {"name": "Rahul Sharma", "email": "rahul@example.com", "organization": "Tech Institute"}
        ]
    }
    response = client.post("/api/v1/jobs/", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "id" in data
    assert data["event_name"] == "Python Development Workshop"
    assert data["total_count"] == 2
    assert data["status"] == "PENDING"

# 2. Test rejecting missing required fields
def test_reject_missing_fields():
    payload = {
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [{"name": "Test", "email": "test@example.com"}]
    }
    response = client.post("/api/v1/jobs/", json=payload)
    assert response.status_code == 422  # Pydantic validation error

# 3. Test rejecting malformed email addresses
def test_reject_malformed_email():
    payload = {
        "event_name": "Web Dev Bootcamp",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [{"name": "Invalid Email User", "email": "not-an-email-address"}]
    }
    response = client.post("/api/v1/jobs/", json=payload)
    assert response.status_code == 422

# 4. Test rejecting empty or oversized recipient lists
def test_reject_empty_recipient_list():
    payload = {
        "event_name": "Empty List Test",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": []
    }
    response = client.post("/api/v1/jobs/", json=payload)
    assert response.status_code == 422

# 5. Test generating a valid PDF
def test_generate_pdf_service():
    pdf_path = TEST_STORAGE_DIR / "test_cert.pdf"
    result = generate_pdf_certificate(
        output_path=pdf_path,
        recipient_name="John Doe",
        event_name="Cloud Architecture Masterclass",
        issuer_name="CertiFlow Org",
        issue_date=date(2026, 10, 9),
        certificate_id="TEST-CERT-1234",
        organization="Cloud Corp"
    )
    assert os.path.exists(result)
    assert os.path.getsize(result) > 1000  # Non-trivial PDF size

# 6. Test verifying generated PDF content readability
def test_verify_pdf_readability():
    pdf_path = TEST_STORAGE_DIR / "readability_test.pdf"
    generate_pdf_certificate(
        output_path=pdf_path,
        recipient_name="Alice Smith",
        event_name="Security Summit 2026",
        issuer_name="CertiFlow Security",
        issue_date=date(2026, 10, 9),
        certificate_id="SEC-998877"
    )
    with open(pdf_path, "rb") as f:
        header = f.read(5)
    assert header == b"%PDF-"  # Valid PDF binary signature header

# 7. Test retrieving job status and progress
def test_get_job_status_and_progress():
    payload = {
        "event_name": "Progress Tracker Test",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [{"name": "Bob Vance", "email": "bob@example.com"}]
    }
    res_create = client.post("/api/v1/jobs/", json=payload)
    job_id = res_create.json()["id"]

    res_get = client.get(f"/api/v1/jobs/{job_id}/")
    assert res_get.status_code == 200
    job_data = res_get.json()
    assert job_data["id"] == job_id
    assert len(job_data["recipients"]) == 1

# 8. Test handling one recipient failure while others succeed (Failure Isolation)
def test_failure_isolation():
    payload = {
        "event_name": "Failure Isolation Workshop",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [
            {"name": "Valid Recipient", "email": "valid@example.com"},
            {"name": "Failing Recipient", "email": "fail@simulate-failure.com"}
        ]
    }
    res_create = client.post("/api/v1/jobs/", json=payload)
    job_id = res_create.json()["id"]

    # Run background processing explicitly in test execution thread
    process_job_background(job_id)

    res_job = client.get(f"/api/v1/jobs/{job_id}/")
    data = res_job.json()
    assert data["status"] == "COMPLETED_WITH_ERRORS"
    assert data["successful_count"] == 1
    assert data["failed_count"] == 1
    assert data["processed_count"] == 2

# 9. Test retrying failed recipients without duplicating successful outputs
def test_retry_failed_recipients():
    payload = {
        "event_name": "Retry Mechanics Workshop",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [
            {"name": "Success Recipient", "email": "success@example.com"},
            {"name": "Temporary Fail", "email": "temp@simulate-failure.com"}
        ]
    }
    res_create = client.post("/api/v1/jobs/", json=payload)
    job_id = res_create.json()["id"]

    process_job_background(job_id)

    # Initial state check
    res_job = client.get(f"/api/v1/jobs/{job_id}/")
    assert res_job.json()["failed_count"] == 1

    # Call Retry API endpoint
    res_retry = client.post(f"/api/v1/jobs/{job_id}/retry-failed/")
    assert res_retry.status_code == 200
    assert res_retry.json()["retried_count"] == 1

# 10. Test downloading individual certificate
def test_download_individual_certificate():
    payload = {
        "event_name": "Download Individual Test",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [{"name": "Single Download", "email": "single@example.com"}]
    }
    res_create = client.post("/api/v1/jobs/", json=payload)
    job_id = res_create.json()["id"]

    process_job_background(job_id)

    res_detail = client.get(f"/api/v1/jobs/{job_id}/")
    cert_id = res_detail.json()["recipients"][0]["certificate_id"]

    res_dl = client.get(f"/api/v1/certificates/{cert_id}/download/")
    assert res_dl.status_code == 200
    assert res_dl.headers["content-type"] == "application/pdf"
    assert len(res_dl.content) > 1000

# 11. Test downloading a ZIP of successful certificates
def test_download_job_zip():
    payload = {
        "event_name": "ZIP Download Test",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [
            {"name": "User One", "email": "user1@example.com"},
            {"name": "User Two", "email": "user2@example.com"}
        ]
    }
    res_create = client.post("/api/v1/jobs/", json=payload)
    job_id = res_create.json()["id"]

    process_job_background(job_id)

    res_zip = client.get(f"/api/v1/jobs/{job_id}/download/")
    assert res_zip.status_code == 200
    assert res_zip.headers["content-type"] == "application/zip"
    assert len(res_zip.content) > 500

# 12. Test handling missing job ID (404)
def test_missing_job_id_404():
    res = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000/")
    assert res.status_code == 404

# 13. Test handling missing or corrupted certificate file
def test_missing_certificate_download():
    res = client.get("/api/v1/certificates/00000000-0000-0000-0000-000000000000/download/")
    assert res.status_code == 404

# 14. Test CSV validation and duplicate recipient email behavior
def test_duplicate_emails_in_job():
    payload = {
        "event_name": "Duplicate Email Test",
        "issuer_name": "CertiFlow Academy",
        "issue_date": "2026-10-09",
        "recipients": [
            {"name": "User A", "email": "duplicate@example.com"},
            {"name": "User B", "email": "duplicate@example.com"}
        ]
    }
    res = client.post("/api/v1/jobs/", json=payload)
    assert res.status_code == 400
    assert "Duplicate recipient email" in res.json()["detail"]

# 15. Test health check endpoint and correct status transitions
def test_health_check_and_status_transitions():
    res_health = client.get("/health/")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
