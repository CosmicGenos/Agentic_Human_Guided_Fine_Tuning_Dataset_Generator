# Setup Guide - Synthetic Data Generation System

Complete setup guide for the contextual RAG system with workers.

## Project Structure

```
d:\Synthetic_Data_Genration\
├── web_api/                    # FastAPI service
│   ├── routers/
│   │   ├── FileMangerRouter.py
│   │   ├── ProjectMangerRouter.py (you need to create this)
│   │   ├── InternalRouter.py      # NEW: File APIs for workers
│   │   ├── WebhookRouter.py       # NEW: Completion webhooks
│   │   └── ProcessingRouter.py    # NEW: Trigger processing
│   ├── data_models/
│   │   └── BeanieModels.py        # UPDATED: Added ChunkModel
│   └── services/
│
├── workers/                    # NEW: Celery worker service
│   ├── tasks/                 # Celery tasks
│   ├── services/              # Processing services
│   ├── chunkers/              # Chunking strategies
│   ├── utils/                 # Utilities
│   ├── config.py
│   ├── enums.py
│   ├── models.py
│   └── celery_app.py
│
├── docker-compose.yml         # NEW: Redis + Qdrant
├── requirements-worker.txt    # NEW: Worker dependencies
└── pyproject.toml             # Existing
```

## Prerequisites

- Python 3.11+
- MongoDB (already running)
- Docker Desktop (for Redis and Qdrant)
- OpenAI API key

## Step 1: Install Worker Dependencies

```powershell
# Install worker dependencies
pip install -r requirements-worker.txt

# If you also need to install web_api dependencies
pip install -r requirements-api.txt  # or use pyproject.toml
```

## Step 2: Start Infrastructure (Redis + Qdrant)

```powershell
# Start Redis and Qdrant
docker-compose up -d

# Verify services are running
docker ps

# Check Redis
docker exec -it synthetic_data_redis redis-cli ping
# Should output: PONG

# Check Qdrant
curl http://localhost:6333/health
# Should output: {"status":"ok"}
```

## Step 3: Configure Environment Variables

```powershell
# Set environment variables (PowerShell)
$env:OPENAI_API_KEY="your-openai-api-key-here"
$env:WEB_API_URL="http://localhost:8000"
$env:CELERY_BROKER_URL="redis://localhost:6379/0"
$env:CELERY_RESULT_BACKEND="redis://localhost:6379/1"
$env:QDRANT_URL="http://localhost:6333"
$env:TEMP_FILE_DIR="C:\temp\celery_files"

# Verify
echo $env:OPENAI_API_KEY
```

## Step 4: Update web_api main.py

Add new routers to your FastAPI app:

```python
# web_api/main.py
from web_api.routers import InternalRouter, WebhookRouter, ProcessingRouter

app = FastAPI()

# Existing routers
# app.include_router(...)

# NEW: Add these routers
app.include_router(InternalRouter.router)
app.include_router(WebhookRouter.router)
app.include_router(ProcessingRouter.router)
```

## Step 5: Update MongoDB Connection

Ensure ChunkModel is registered in Beanie:

```python
# web_api/database.py
from web_api.data_models.BeanieModels import DocumentModel, ProjectModel, ChunkModel

await init_beanie(
    database=db,
    document_models=[
        DocumentModel,
        ProjectModel,
        ChunkModel  # NEW: Add this
    ]
)
```

## Step 6: Start Services

### Terminal 1: Start Web API

```powershell
# Navigate to project root
cd d:\Synthetic_Data_Genration

# Start FastAPI
uvicorn web_api.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Start Celery Worker

```powershell
# Navigate to project root
cd d:\Synthetic_Data_Genration

