import os
import uuid
import time
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from app.core.config import settings


class BaseStorageProvider(ABC):
    @abstractmethod
    def generate_upload_url(self, filename: str, file_type: str, bucket: str = "media") -> Dict[str, Any]:
        """Generate presigned upload parameters or signed upload URL."""
        pass

    @abstractmethod
    def get_public_url(self, file_path: str, bucket: str = "media") -> str:
        """Get accessible URL for a stored file."""
        pass

    @abstractmethod
    def get_signed_url(self, file_path: str, expires_in_seconds: int = 3600, bucket: str = "media") -> str:
        """Get temporary signed URL for private/protected files."""
        pass

    @abstractmethod
    def save_file(self, content: bytes, filename: str, bucket: str = "media") -> str:
        """Save raw bytes and return relative or full URL."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, upload_dir: str = settings.UPLOAD_DIR, base_url: str = settings.BASE_URL):
        self.upload_dir = upload_dir
        self.base_url = base_url
        os.makedirs(self.upload_dir, exist_ok=True)

    def _get_bucket_dir(self, bucket: str) -> str:
        b_dir = os.path.join(self.upload_dir, bucket)
        os.makedirs(b_dir, exist_ok=True)
        return b_dir

    def generate_upload_url(self, filename: str, file_type: str, bucket: str = "media") -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_endpoint = f"{self.base_url}/api/v1/uploads/direct?bucket={bucket}&filename={unique_name}"
        file_url = f"{self.base_url}/api/v1/uploads/files/{bucket}/{unique_name}"
        return {
            "upload_url": upload_endpoint,
            "method": "POST",
            "file_url": file_url,
            "key": f"{bucket}/{unique_name}",
            "expires_at": int(time.time()) + 3600
        }

    def get_public_url(self, file_path: str, bucket: str = "media") -> str:
        if file_path.startswith("http://") or file_path.startswith("https://"):
            return file_path
        clean_path = file_path.replace("\\", "/").lstrip("/")
        return f"{self.base_url}/api/v1/uploads/files/{clean_path}"

    def get_signed_url(self, file_path: str, expires_in_seconds: int = 3600, bucket: str = "media") -> str:
        # In local mode, returns direct URL with temporary token parameter
        public = self.get_public_url(file_path, bucket)
        token = uuid.uuid4().hex[:12]
        separator = "&" if "?" in public else "?"
        return f"{public}{separator}token={token}&expires={int(time.time()) + expires_in_seconds}"

    def save_file(self, content: bytes, filename: str, bucket: str = "media") -> str:
        ext = os.path.splitext(filename)[1].lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"
        bucket_dir = self._get_bucket_dir(bucket)
        dest_path = os.path.join(bucket_dir, unique_name)
        with open(dest_path, "wb") as f:
            f.write(content)
        return f"{self.base_url}/api/v1/uploads/files/{bucket}/{unique_name}"


class SupabaseStorageProvider(BaseStorageProvider):
    def __init__(self, supabase_url: str = settings.SUPABASE_URL, supabase_key: str = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY):
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.local_fallback = LocalStorageProvider()

    def generate_upload_url(self, filename: str, file_type: str, bucket: str = "media") -> Dict[str, Any]:
        if not self.supabase_url or not self.supabase_key:
            return self.local_fallback.generate_upload_url(filename, file_type, bucket)
        
        ext = os.path.splitext(filename)[1].lower()
        key = f"{uuid.uuid4().hex}{ext}"
        # Supabase S3-compatible or REST upload URL
        upload_url = f"{self.supabase_url}/storage/v1/object/{bucket}/{key}"
        file_url = f"{self.supabase_url}/storage/v1/object/public/{bucket}/{key}"
        return {
            "upload_url": upload_url,
            "method": "POST",
            "file_url": file_url,
            "key": f"{bucket}/{key}",
            "headers": {
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": file_type
            },
            "expires_at": int(time.time()) + 3600
        }

    def get_public_url(self, file_path: str, bucket: str = "media") -> str:
        if file_path.startswith("http://") or file_path.startswith("https://"):
            return file_path
        if not self.supabase_url:
            return self.local_fallback.get_public_url(file_path, bucket)
        clean_path = file_path.replace("\\", "/").lstrip("/")
        return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    def get_signed_url(self, file_path: str, expires_in_seconds: int = 3600, bucket: str = "media") -> str:
        if not self.supabase_url or not self.supabase_key:
            return self.local_fallback.get_signed_url(file_path, expires_in_seconds, bucket)
        clean_path = file_path.replace("\\", "/").lstrip("/")
        # In a full Supabase client we can call storage.from_(bucket).create_signed_url()
        return f"{self.supabase_url}/storage/v1/object/sign/{bucket}/{clean_path}?token=sign&expiresIn={expires_in_seconds}"

    def save_file(self, content: bytes, filename: str, bucket: str = "media") -> str:
        # Fall back to local storage if supabase credentials are not set
        if not self.supabase_url or not self.supabase_key:
            return self.local_fallback.save_file(content, filename, bucket)
        try:
            import httpx
            ext = os.path.splitext(filename)[1].lower()
            key = f"{uuid.uuid4().hex}{ext}"
            url = f"{self.supabase_url}/storage/v1/object/{bucket}/{key}"
            headers = {
                "Authorization": f"Bearer {self.supabase_key}",
                "apikey": self.supabase_key
            }
            resp = httpx.post(url, content=content, headers=headers, timeout=30.0)
            if resp.status_code in [200, 201]:
                return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{key}"
        except Exception:
            pass
        return self.local_fallback.save_file(content, filename, bucket)


def get_storage_provider() -> BaseStorageProvider:
    if settings.STORAGE_BACKEND == "supabase" and settings.SUPABASE_URL:
        return SupabaseStorageProvider()
    return LocalStorageProvider()


storage = get_storage_provider()
