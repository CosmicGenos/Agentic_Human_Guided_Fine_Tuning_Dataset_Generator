from beanie import Document, PydanticObjectId
from pydantic import Field, EmailStr
from datetime import datetime
from pymongo import IndexModel, ASCENDING
from web_api.data_models.enums import AppRole, ProjectRole


class UserModel(Document):
    email: EmailStr
    hashed_password: str
    app_role: AppRole = AppRole.USER
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
        ]


class ProjectMemberModel(Document):
    project_id: PydanticObjectId
    user_id: PydanticObjectId
    project_role: ProjectRole
    added_by: PydanticObjectId
    added_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "project_members"
        indexes = [
            # A user can hold only one role per project; also serves member lookups
            IndexModel([("project_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
        ]
