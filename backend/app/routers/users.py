from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select
from passlib.context import CryptContext
from app.database import get_session
from app.models.user import User, UserCreate, UserPublic
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ProfileUpdate(SQLModel):
    full_name: str


class PasswordChange(SQLModel):
    current_password: str
    new_password: str


@router.patch("/me", response_model=UserPublic)
async def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    current_user.full_name = payload.full_name.strip()
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.patch("/me/password", status_code=204)
async def change_my_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not pwd_context.verify(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = pwd_context.hash(payload.new_password)
    await session.commit()


@router.post("/", response_model=UserPublic, status_code=201)
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


@router.get("/", response_model=list[UserPublic])
async def list_users(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User))
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserPublic)
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


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await session.delete(user)
    await session.commit()
