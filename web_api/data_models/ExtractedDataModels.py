from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class ImageMetadataRequest(BaseModel):
    """Image metadata for storage request"""
    filename: str
    description: str
    position_in_markdown: int
    alt_text: Optional[str] = None


class StoreFictionRequest(BaseModel):
    """Request model for storing extracted fiction text"""
    document_id: str
    project_id: str
    extracted_text: str
    extraction_metadata: Dict[str, Any]


class StoreAcademicRequest(BaseModel):
    """Request model for storing extracted academic content"""
    document_id: str
    project_id: str
    markdown_text: str
    enriched_markdown: str
    images: List[ImageMetadataRequest]
    extraction_metadata: Dict[str, Any]


class ImageMetadataResponse(BaseModel):
    """Image metadata in response"""
    filename: str
    file_path: str
    description: str
    position_in_markdown: int
    alt_text: Optional[str] = None


class ExtractedFictionResponse(BaseModel):
    """Response model for extracted fiction"""
    id: str
    document_id: str
    project_id: str
    character_count: int
    extraction_metadata: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtractedAcademicResponse(BaseModel):
    """Response model for extracted academic content"""
    id: str
    document_id: str
    project_id: str
    character_count: int
    image_count: int
    images: List[ImageMetadataResponse]
    extraction_metadata: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtractedFictionDetailResponse(ExtractedFictionResponse):
    """Detailed response including full text"""
    extracted_text: str


class ExtractedAcademicDetailResponse(ExtractedAcademicResponse):
    """Detailed response including full markdown"""
    markdown_text: str
    enriched_markdown: str