# Start Celery worker (Windows requires --pool=solo)
celery -A workers.celery_app worker --loglevel=info --pool=solo
```

Note: On Windows, you MUST use `--pool=solo` or install `gevent`:
```powershell
pip install gevent
celery -A workers.celery_app worker --loglevel=info --pool=gevent --concurrency=4
```

## Step 7: Access Monitoring Tools

### Flower (Celery Monitoring)
- URL: http://localhost:5555
- View tasks, workers, success/failure rates

### Qdrant Dashboard
- URL: http://localhost:6333/dashboard
- View collections, vectors, points

### FastAPI Docs
- URL: http://localhost:8000/docs
- Test all API endpoints

## Testing the System

### Test 1: Create Project

```powershell
# Using PowerShell
$body = @{
    project_title = "Test Fiction Project"
    project_description = "Testing the RAG pipeline"
    main_data_type = "fiction"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/projects/" -Method POST -Body $body -ContentType "application/json"

# Save the project_id from response
```

### Test 2: Upload Files

```powershell
# Upload a PDF file
$projectId = "your-project-id-here"
$filePath = "C:\path\to\your\book.pdf"

# This assumes you have FileMangerRouter with upload endpoint
# Adjust according to your actual implementation
```

### Test 3: Start Processing

```powershell
$body = @{
    project_id = "your-project-id-here"
    document_ids = @()  # Empty = process all documents
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/processing/start" -Method POST -Body $body -ContentType "application/json"

# Save task_id
$taskId = $response.task_id
```

### Test 4: Monitor Processing

```powershell
# Check status
Invoke-RestMethod -Uri "http://localhost:8000/processing/status/$taskId" -Method GET

# Or visit Flower
# http://localhost:5555
```

### Test 5: Verify Results

```powershell
# Check Qdrant collection
curl http://localhost:6333/collections/fiction_chunks

# Check chunks in MongoDB
# (use MongoDB Compass or CLI)
```

## Common Issues and Solutions

### Issue: Worker not starting on Windows

**Error:** `ValueError: not enough values to unpack`

**Solution:** Use `--pool=solo`:
```powershell
celery -A workers.celery_app worker --loglevel=info --pool=solo
```

### Issue: Redis connection refused

**Solution:** Ensure Docker is running:
```powershell
docker-compose up -d redis
docker ps
```

### Issue: OpenAI rate limit errors

**Solution:** Reduce concurrent calls in config:
```python
# workers/config.py
LLM_MAX_CONCURRENT_CALLS = 5  # Reduce from 10
```

### Issue: Worker crashes with "Out of Memory"

**Solution:** Process fewer documents or reduce chunk size:
```python
# workers/config.py
CHUNK_SIZE = 512  # Reduce from 1024
LLM_MAX_CHUNKS_PER_BATCH = 15  # Reduce from 30
```

### Issue: Qdrant collection not found

**Solution:** Collection is auto-created on first upload. Check logs for errors.

### Issue: Webhook not reaching web_api

**Solution:** Ensure WEB_API_URL is correct:
```powershell
$env:WEB_API_URL="http://localhost:8000"
```

## Development Workflow

### 1. Make Changes to Worker Code

```powershell
# Edit files in workers/

# Restart worker (Ctrl+C in Terminal 2, then)
celery -A workers.celery_app worker --loglevel=info --pool=solo
```

### 2. Test Individual Services

```python
# Create test script: test_chunking.py
from workers.services.chunking_service import ChunkingService

service = ChunkingService()
text = "Your sample text here..."
chunks = service.chunk_text(text)
print(f"Created {len(chunks)} chunks")
```

### 3. Monitor Logs

```powershell
# Worker logs
celery -A workers.celery_app worker --loglevel=debug

# Web API logs
uvicorn web_api.main:app --reload --log-level=debug
```

## Next Steps

1. **Add ProjectRouter** if it doesn't exist (for creating projects)
2. **Test with real PDFs** (fiction books)
3. **Monitor costs** (OpenAI API usage)
4. **Optimize hyperparameters** (chunk size, context window)
5. **Implement retrieval** (query Qdrant for similar chunks)
6. **Add authentication** to internal APIs
7. **Set up production deployment** (Docker containers)

## Cost Estimation

For 1000 fiction books (average 400 pages each):

- **Contextualization:** ~$465 (using GPT-4o-mini)
- **Embeddings:** ~$130 (OpenAI text-embedding-3-large)
- **Total:** ~$600

With GPT-4o (higher quality):
- **Contextualization:** ~$7,750
- **Total:** ~$7,900

Recommendations:
- Start with GPT-4o-mini
- Test quality on 10 books
- Upgrade to GPT-4o if needed

## Monitoring and Maintenance

### Daily Checks

```powershell
# Check Redis memory usage
docker exec synthetic_data_redis redis-cli INFO memory

# Check Qdrant storage
curl http://localhost:6333/collections/fiction_chunks

# Check failed tasks in Flower
# http://localhost:5555
```

### Cleanup

```powershell
# Clean up temp files manually
Remove-Item -Recurse -Force C:\temp\celery_files\*

# Or let worker auto-cleanup (every 6 hours)
```

### Backup

```powershell
# Backup Qdrant data
docker-compose down
Copy-Item -Recurse "\\wsl$\docker-desktop-data\data\docker\volumes\synthetic_data_genration_qdrant_data" "C:\Backups\qdrant_backup"
docker-compose up -d
```

## Support

For issues:
1. Check logs (worker and web_api)
2. Check Docker containers: `docker ps`
3. Check Flower dashboard
4. Review worker README: `workers/README.md`

## Architecture Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│       Web API (FastAPI)      │
│  - Projects                   │
│  - File Upload                │
│  - Processing Trigger         │
│  - Internal APIs (files)      │
│  - Webhooks (completion)      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│      Redis (Message Queue)   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│    Celery Workers            │
│  1. Fetch file (API)          │
│  2. Extract text (PyMuPDF)    │
│  3. Detect chapters           │
│  4. Chunk text (LlamaIndex)   │
│  5. Contextualize (GPT)       │
│  6. Generate embeddings       │
│  7. Generate BM25             │
│  8. Store (Qdrant)            │
│  9. Notify (Webhook)          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────┬───────────┐
│     Qdrant       │  MongoDB  │
│  (Vectors+BM25)  │ (Metadata)│
└──────────────────┴───────────┘
```

Good luck! 🚀
