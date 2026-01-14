from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.database import init_db, close_db
from src.routers.FileMangerRouter import router as file_router
from src.routers.ProjectMangerRouter import router as project_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(title="Synthetic Data Generation", lifespan=lifespan)

app.include_router(file_router)
app.include_router(project_router)

@app.get("/")
async def root():
    return {"message": "Synthetic Data Generation API"}