import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from beanie import PydanticObjectId
from web_api.data_models.BasicBeanieModels import DocumentModel
from web_api.data_models.ExtractedModels import ExtractedFictionModel, ExtractedAcademicModel, ExtractedImageMetadata
from web_api.data_models.ExtractedDataModels import (
    StoreFictionRequest, StoreAcademicRequest,
    ExtractedFictionResponse, ExtractedAcademicResponse,
    ExtractedFictionDetailResponse, ExtractedAcademicDetailResponse,
    ImageMetadataResponse
)
from web_api.services.MinioService import minio_service
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal APIs"])

FILE_SIZE_THRESHOLD = 5 * 1024 * 1024  # 5MB


@router.get("/files/{document_id}/metadata")
async def get_file_metadata(document_id: str):
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        stat = await minio_service.stat(document.minio_key)
        file_size = stat.size
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in storage: {str(e)}")

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


@router.get("/files/{document_id}/base64")
async def get_file_base64(document_id: str):
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        stat = await minio_service.stat(document.minio_key)
        file_size = stat.size
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in storage: {str(e)}")

    if file_size >= FILE_SIZE_THRESHOLD:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size} bytes). Use streaming endpoint instead."
        )

    try:
        data = await minio_service.download(document.minio_key)
        encoded_data = base64.b64encode(data).decode("utf-8")
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

    try:
        stat = await minio_service.stat(document.minio_key)
        file_size = stat.size
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in storage: {str(e)}")

    if file_size < FILE_SIZE_THRESHOLD:
        raise HTTPException(
            status_code=400,
            detail=f"File is small ({file_size} bytes). Use base64 endpoint for better performance."
        )

    media_type = "application/pdf" if document.file_type.value == "PDF" else "image/*"

    return StreamingResponse(
        minio_service.stream(document.minio_key),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{document.true_title}"',
            "X-Document-ID": str(document.id),
            "X-File-Size": str(file_size)
        }
    )


# ===== EXTRACTED CONTENT ENDPOINTS =====

@router.post("/extracted/academic/images/{document_id}")
async def upload_academic_images(
    document_id: str,
    images: List[UploadFile] = File(...)
):
    """
    Upload extracted images for an academic document to MinIO.
    Stored at: academic-images/{document_id}/{filename}
    """
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    saved = []

    for image in images:
        minio_key = f"academic-images/{document_id}/{image.filename}"
        try:
            data = await image.read()
            await minio_service.upload(minio_key, data, content_type=image.content_type or "image/png")
            saved.append({"filename": image.filename, "minio_key": minio_key})
            logger.info(f"Uploaded image {image.filename} for document {document_id}")
        except Exception as e:
            logger.error(f"Failed to upload image {image.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload image {image.filename}")

    return {
        "document_id": document_id,
        "images_saved": len(saved),
        "saved_keys": saved
    }


