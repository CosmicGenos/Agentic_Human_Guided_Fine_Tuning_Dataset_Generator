from beanie import Document
from web_api.data_models.enums import FileType, Datatype
from pydantic import Field
from beanie import PydanticObjectId
from datetime import datetime
from typing import Optional, Dict, Any

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

class ChunkModel(Document):
    """
    Stores metadata about processed chunks.
    Actual chunk vectors and text stored in Qdrant.
    """
    document_id: PydanticObjectId
    project_id: PydanticObjectId
    chunk_index: int
    qdrant_point_id: str  # Reference to Qdrant point
    processing_status: str = "pending"  # pending, processing, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # Chapter, page range, etc.

    class Settings:
        name = "chunks"
