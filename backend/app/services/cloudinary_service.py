import time
import uuid

import cloudinary
import cloudinary.exceptions
import cloudinary.utils
import cloudinary.uploader
from fastapi import HTTPException, status

from app.core.config import Settings
from app.schemas.media import SignedUploadResponse, UploadPurpose


class CloudinaryService:
    def __init__(self, settings: Settings):
        self.settings = settings
        if self.is_configured:
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True,
            )

    @property
    def is_configured(self) -> bool:
        return all(
            [
                self.settings.cloudinary_cloud_name,
                self.settings.cloudinary_api_key,
                self.settings.cloudinary_api_secret,
            ],
        )

    def sign_upload(self, purpose: UploadPurpose) -> SignedUploadResponse:
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloudinary is not configured.",
            )

        folder = "reelhire/opportunities" if purpose == UploadPurpose.opportunity_pitch else "reelhire/submissions"
        public_id = uuid.uuid4().hex
        timestamp = int(time.time())
        params = {
            "timestamp": timestamp,
            "folder": folder,
            "public_id": public_id,
        }
        signature = cloudinary.utils.api_sign_request(params, self.settings.cloudinary_api_secret)

        return SignedUploadResponse(
            cloud_name=self.settings.cloudinary_cloud_name,
            api_key=self.settings.cloudinary_api_key,
            timestamp=timestamp,
            signature=signature,
            folder=folder,
            public_id=public_id,
        )

    def delete_video(self, public_id: str) -> None:
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloudinary is not configured.",
            )

        try:
            result = cloudinary.uploader.destroy(public_id, resource_type="video", invalidate=True)
        except cloudinary.exceptions.NotFound:
            return
        except cloudinary.exceptions.Error as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The opportunity could not be deleted because its video could not be removed. Please try again.",
            ) from exc

        if result.get("result") in {"ok", "not found"}:
            return

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The opportunity could not be deleted because its video could not be removed. Please try again.",
        )
