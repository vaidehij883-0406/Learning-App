import os
import mimetypes
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.core.config import settings
from app.core.storage import storage
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads and Storage"])


class PresignedUrlRequest(BaseModel):
    filename: str
    file_type: str
    bucket: str = "media"  # 'videos', 'notes', 'thumbnails', 'media'


@router.post("/presigned-url")
def request_presigned_upload(
    payload: PresignedUrlRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generates presigned upload URL or storage destination parameters so clients
    can upload videos, PDFs, and thumbnails directly to storage without passing
    large files through the FastAPI server unnecessarily.
    """
    allowed_buckets = ["videos", "notes", "thumbnails", "media"]
    bucket = payload.bucket if payload.bucket in allowed_buckets else "media"

    res = storage.generate_upload_url(
        filename=payload.filename,
        file_type=payload.file_type,
        bucket=bucket
    )
    return res


@router.post("/direct")
async def direct_upload(
    bucket: str = "media",
    filename: Optional[str] = None,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Direct upload endpoint for development or environments where clients
    post directly to the backend storage endpoint.
    """
    target_name = filename or file.filename
    content = await file.read()
    
    # Save using storage provider
    saved_url = storage.save_file(content=content, filename=target_name, bucket=bucket)
    return {
        "status": "success",
        "file_url": saved_url,
        "filename": target_name,
        "size_bytes": len(content)
    }


@router.get("/files/{bucket}/{filename}")
def serve_file(
    bucket: str,
    filename: str
):
    """
    Serves stored files locally with proper Content-Type, headers, and video streaming support.
    """
    # Prevent directory traversal
    clean_filename = os.path.basename(filename)
    clean_bucket = os.path.basename(bucket)

    file_path = os.path.join(settings.UPLOAD_DIR, clean_bucket, clean_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    media_type, _ = mimetypes.guess_type(file_path)
    if not media_type:
        media_type = "application/octet-stream"

    return FileResponse(path=file_path, media_type=media_type, filename=clean_filename)
