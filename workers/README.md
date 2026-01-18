# Workers Service

Celery-based worker service for processing documents (PDFs) and generating embeddings.

## Architecture

```
User → Web API → Redis Queue → Celery Workers → Processing Pipeline → Qdrant + MongoDB
```

## Processing Pipeline (Fiction)

1. **Fetch File** - Download PDF from Web API (base64 or streaming)
2. **Extract Text** - Extract text using PyMuPDF
3. **Detect Chapters** - Detect chapters using regex patterns
4. **Chunk Text** - Chunk using LlamaIndex SentenceSplitter
5. **Contextualize** - Add context using GPT-4o-mini (parallel processing)
6. **Generate Embeddings** - Create dense vectors (OpenAI)
7. **Generate BM25** - Create sparse vectors (Qdrant built-in)
8. **Store Vectors** - Save to Qdrant with both dense and sparse vectors
9. **Notify Web API** - Send webhook with completion data

## Configuration

Edit `workers/config.py` for:
- Chunk size and overlap
- LLM model and settings
- Embedding model
- Qdrant connection
- File size threshold

## Running Locally

### 1. Start Infrastructure (Redis, Qdrant)

```bash
docker-compose up -d
```

### 2. Install Dependencies

```bash
pip install -r requirements-worker.txt
```

### 3. Set Environment Variables

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="your-api-key-here"
$env:WEB_API_URL="http://localhost:8000"
$env:CELERY_BROKER_URL="redis://localhost:6379/0"
$env:QDRANT_URL="http://localhost:6333"
```

### 4. Start Celery Worker

```bash
celery -A workers.celery_app worker --loglevel=info --pool=solo
```

Note: On Windows, use `--pool=solo` or `--pool=gevent`

### 5. Monitor with Flower (Optional)

```bash
# Flower is already running in Docker
# Access at: http://localhost:5555
```

## Task Structure

### Input (from Redis)

```json
{
  "task_id": "uuid-string",
  "project_id": "mongodb-object-id",
  "documents": [
    {
      "id": "document-mongodb-id",
      "file_size": 2048000
    }
  ],
  "data_type": "fiction"
}
```

### Output (to Web API webhook)

```json
{
  "task_id": "uuid-string",
  "document_id": "mongodb-object-id",
  "project_id": "mongodb-object-id",
  "status": "completed",
  "chunks_processed": 250,
  "total_chunks": 250,
  "chunks_data": [
    {
      "chunk_index": 0,
      "qdrant_point_id": "uuid",
      "metadata": {
        "chapter": 1,
        "chapter_title": "Chapter 1"
      }
    }
  ]
}
```

## Directory Structure

```
workers/
├── tasks/
│   ├── orchestrator.py       # Main Celery task
│   └── fiction_processor.py  # Fiction processing pipeline
├── services/
│   ├── file_fetcher.py       # Fetch files from Web API
│   ├── text_extractor.py     # PDF → text
│   ├── chapter_detector.py   # Detect chapters
│   ├── chunking_service.py   # Chunking abstraction
│   ├── contextualizer.py     # LLM contextualization
│   ├── embedding_service.py  # Generate embeddings
│   ├── bm25_service.py       # Generate sparse vectors
│   └── storage_service.py    # Store in Qdrant
├── chunkers/
│   ├── base.py              # Abstract base class
│   ├── llama_index_chunker.py
│   └── factory.py           # Chunker factory
├── utils/
│   ├── temp_file_manager.py  # Temp file handling
│   └── webhook_notifier.py   # Webhook notifications
├── config.py                 # Configuration
├── enums.py                  # Worker enums
├── models.py                 # Data models
└── celery_app.py            # Celery setup
```

## Key Features

### Parallel Processing
- Max 10 concurrent LLM calls (configurable)
- Async/await for all I/O operations
- Semaphore-based rate limiting

### Error Handling
- 3 retries with exponential backoff
- Graceful degradation (fallback to original text if contextualization fails)
- Webhook notifications on failure

### Chunking Abstraction
- Strategy pattern for easy swapping
- Factory for creating chunkers
- Add new chunkers without changing pipeline

### Hybrid Search
- Dense vectors (semantic search)
- Sparse vectors (BM25 keyword search)
- Both stored in Qdrant for hybrid retrieval

## Development

### Adding a New Chunker

1. Create new file in `workers/chunkers/`:

```python
from workers.chunkers.base import ChunkingStrategy

class MyCustomChunker(ChunkingStrategy):
    def chunk_text(self, text: str) -> List[Chunk]:
        # Your implementation
        pass
```

2. Add to `workers/enums.py`:

```python
class ChunkerType(str, Enum):
    MY_CUSTOM = "my_custom"
```

3. Register in `workers/chunkers/factory.py`:

```python
if chunker_type == ChunkerType.MY_CUSTOM:
    return MyCustomChunker(chunk_size, chunk_overlap)
```

4. Update config:

```python
CHUNKER_TYPE = ChunkerType.MY_CUSTOM
```

## Troubleshooting

### Worker not picking up tasks
- Check Redis connection
- Verify queue name matches
- Check Celery logs

### Out of memory
- Reduce `LLM_MAX_CONCURRENT_CALLS`
- Reduce `CHUNK_SIZE`
- Process fewer documents at once

### Rate limit errors (OpenAI)
- Reduce `LLM_MAX_CONCURRENT_CALLS`
- Add API key rotation
- Increase retry backoff

### Qdrant connection errors
- Ensure Qdrant is running: `docker ps`
- Check Qdrant health: `curl http://localhost:6333/health`
- Verify URL in config

## Production Deployment

### Docker (Future)

```dockerfile
# Dockerfile.worker
FROM python:3.11-slim

WORKDIR /app
COPY workers/ ./workers/
COPY requirements-worker.txt .

RUN pip install -r requirements-worker.txt

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info"]
```

### Environment Variables

Required:
- `OPENAI_API_KEY`
- `WEB_API_URL`
- `CELERY_BROKER_URL`
- `QDRANT_URL`

Optional:
- `TEMP_FILE_DIR`
- `CELERY_RESULT_BACKEND`

## Monitoring

### Flower Dashboard
- URL: http://localhost:5555
- View active tasks, success/failure rates
- See worker status

### Logs
```bash
# Celery logs
celery -A workers.celery_app worker --loglevel=debug

# Check specific task
celery -A workers.celery_app inspect active
```

### Qdrant Dashboard
- URL: http://localhost:6333/dashboard
- View collections, points, metrics
