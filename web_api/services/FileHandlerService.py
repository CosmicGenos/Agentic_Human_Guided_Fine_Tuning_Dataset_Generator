import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from web_api.data_models.BeanieModels import DocumentModel, ProjectModel
from web_api.data_models.enums import FileType, Datatype
from beanie import PydanticObjectId

class FileHandlerService:
    BASE_UPLOAD_DIR = "Uploaded_Files"
    
    def __init__(self):
        
        self.pdf_dir = Path(self.BASE_UPLOAD_DIR) / "pdf"
        self.images_dir = Path(self.BASE_UPLOAD_DIR) / "images"
        self._ensure_directories()
    
    def _ensure_directories(self):
        Path(self.BASE_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_file_type(self, filename: str) -> FileType:
        extension = filename.lower().split('.')[-1]
        if extension == 'pdf':
            return FileType.PDF
        elif extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp']:
            return FileType.IMAGES
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")
    
    async def _validate_project_exists(self, project_id: PydanticObjectId):
        project = await ProjectModel.get(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        return project
    
    async def save_file(self, project_id: str, Type: Datatype, file: UploadFile) -> DocumentModel:
        """
        Save uploaded file with UUID name and store metadata in MongoDB
        
        Args:
            project_id: The project ID to associate the file with
            Type: Data Category 
            file: The uploaded file
            
        Returns:
            DocumentModel: The created document record
        """
        try:
            project_obj_id = PydanticObjectId(project_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        await self._validate_project_exists(project_obj_id)
        
        original_filename = file.filename
        file_type = self._get_file_type(original_filename)
        
        file_extension = original_filename.split('.')[-1]
        stored_filename = f"{uuid.uuid4()}.{file_extension}"
        
        if file_type == FileType.PDF:
            storage_dir = self.pdf_dir
        else:
            storage_dir = self.images_dir
        
        file_path = storage_dir / stored_filename
        
        try:
            contents = await file.read()
            with open(file_path, 'wb') as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        document = DocumentModel(
            true_title=original_filename,
            stored_title=stored_filename,
            file_type=file_type,
            file_path=str(file_path),
            data_catgory=Type,
            project_id=project_obj_id
        )
        
        await document.insert()
        return document
    
    async def save_multiple_files(self, project_id: str, Type: Datatype, files: list[UploadFile]) -> list[DocumentModel]:
        """
        Save multiple uploaded files
        
        Args:
            project_id: The project ID to associate the files with
            Type: Data Category
            files: List of uploaded files
            
        Returns:
            list[DocumentModel]: List of created document records
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        documents = []
        for file in files:
            if not file.filename:
                continue
            document = await self.save_file(project_id, Type, file)
            documents.append(document)
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid files were uploaded")
        
        return documents
    
    async def get_document_by_id(self, document_id: str) -> DocumentModel:
 
        try:
            doc_obj_id = PydanticObjectId(document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        document = await DocumentModel.get(doc_obj_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    
    async def list_all_documents(self) -> list[DocumentModel]:

        return await DocumentModel.find_all().to_list()
    
    async def get_documents_by_project(self, project_id: str) -> list[DocumentModel]:
        try:
            project_obj_id = PydanticObjectId(project_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        await self._validate_project_exists(project_obj_id)
        
        documents = await DocumentModel.find(DocumentModel.project_id == project_obj_id).to_list()
        return documents
    
    async def delete_document(self, document_id: str):

        document = await self.get_document_by_id(document_id)
        
        # Delete physical file
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database record
        await document.delete()
        return {"message": "Document deleted successfully"}
    
    async def delete_documents_by_project(self, project_id: str):

        documents = await self.get_documents_by_project(project_id)
        
        for document in documents:
            # Delete physical file
            file_path = Path(document.file_path)
            if file_path.exists():
                file_path.unlink()
            
            # Delete database record
            await document.delete()
        
        return {"message": f"Deleted {len(documents)} documents"}