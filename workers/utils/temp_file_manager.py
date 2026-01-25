"""
Temporary file management utilities.
"""

from pathlib import Path
import shutil
from datetime import datetime, timedelta
from workers.config import Config
import logging

logger = logging.getLogger(__name__)


class TempFileManager:

    def __init__(self):
        self.temp_dir = Path(Config.TEMP_FILE_DIR)
        self.retention_hours = Config.TEMP_FILE_RETENTION_HOURS
        
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Temp file directory: {self.temp_dir}")
    
    def get_task_directory(self, task_id: str) -> Path:
   
        task_dir = self.temp_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir
    
    def get_file_path(self, task_id: str, filename: str) -> Path:
       
        return self.get_task_directory(task_id) / filename
    
    def cleanup_task_directory(self, task_id: str, force: bool = False):

        task_dir = self.temp_dir / task_id
        
        if not task_dir.exists():
            return
        
        if force:
            shutil.rmtree(task_dir)
            logger.info(f"Deleted task directory: {task_dir}")
        else:
            mod_time = datetime.fromtimestamp(task_dir.stat().st_mtime)
            age = datetime.now() - mod_time
            
            if age > timedelta(hours=self.retention_hours):
                shutil.rmtree(task_dir)
                logger.info(f"Deleted old task directory: {task_dir} (age: {age})")
    
    def cleanup_old_directories(self):
        if not self.temp_dir.exists():
            return
        
        for task_dir in self.temp_dir.iterdir():
            if task_dir.is_dir():
                try:
                    mod_time = datetime.fromtimestamp(task_dir.stat().st_mtime)
                    age = datetime.now() - mod_time
                    
                    if age > timedelta(hours=self.retention_hours):
                        shutil.rmtree(task_dir)
                        logger.info(f"Cleaned up old directory: {task_dir}")
                except Exception as e:
                    logger.error(f"Failed to clean up {task_dir}: {str(e)}")


    
