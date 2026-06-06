from beanie import Document
from pydantic import BaseModel, Field
from beanie import PydanticObjectId
from datetime import datetime
from typing import Optional, Dict, Any, List


class ExtractedImageMetadata(BaseModel):
    """Metadata for a single extracted image from academic PDF"""
    filename: str
    minio_key: str  # MinIO object key: academic-images/{document_id}/{filename}
    description: str  # AI-generated description from vision service
    position_in_markdown: int  # Character position in original markdown
    alt_text: Optional[str] = None


class ExtractedFictionModel(Document):
    """
    Stores extracted text from fiction PDFs.
    Linked to DocumentModel via document_id.
    """
    document_id: PydanticObjectId  # Reference to DocumentModel
    project_id: PydanticObjectId   # Reference to ProjectModel
    extracted_text: str            # Full raw text extracted from PDF
    character_count: int
    extraction_metadata: Dict[str, Any] = Field(default_factory=dict)  # Page count, extraction method, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "extracted_fiction"
        indexes = [
            "document_id",  # Fast lookup by document
            "project_id",   # Fast lookup by project
            [("created_at", -1)]  # Sort by creation time
        ]


class ExtractedAcademicModel(Document):
    """
    Stores extracted markdown and image metadata from academic PDFs.
    Images are stored as files in D:/Synthetic_Data_Genration/Uploaded_Files/images/{document_id}/
    """
    document_id: PydanticObjectId
    project_id: PydanticObjectId
    markdown_text: str  # Original markdown from Marker (with image references)
    enriched_markdown: str  # Markdown with images replaced by AI descriptions
    images: List[ExtractedImageMetadata] = Field(default_factory=list)
    character_count: int
    image_count: int
    extraction_metadata: Dict[str, Any] = Field(default_factory=dict)  # Marker config, conversion time, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "extracted_academic"
        indexes = [
            "document_id",
            "project_id",
            [("created_at", -1)]
        ]
