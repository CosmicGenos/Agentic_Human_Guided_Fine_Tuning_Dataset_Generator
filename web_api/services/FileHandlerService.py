import uuid
from fastapi import UploadFile, HTTPException
from web_api.data_models.BasicBeanieModels import DocumentModel, ProjectModel
from web_api.data_models.enums import FileType, Datatype
from web_api.services.MinioService import minio_service
from beanie import PydanticObjectId

_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "bmp": "image/bmp",
}


class FileHandlerService:

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
        try:
            project_obj_id = PydanticObjectId(project_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID format")

        await self._validate_project_exists(project_obj_id)

        original_filename = file.filename
        file_type = self._get_file_type(original_filename)

        extension = original_filename.split('.')[-1].lower()
        stored_filename = f"{uuid.uuid4()}.{extension}"

        prefix = "pdfs" if file_type == FileType.PDF else "images"
        minio_key = f"{prefix}/{stored_filename}"
        content_type = _CONTENT_TYPES.get(extension, "application/octet-stream")

        try:
            contents = await file.read()
            await minio_service.upload(minio_key, contents, content_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

        document = DocumentModel(
            true_title=original_filename,
            stored_title=stored_filename,
            file_type=file_type,
            minio_key=minio_key,
            data_catgory=Type,
            project_id=project_obj_id
        )

        await document.insert()
        return document

    async def save_multiple_files(self, project_id: str, Type: Datatype, files: list[UploadFile]) -> list[DocumentModel]:
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

        return await DocumentModel.find(DocumentModel.project_id == project_obj_id).to_list()

    async def delete_document(self, document_id: str):
        document = await self.get_document_by_id(document_id)

        try:
            await minio_service.delete(document.minio_key)
        except Exception:
            pass

        await document.delete()
        return {"message": "Document deleted successfully"}

    async def delete_documents_by_project(self, project_id: str):
        documents = await self.get_documents_by_project(project_id)

        for document in documents:
            try:
                await minio_service.delete(document.minio_key)
            except Exception:
                pass
            await document.delete()

        return {"message": f"Deleted {len(documents)} documents"}
