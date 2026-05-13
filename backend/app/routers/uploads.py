from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.event import Event
from app.models.event_layout import EventLayout
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.storage import delete_file, upload_file

router = APIRouter(prefix="/uploads", tags=["uploads"])

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
_MAX_BYTES = 5 * 1024 * 1024


@router.post(
    "/events/{event_id}/cover",
    summary="Upload event cover image",
    description=(
        "Upload a cover image for an event's landing page. "
        "The image is stored in MinIO object storage at `events/{event_id}/cover.{ext}` "
        "and the public URL is saved to the event's layout record. "
        "If a previous cover of a different format exists it is deleted. "
        "Accepted formats: JPEG, PNG, WebP, GIF. Maximum file size: 5 MB. "
        "Only the event owner or an admin may upload."
    ),
    response_description="Object containing `url` — the public URL of the uploaded cover image",
    responses={
        400: {"description": "Unsupported image type or file exceeds 5 MB"},
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
async def upload_event_cover(
    event_id: UUID,
    file: UploadFile = File(..., description="Image file to upload (JPEG, PNG, WebP, or GIF, max 5 MB)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use JPEG, PNG, WebP, or GIF.")

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    ext = _EXT[file.content_type]
    object_name = f"events/{event_id}/cover.{ext}"

    layout = (
        await session.execute(select(EventLayout).where(EventLayout.event_id == event_id))
    ).scalars().first()

    if layout is None:
        layout = EventLayout(event_id=event_id, layout_name="Default")
        session.add(layout)
    elif layout.cover_image_url:
        old_ext = layout.cover_image_url.rsplit(".", 1)[-1]
        if old_ext != ext:
            delete_file(f"events/{event_id}/cover.{old_ext}")

    url = upload_file(data, object_name, file.content_type)
    layout.cover_image_url = url
    await session.commit()

    return {"url": url}
