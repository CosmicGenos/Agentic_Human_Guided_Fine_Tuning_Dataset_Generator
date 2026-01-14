from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from src.services.FileHandlerService import FileHandlerService
from src.data_models.BeanieModels import DocumentModel
from src.data_models.enums import Datatype

router = APIRouter(prefix="/files", tags=["File Management"])
file_service = FileHandlerService()

@router.post("/upload", response_model=DocumentModel)
async def upload_file(
    project_id: str = Query(..., description="Project ID to associate the file with"),
    Type: Datatype = Query(..., description="Data category"),
    file: UploadFile = File(...)
):
    """Upload a single file to a project"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    document = await file_service.save_file(project_id, Type, file)
    return document

@router.post("/upload-multiple", response_model=list[DocumentModel])
async def upload_multiple_files(
    project_id: str = Query(..., description="Project ID to associate the files with"),
    Type: Datatype = Query(..., description="Data category"),
    files: list[UploadFile] = File(...)
):
    """Upload multiple files to a project"""
    documents = await file_service.save_multiple_files(project_id, Type, files)
    return documents

@router.get("/{document_id}", response_model=DocumentModel)
async def get_document(document_id: str):
    """Get a specific document by ID"""
    return await file_service.get_document_by_id(document_id)

@router.get("/", response_model=list[DocumentModel])
async def list_documents():
    """List all documents"""
    return await file_service.list_all_documents()

@router.get("/project/{project_id}", response_model=list[DocumentModel])
async def get_project_documents(project_id: str):
    """Get all documents for a specific project"""
    return await file_service.get_documents_by_project(project_id)

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a specific document"""
    return await file_service.delete_document(document_id)