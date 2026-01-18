
from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from celery import Celery
from pathlib import Path
import uuid
from web_api.data_models.BeanieModels import DocumentModel, ProjectModel
import os
from web_api.data_models.DataModels import ProcessDocumentsRequest

router = APIRouter(prefix="/processing", tags=["Processing"])

# Celery client (connects to Redis broker)
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery_client = Celery("web_api", broker=CELERY_BROKER_URL)





@router.post("/start")
async def start_processing(request: ProcessDocumentsRequest ):
    
    try:
        project_obj_id = PydanticObjectId(request.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
    
    project = await ProjectModel.get(project_obj_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if request.document_ids:
        documents = []
        for doc_id in request.document_ids:
            try:
                doc_obj_id = PydanticObjectId(doc_id)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid document ID: {doc_id}")
            
            doc = await DocumentModel.get(doc_obj_id)
            if not doc:
                raise HTTPException(status_code=404, detail=f"Document not found: {doc_id}")
            
            if str(doc.project_id) != request.project_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Document {doc_id} does not belong to project {request.project_id}"
                )
            
            documents.append(doc)
    else:
        # Process all documents in project
        documents = await DocumentModel.find(
            DocumentModel.project_id == project_obj_id
        ).to_list()
    
    if not documents:
        raise HTTPException(status_code=400, detail="No documents to process")
    
    # Prepare task data
    task_id = str(uuid.uuid4())
    
    documents_data = []
    for doc in documents:
        file_path = Path(doc.file_path)
        file_size = file_path.stat().st_size if file_path.exists() else 0
        
        documents_data.append({
            "id": str(doc.id),
            "file_size": file_size
        })
    
    task_payload = {
        "task_id": task_id,
        "project_id": request.project_id,
        "documents": documents_data,
        "data_type": project.main_data_type.value  # "fiction" or "academic"
    }
    
    # Send task to Celery workers
    celery_task = celery_client.send_task(
        "workers.tasks.process_documents",
        args=[task_payload],
        task_id=task_id
    )
    
    return {
        "message": "Processing started",
        "task_id": task_id,
        "celery_task_id": celery_task.id,
        "project_id": request.project_id,
        "documents_count": len(documents),
        "data_type": project.main_data_type.value,
        "monitor_url": f"http://localhost:5555/task/{task_id}"  # Flower URL
    }


@router.get("/status/{task_id}")
async def get_task_status(task_id: str):

    task_result = celery_client.AsyncResult(task_id)
    
    response = {
        "task_id": task_id,
        "state": task_result.state,
        "ready": task_result.ready(),
        "successful": task_result.successful() if task_result.ready() else None,
        "failed": task_result.failed() if task_result.ready() else None,
    }

    if task_result.ready():
        if task_result.successful():
            response["result"] = task_result.result
        elif task_result.failed():
            response["error"] = str(task_result.info)
    
    return response
