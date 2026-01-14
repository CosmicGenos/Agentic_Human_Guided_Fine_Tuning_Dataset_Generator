from beanie import Document
from src.data_models.enums import FileType, Datatype
from pydantic import Field
from beanie import PydanticObjectId

class DocumentModel(Document):
    true_title: str
    stored_title: str
    file_type: FileType
    file_path: str
    data_catgory: Datatype
    project_id: PydanticObjectId

    class Settings:
        name = "documents"

class ProjectModel(Document):
    project_title: str
    project_description: str
    main_data_type: Datatype 

    class Settings:
        name = "Project"
