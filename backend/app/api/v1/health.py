from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter(tags=["Health"])

@router.get("/health/")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint returning application status and database connectivity.
    """
    db_connected = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        db_error = str(e)

    return {
        "status": "healthy" if db_connected else "unhealthy",
        "database_connected": db_connected,
        "database_error": db_error,
        "app_name": "CertiFlow",
        "version": "1.0.0"
    }