@router.post("/extracted/fiction", response_model=ExtractedFictionResponse)
async def store_extracted_fiction(request: StoreFictionRequest):
    try:
        doc_obj_id = PydanticObjectId(request.document_id)
        proj_obj_id = PydanticObjectId(request.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_id or project_id format")

    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    existing = await ExtractedFictionModel.find_one(
        ExtractedFictionModel.document_id == doc_obj_id
    )
    if existing:
        logger.warning(f"Fiction text already exists for document {request.document_id}, updating...")
        existing.extracted_text = request.extracted_text
        existing.character_count = len(request.extracted_text)
        existing.extraction_metadata = request.extraction_metadata
        existing.created_at = datetime.utcnow()
        await existing.save()
        return ExtractedFictionResponse(
            id=str(existing.id),
            document_id=str(existing.document_id),
            project_id=str(existing.project_id),
            character_count=existing.character_count,
            extraction_metadata=existing.extraction_metadata,
            created_at=existing.created_at
        )

    extracted_fiction = ExtractedFictionModel(
        document_id=doc_obj_id,
        project_id=proj_obj_id,
        extracted_text=request.extracted_text,
        character_count=len(request.extracted_text),
        extraction_metadata=request.extraction_metadata
    )
    await extracted_fiction.insert()
    logger.info(f"Stored fiction text for document {request.document_id}")

    return ExtractedFictionResponse(
        id=str(extracted_fiction.id),
        document_id=str(extracted_fiction.document_id),
        project_id=str(extracted_fiction.project_id),
        character_count=extracted_fiction.character_count,
        extraction_metadata=extracted_fiction.extraction_metadata,
        created_at=extracted_fiction.created_at
    )


@router.post("/extracted/academic", response_model=ExtractedAcademicResponse)
async def store_extracted_academic(request: StoreAcademicRequest):
    try:
        doc_obj_id = PydanticObjectId(request.document_id)
        proj_obj_id = PydanticObjectId(request.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_id or project_id format")

    document = await DocumentModel.get(doc_obj_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    image_metadata_list = [
        ExtractedImageMetadata(
            filename=img.filename,
            minio_key=f"academic-images/{request.document_id}/{img.filename}",
            description=img.description,
            position_in_markdown=img.position_in_markdown,
            alt_text=img.alt_text
        )
        for img in request.images
    ]

    existing = await ExtractedAcademicModel.find_one(
        ExtractedAcademicModel.document_id == doc_obj_id
    )
    if existing:
        logger.warning(f"Academic content already exists for document {request.document_id}, updating...")
        existing.markdown_text = request.markdown_text
        existing.enriched_markdown = request.enriched_markdown
        existing.images = image_metadata_list
        existing.character_count = len(request.enriched_markdown)
        existing.image_count = len(image_metadata_list)
        existing.extraction_metadata = request.extraction_metadata
        existing.created_at = datetime.utcnow()
        await existing.save()
        return ExtractedAcademicResponse(
            id=str(existing.id),
            document_id=str(existing.document_id),
            project_id=str(existing.project_id),
            character_count=existing.character_count,
            image_count=existing.image_count,
            images=[ImageMetadataResponse(**img.dict()) for img in existing.images],
            extraction_metadata=existing.extraction_metadata,
            created_at=existing.created_at
        )

    extracted_academic = ExtractedAcademicModel(
        document_id=doc_obj_id,
        project_id=proj_obj_id,
        markdown_text=request.markdown_text,
        enriched_markdown=request.enriched_markdown,
        images=image_metadata_list,
        character_count=len(request.enriched_markdown),
        image_count=len(image_metadata_list),
        extraction_metadata=request.extraction_metadata
    )
    await extracted_academic.insert()
    logger.info(f"Stored academic content for document {request.document_id}")

    return ExtractedAcademicResponse(
        id=str(extracted_academic.id),
        document_id=str(extracted_academic.document_id),
        project_id=str(extracted_academic.project_id),
        character_count=extracted_academic.character_count,
        image_count=extracted_academic.image_count,
        images=[ImageMetadataResponse(**img.dict()) for img in extracted_academic.images],
        extraction_metadata=extracted_academic.extraction_metadata,
        created_at=extracted_academic.created_at
    )


@router.get("/extracted/fiction/{document_id}", response_model=ExtractedFictionDetailResponse)
async def get_extracted_fiction(document_id: str):
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    extracted = await ExtractedFictionModel.find_one(
        ExtractedFictionModel.document_id == doc_obj_id
    )
    if not extracted:
        raise HTTPException(status_code=404, detail="Extracted fiction not found")

    return ExtractedFictionDetailResponse(
        id=str(extracted.id),
        document_id=str(extracted.document_id),
        project_id=str(extracted.project_id),
        extracted_text=extracted.extracted_text,
        character_count=extracted.character_count,
        extraction_metadata=extracted.extraction_metadata,
        created_at=extracted.created_at
    )


@router.get("/extracted/academic/{document_id}", response_model=ExtractedAcademicDetailResponse)
async def get_extracted_academic(document_id: str):
    try:
        doc_obj_id = PydanticObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    extracted = await ExtractedAcademicModel.find_one(
        ExtractedAcademicModel.document_id == doc_obj_id
    )
    if not extracted:
        raise HTTPException(status_code=404, detail="Extracted academic content not found")

    return ExtractedAcademicDetailResponse(
        id=str(extracted.id),
        document_id=str(extracted.document_id),
        project_id=str(extracted.project_id),
        markdown_text=extracted.markdown_text,
        enriched_markdown=extracted.enriched_markdown,
        character_count=extracted.character_count,
        image_count=extracted.image_count,
        images=[ImageMetadataResponse(**img.dict()) for img in extracted.images],
        extraction_metadata=extracted.extraction_metadata,
        created_at=extracted.created_at
    )


@router.get("/extracted/project/{project_id}")
async def get_extracted_by_project(
    project_id: str,
    data_type: Optional[str] = None
):
    try:
        proj_obj_id = PydanticObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format")

    result = {"project_id": project_id, "fiction": [], "academic": []}

    if data_type is None or data_type == "fiction":
        fiction_docs = await ExtractedFictionModel.find(
            ExtractedFictionModel.project_id == proj_obj_id
        ).to_list()
        result["fiction"] = [
            ExtractedFictionResponse(
                id=str(doc.id),
                document_id=str(doc.document_id),
                project_id=str(doc.project_id),
                character_count=doc.character_count,
                extraction_metadata=doc.extraction_metadata,
                created_at=doc.created_at
            )
            for doc in fiction_docs
        ]

    if data_type is None or data_type == "academic":
        academic_docs = await ExtractedAcademicModel.find(
            ExtractedAcademicModel.project_id == proj_obj_id
        ).to_list()
        result["academic"] = [
            ExtractedAcademicResponse(
                id=str(doc.id),
                document_id=str(doc.document_id),
                project_id=str(doc.project_id),
                character_count=doc.character_count,
                image_count=doc.image_count,
                images=[ImageMetadataResponse(**img.dict()) for img in doc.images],
                extraction_metadata=doc.extraction_metadata,
                created_at=doc.created_at
            )
            for doc in academic_docs
        ]

    return result
