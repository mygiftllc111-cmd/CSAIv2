import uuid
import hashlib
import hmac
from app.config import settings


def generate_auth_token() -> str:
    """Generate a unique auth token for approved users."""
    return str(uuid.uuid4())


def generate_session_id() -> str:
    """Generate a unique session ID for admin sessions."""
    return str(uuid.uuid4())


def verify_admin_password(password: str) -> bool:
    """Verify admin password using constant-time comparison."""
    return hmac.compare_digest(password, settings.ADMIN_PASSWORD)
