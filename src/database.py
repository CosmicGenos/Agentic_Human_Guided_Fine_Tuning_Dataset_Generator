from pymongo import AsyncMongoClient
from beanie import init_beanie
from src.data_models.BeanieModels import DocumentModel,ProjectModel
import os
from contextlib import asynccontextmanager

class Database:
    client: AsyncMongoClient = None
    
db = Database()

async def init_db():
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "synthetic_data_db")
    
    db.client = AsyncMongoClient(mongodb_url)
    
    await init_beanie(
        database=db.client[database_name],
        document_models=[DocumentModel,ProjectModel]
    )

async def close_db():
    if db.client:
        db.client.close()

@asynccontextmanager
async def lifespan_context():
    await init_db()
    yield
    await close_db()