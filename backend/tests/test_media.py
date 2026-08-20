import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas.media import MediaAsset, SignUploadRequest
from app.services.cloudinary_service import CloudinaryService


def test_upload_purpose_validation() -> None:
    with pytest.raises(ValueError):
        SignUploadRequest(purpose="avatar")


def test_signature_response_does_not_include_secret() -> None:
    service = CloudinaryService(
        Settings(
            cloudinary_cloud_name="demo-cloud",
            cloudinary_api_key="api-key",
            cloudinary_api_secret="secret-key",
        )
    )
    signed = service.sign_upload(SignUploadRequest(purpose="opportunity_pitch").purpose)
    data = signed.model_dump()

    assert data["cloud_name"] == "demo-cloud"
    assert data["api_key"] == "api-key"
    assert data["resource_type"] == "video"
    assert data["folder"] == "reelhire/opportunities"
    assert "secret" not in data


def test_media_asset_rejects_non_video() -> None:
    with pytest.raises(ValueError):
        MediaAsset(
            public_id="reelhire/image",
            secure_url="https://res.cloudinary.com/demo/image/upload/example.jpg",
            resource_type="image",
            format="jpg",
            bytes=1024,
        )


def test_media_asset_rejects_large_file() -> None:
    with pytest.raises(ValueError):
        MediaAsset(
            public_id="reelhire/large",
            secure_url="https://res.cloudinary.com/demo/video/upload/example.mp4",
            resource_type="video",
            format="mp4",
            bytes=101 * 1024 * 1024,
        )


def test_delete_video_uses_video_resource_type(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []

    def destroy(public_id: str, **kwargs):
        calls.append((public_id, kwargs))
        return {"result": "ok"}

    monkeypatch.setattr("cloudinary.uploader.destroy", destroy)
    service = CloudinaryService(
        Settings(
            cloudinary_cloud_name="demo-cloud",
            cloudinary_api_key="api-key",
            cloudinary_api_secret="secret-key",
        )
    )

    service.delete_video("reelhire/opportunities/video")

    assert calls == [("reelhire/opportunities/video", {"resource_type": "video", "invalidate": True})]


def test_delete_video_allows_already_missing_asset(monkeypatch: pytest.MonkeyPatch) -> None:
    def destroy(public_id: str, **kwargs):
        return {"result": "not found"}

    monkeypatch.setattr("cloudinary.uploader.destroy", destroy)
    service = CloudinaryService(
        Settings(
            cloudinary_cloud_name="demo-cloud",
            cloudinary_api_key="api-key",
            cloudinary_api_secret="secret-key",
        )
    )

    service.delete_video("reelhire/opportunities/missing")


def test_delete_video_failure_returns_controlled_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def destroy(public_id: str, **kwargs):
        return {"result": "error"}

    monkeypatch.setattr("cloudinary.uploader.destroy", destroy)
    service = CloudinaryService(
        Settings(
            cloudinary_cloud_name="demo-cloud",
            cloudinary_api_key="api-key",
            cloudinary_api_secret="secret-key",
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        service.delete_video("reelhire/opportunities/error")

    assert exc_info.value.status_code == 502
