from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field, select
from passlib.context import CryptContext
from app.database import get_session
from app.models.user import User, UserCreate, UserPublic
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ProfileUpdate(SQLModel):
    full_name: str = Field(description="New display name for the user")


class PasswordChange(SQLModel):
    current_password: str = Field(description="The user's existing password for verification")
    new_password: str = Field(description="The new password to set")


@router.patch(
    "/me",
    response_model=UserPublic,
    summary="Update own profile",
    description="Update the display name for the currently authenticated user.",
    response_description="Updated public profile of the current user",
    responses={
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
async def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    current_user.full_name = payload.full_name.strip()
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.patch(
    "/me/password",
    status_code=204,
    summary="Change own password",
    description=(
        "Change the password for the currently authenticated user. "
        "The current password must be provided for verification."
    ),
    response_description="No content — password updated successfully",
    responses={
        400: {"description": "Current password is incorrect"},
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
async def change_my_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not pwd_context.verify(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = pwd_context.hash(payload.new_password)
    await session.commit()


@router.post(
    "/",
    response_model=UserPublic,
    status_code=201,
    summary="Create user",
    description="Register a new user account. The email address must be unique across all accounts.",
    response_description="Public profile of the newly created user",
    responses={
        409: {"description": "Email address is already registered"},
    },
)
async def create_user(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=pwd_context.hash(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.get(
    "/",
    response_model=list[UserPublic],
    summary="List users",
    description="Return all registered user accounts.",
    response_description="Array of user public profiles",
)
async def list_users(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User))
    return result.scalars().all()


@router.get(
    "/{user_id}",
    response_model=UserPublic,
    summary="Get user",
    description="Retrieve a single user's public profile by their UUID.",
    response_description="User's public profile",
    responses={
        404: {"description": "User not found"},
    },
)
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch(
    "/{user_id}",
    response_model=UserPublic,
    summary="Update user",
    description="Update a user's `full_name` or `is_active` status. Both fields are optional query parameters.",
    response_description="Updated user public profile",
    responses={
        404: {"description": "User not found"},
    },
)
async def update_user(
    user_id: UUID,
    full_name: str | None = None,
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if full_name is not None:
        user.full_name = full_name
    if is_active is not None:
        user.is_active = is_active
    await session.commit()
    await session.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    status_code=204,
    summary="Delete user",
    description="Permanently delete a user account by UUID.",
    response_description="No content",
    responses={
        404: {"description": "User not found"},
    },
)
async def delete_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await session.delete(user)
    await session.commit()
