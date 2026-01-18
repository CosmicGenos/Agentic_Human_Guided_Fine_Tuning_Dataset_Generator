from pydantic import BaseModel
from .enums import Datatype
from typing import List

class CreateProjectRequest(BaseModel):
    project_title: str
    project_description: str
    main_data_type: Datatype

class UpdateProjectRequest(BaseModel):
    project_title: str | None = None
    project_description: str | None = None
    main_data_type: Datatype | None = None


class ProcessDocumentsRequest(BaseModel):
    project_id: str
    document_ids: List[str]  