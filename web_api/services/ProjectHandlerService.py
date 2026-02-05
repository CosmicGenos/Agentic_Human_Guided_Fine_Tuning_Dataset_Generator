from web_api.data_models.BasicBeanieModels import ProjectModel
from web_api.data_models.enums import Datatype
from fastapi import HTTPException
from beanie import PydanticObjectId

class ProjectHandlerService:
    @staticmethod
    async def create_project(project_title: str, project_description: str, main_data_type: Datatype) -> ProjectModel:
        """
        Create a new project record in MongoDB
        
        Args:
            project_title: Title of the project
            project_description: Description of the project
            main_data_type: Main data type associated with the project
            
        Returns:
            ProjectModel: The created project record
        """
        project = ProjectModel(
            project_title=project_title,
            project_description=project_description,
            main_data_type=main_data_type
        )
        await project.insert()
        return project
    
    @staticmethod
    async def get_project_by_id(project_id: str) -> ProjectModel:
        """Get project by ID"""
        try:
            project_obj_id = PydanticObjectId(project_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        project = await ProjectModel.get(project_obj_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    
    @staticmethod
    async def list_all_projects() -> list[ProjectModel]:
        """List all projects"""
        return await ProjectModel.find_all().to_list()
    
    @staticmethod
    async def update_project(project_id: str, project_title: str = None, project_description: str = None, main_data_type: Datatype = None) -> ProjectModel:
        """Update project details"""
        project = await ProjectHandlerService.get_project_by_id(project_id)
        
        if project_title is not None:
            project.project_title = project_title
        if project_description is not None:
            project.project_description = project_description
        if main_data_type is not None:
            project.main_data_type = main_data_type
        
        await project.save()
        return project
    
    @staticmethod
    async def delete_project(project_id: str):
        """Delete a project (files must be deleted first via FileHandlerService)"""
        project = await ProjectHandlerService.get_project_by_id(project_id)
        await project.delete()
        return {"message": "Project deleted successfully"}