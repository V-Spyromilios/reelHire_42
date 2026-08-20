from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.media import SignUploadRequest, SignedUploadResponse
from app.services.cloudinary_service import CloudinaryService

router = APIRouter(prefix="/api/media", tags=["media"])


@router.post("/sign-upload", response_model=SignedUploadResponse)
async def sign_upload(payload: SignUploadRequest, settings: Settings = Depends(get_settings)) -> SignedUploadResponse:
    return CloudinaryService(settings).sign_upload(payload.purpose)
