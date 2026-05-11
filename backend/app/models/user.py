import enum
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CREATOR = "creator"


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: str
    role: UserRole = UserRole.CREATOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserPublic(UserBase):
    id: UUID


class User(UserBase, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hashed_password: str
