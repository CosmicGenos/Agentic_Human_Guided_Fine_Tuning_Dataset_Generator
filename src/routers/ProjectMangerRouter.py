from fastapi import APIRouter
from src.services.ProjectHandlerService import ProjectHandlerService
from src.services.FileHandlerService import FileHandlerService
from src.data_models.BeanieModels import ProjectModel
from src.data_models.DataModels import CreateProjectRequest, UpdateProjectRequest

router = APIRouter(prefix="/projects", tags=["Project Management"])
project_service = ProjectHandlerService()
file_service = FileHandlerService()



@router.post("/Create-project", response_model=ProjectModel)
async def create_project(request: CreateProjectRequest):
    """Create a new project"""
    return await project_service.create_project(
        request.project_title,
        request.project_description,
        request.main_data_type
    )

@router.get("/get-project/{project_id}", response_model=ProjectModel)
async def get_project(project_id: str):
    """Get a specific project by ID"""
    return await project_service.get_project_by_id(project_id)

@router.get("/get-all-projects", response_model=list[ProjectModel])
async def list_projects():
    """List all projects"""
    return await project_service.list_all_projects()

@router.put("/update-project/{project_id}", response_model=ProjectModel)
async def update_project(project_id: str, request: UpdateProjectRequest):
    """Update project details"""
    return await project_service.update_project(
        project_id,
        request.project_title,
        request.project_description,
        request.main_data_type
    )

@router.delete("/delete-project/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and all its associated files"""
    # First delete all associated documents
    await file_service.delete_documents_by_project(project_id)
    
    # Then delete the project
    return await project_service.delete_project(project_id)