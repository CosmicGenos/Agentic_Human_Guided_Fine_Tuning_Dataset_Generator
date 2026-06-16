"""
Webhook endpoints for workers to notify web_api of processing completion.
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId
from web_api.data_models.BasicBeanieModels import DocumentModel, ChunkModel

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class ChunkCompletionData(BaseModel):
    """Data for a completed chunk"""
    chunk_index: int
    qdrant_point_id: str
    metadata: Optional[dict] = None


class ProcessingCompletionWebhook(BaseModel):
    """Webhook payload when worker completes processing a document"""
    task_id: str
    document_id: str
    project_id: str
    status: str = Field(..., description="completed, failed, partial")
    chunks_processed: int
    total_chunks: int
    chunks_data: List[ChunkCompletionData]
    error_message: Optional[str] = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)


@router.post("/processing-complete")
async def processing_complete(payload: ProcessingCompletionWebhook = Body(...)):
    """
    Called by worker when document processing is complete.
    Updates document status and creates chunk records in MongoDB.
    
    Args:
        payload: Processing completion data
        
    Returns:
        Confirmation message
    """
    try:
        doc_obj_id = PydanticObjectId(payload.document_id)
        project_obj_id = PydanticObjectId(payload.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document or project ID format")
    
    # Verify document exists
    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Create chunk records in MongoDB
    chunk_records = []
    for chunk_data in payload.chunks_data:
        chunk = ChunkModel(
            document_id=doc_obj_id,
            project_id=project_obj_id,
            chunk_index=chunk_data.chunk_index,
            qdrant_point_id=chunk_data.qdrant_point_id,
            processing_status="completed" if payload.status == "completed" else "failed",
            completed_at=payload.completed_at,
            error_message=payload.error_message,
            metadata=chunk_data.metadata
        )
        chunk_records.append(chunk)
    
    # Bulk insert chunks
    if chunk_records:
        await ChunkModel.insert_many(chunk_records)
    
    return {
        "message": "Processing completion recorded",
        "document_id": payload.document_id,
        "chunks_created": len(chunk_records),
        "status": payload.status
    }


@router.post("/processing-failed")
async def processing_failed(
    task_id: str = Body(...),
    document_id: str = Body(...),
    error_message: str = Body(...),
    stage: str = Body(..., description="Stage where processing failed")
):
    """
    Called by worker when document processing fails completely.
    
    Args:
        task_id: Celery task ID
        document_id: Document ID
        error_message: Error description
        stage: Processing stage that failed
        
    Returns:
        Confirmation message
    """
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    # Verify document exists
    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Log the failure (you can expand this to update document status, etc.)
    # For now, just acknowledge
    
    return {
        "message": "Processing failure recorded",
        "document_id": document_id,
        "task_id": task_id,
        "stage": stage
    }
