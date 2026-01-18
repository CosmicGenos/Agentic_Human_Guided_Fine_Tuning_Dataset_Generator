
import base64
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pathlib import Path
from beanie import PydanticObjectId
from web_api.data_models.BeanieModels import DocumentModel

router = APIRouter(prefix="/internal", tags=["Internal APIs"])

# File size threshold: 5MB
FILE_SIZE_THRESHOLD = 5 * 1024 * 1024  # 5MB in bytes


@router.get("/files/{document_id}/base64")
async def get_file_base64(document_id: str):
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    file_size = file_path.stat().st_size

    if file_size >= FILE_SIZE_THRESHOLD:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size} bytes). Use streaming endpoint instead."
        )
    
    try:
        with open(file_path, 'rb') as f:
            file_data = f.read()
            encoded_data = base64.b64encode(file_data).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
    
    return {
        "document_id": str(document.id),
        "filename": document.true_title,
        "stored_filename": document.stored_title,
        "file_size": file_size,
        "file_type": document.file_type.value,
        "data_category": document.data_catgory.value,
        "project_id": str(document.project_id),
        "file_data": encoded_data
    }


@router.get("/files/{document_id}/stream")
async def stream_file(document_id: str):

    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    file_size = file_path.stat().st_size
    
    # Recommend base64 for small files
    if file_size < FILE_SIZE_THRESHOLD:
        raise HTTPException(
            status_code=400,
            detail=f"File is small ({file_size} bytes). Use base64 endpoint for better performance."
        )
    
    def file_iterator():
        with open(file_path, 'rb') as f:
            chunk_size = 8192  # 8KB chunks
            while chunk := f.read(chunk_size):
                yield chunk
    
    media_type = "application/pdf" if document.file_type.value == "PDF" else "image/*"
    
    return StreamingResponse(
        file_iterator(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{document.true_title}"',
            "X-Document-ID": str(document.id),
            "X-File-Size": str(file_size)
        }
    )


@router.get("/files/{document_id}/metadata")
async def get_file_metadata(document_id: str):

    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    file_size = file_path.stat().st_size
    
    return {
        "document_id": str(document.id),
        "filename": document.true_title,
        "stored_filename": document.stored_title,
        "file_size": file_size,
        "file_type": document.file_type.value,
        "data_category": document.data_catgory.value,
        "project_id": str(document.project_id),
        "should_stream": file_size >= FILE_SIZE_THRESHOLD
    }
