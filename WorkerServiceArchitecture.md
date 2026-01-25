
# Worker Service Architecture (Code Walkthrough)

This document describes the current codebase architecture and the complete call/data flow between:

- **FastAPI Web API** (project + file management, internal file-serving APIs, processing trigger APIs, webhooks)
- **MongoDB** via **Beanie** (project/doc metadata + chunk metadata)
- **Local disk** (uploaded PDFs/images)
- **Redis + Celery** (job queue + distributed worker execution)
- **Celery Workers** (PDF/text/markdown processing, chunking, LLM contextualization, embeddings)
- **Qdrant** (dense + sparse hybrid vectors)
- External services/tools: **OpenAI** (LLM + embeddings), **Gemini/OpenAI Vision** (image captions), **marker_single** (PDF→Markdown), **PyMuPDF** (PDF text extraction)

This is a *read-only* understanding of the code: no runtime assumptions beyond what is explicitly implemented.

---

## 1) High-level architecture

### 1.1 Components

**Web API (FastAPI)**
- Accepts project creation/update/deletion.
- Accepts file uploads and stores files on disk under `Uploaded_Files/`.
- Stores file/project metadata in MongoDB via Beanie.
- Triggers processing by enqueueing a Celery task into Redis.
- Serves uploaded files back to workers using internal endpoints:
	- `/internal/files/{document_id}/metadata`
	- `/internal/files/{document_id}/base64`
	- `/internal/files/{document_id}/stream`
- Receives completion/failure notifications from workers via webhook endpoints:
	- `/webhooks/processing-complete`
	- `/webhooks/processing-failed`

**MongoDB (Beanie ODM)**
- Collections:
	- `documents` (`DocumentModel`): one record per uploaded document.
	- `Project` (`ProjectModel`): one record per project.
	- `chunks` (`ChunkModel`): one record per processed chunk (metadata + Qdrant point id).

**Local file storage**
- Uploaded files are written under:
	- `Uploaded_Files/pdf/` (PDFs)
	- `Uploaded_Files/images/` (images)

**Redis + Celery**
- Web API uses Celery client to publish a task named `workers.tasks.process_documents`.
- Workers run the Celery app defined in `workers/celery_app.py`.

**Workers (Celery tasks + services)**
- Consume processing tasks.
- Fetch original files from Web API internal endpoints.
- For Fiction PDFs:
	- Extract text (PyMuPDF)
	- Hierarchical chunking (Chonkie sentence chunker)
	- LLM contextualization (OpenAI chat completions)
	- Embeddings (OpenAI embeddings)
	- BM25 sparse vectors (local token hashing)
	- Store hybrid vectors in Qdrant
	- Notify Web API via webhook
- For Academic PDFs:
	- Convert PDF→Markdown using Marker CLI (`marker_single`)
	- Caption images (Gemini/OpenAI vision)
	- Replace images with captions
	- Academic-aware chunking (pre-segmentation of tables/code/math)
	- Contextualization + embeddings + sparse vectors + storage + webhook

**Qdrant**
- Stores points with 2 vector spaces:
	- `dense`: float embedding vectors (OpenAI)
	- `sparse`: sparse vectors (BM25-style)
- Stores payload per chunk (original text, contextualization, metadata, document/project ids, etc.)

### 1.2 End-to-end flow (happy path)

#### A) Create project and upload files
1. Client calls project endpoints under `/projects/*` to create a `ProjectModel` record.
2. Client uploads PDFs/images to `/files/upload` or `/files/upload-multiple`.
3. Web API writes file bytes to disk and inserts `DocumentModel` with:
	 - `true_title` (original filename)
	 - `stored_title` (UUID filename)
	 - `file_type` (PDF or IMAGES)
	 - `file_path` (disk path)
	 - `data_catgory` (Datatype enum)
	 - `project_id`

#### B) Trigger processing
4. Client calls `/processing/start` with:
	 - `project_id`
	 - optional `document_ids` (empty means “all documents in project”)
5. Web API validates documents belong to project.
6. Web API builds `task_payload`:

```json
{
	"task_id": "<uuid>",
	"project_id": "<mongo_object_id>",
	"documents": [{"id": "<doc_id>", "file_size": 12345}],
	"data_type": "fiction" | "academic"
}
```

7. Web API publishes Celery task `workers.tasks.process_documents` to Redis.

#### C) Worker execution
8. Celery worker receives the task and executes `workers.tasks.orchestrator.process_documents()`.
9. Orchestrator picks a processor (Fiction vs Academic) based on `task_data.data_type`.
10. For each document:
		- Worker fetches the file via Web API internal endpoints.
		- Worker runs the document pipeline.
		- Worker stores vectors in Qdrant.
		- Worker notifies Web API webhook.
11. Web API webhook inserts `ChunkModel` records with `qdrant_point_id` references.

---

## 2) Web API: modules and call graph (function-by-function)

### 2.1 `web_api/main.py`

**`lifespan(app)`**
- Called by FastAPI as application lifespan handler.
- Calls:
	- `web_api.database.init_db()` on startup
	- `web_api.database.close_db()` on shutdown

**`app = FastAPI(..., lifespan=lifespan)`**
- Creates the FastAPI app.

**Router registration**
- Calls:
	- `app.include_router(file_router)` where `file_router` is `web_api.routers.FileMangerRouter.router`
	- `app.include_router(project_router)` where `project_router` is `web_api.routers.ProjectMangerRouter.router`

**`GET /` (`root`)**
- Returns a static JSON message.

Important note (current wiring):
- The repository contains additional routers (`InternalRouter`, `ProcessingRouter`, `WebhookRouter`) used by workers and processing triggers, but `main.py` currently only includes File + Project routers. If those additional routers are not included at runtime, worker fetch/webhook calls will not be reachable.

### 2.2 `web_api/database.py`

**`Database` / `db`**
- Simple holder for `AsyncMongoClient`.

**`init_db()`**
- Reads env:
	- `MONGODB_URL` (default `mongodb://localhost:27017`)
	- `DATABASE_NAME` (default `synthetic_data_db`)
- Creates `AsyncMongoClient`.
- Calls `beanie.init_beanie(database=..., document_models=[...])`.
- Registers `DocumentModel` and `ProjectModel`.

Important note (current wiring):
- `ChunkModel` exists in `web_api.data_models.BeanieModels`, and webhook code inserts `ChunkModel` records. However, `ChunkModel` is not currently registered in `init_beanie(...)` here, which would typically prevent inserts/queries for that model.

**`close_db()`**
- Closes `db.client`.

**`lifespan_context()`**
- Async context manager wrapper around `init_db()` / `close_db()`.

### 2.3 `web_api/data_models/enums.py`

**`FileType`**
- Enum values:
	- `PDF = "pdf"`
	- `IMAGES = "images"`

**`Datatype`**
- Enum values:
	- `FICTION = "fiction"`
	- `ACADAMIC = "acdamic"` *(note spelling)*

Important note:
- Worker-side enum uses `academic` (correct spelling), and `DataModels.TaskData.data_type` expects `"fiction" or "academic"`.

### 2.4 `web_api/data_models/BeanieModels.py`

**`DocumentModel` (Beanie `Document`)**
- Stored in Mongo collection `documents`.
- Fields:
	- `true_title`: original filename
	- `stored_title`: UUID filename
	- `file_type`: `FileType`
	- `file_path`: absolute/relative disk path
	- `data_catgory`: `Datatype`
	- `project_id`: `PydanticObjectId`

**`ProjectModel`**
- Stored in Mongo collection `Project`.
- Fields:
	- `project_title`
	- `project_description`
	- `main_data_type`: `Datatype`

**`ChunkModel`**
- Stored in Mongo collection `chunks`.
- Stores metadata about processed chunks; vectors live in Qdrant.
- Fields:
	- `document_id`, `project_id`
	- `chunk_index`
	- `qdrant_point_id`
	- `processing_status` (pending/processing/completed/failed)
	- timestamps, `error_message`, `metadata`

### 2.5 `web_api/data_models/DataModels.py`

**`CreateProjectRequest`**
- `project_title`, `project_description`, `main_data_type`.

**`UpdateProjectRequest`**
- Optional updates to `project_title`, `project_description`, `main_data_type`.

**`ProcessDocumentsRequest`**
- `project_id`: str
- `document_ids`: `List[str]`

### 2.6 `web_api/services/ProjectHandlerService.py`

**`create_project(project_title, project_description, main_data_type)`**
- Creates a `ProjectModel` and calls `project.insert()`.
- Called by: `POST /projects/Create-project`.

**`get_project_by_id(project_id)`**
- Validates `project_id` as `PydanticObjectId`.
- Calls `ProjectModel.get(...)`.
- Called by: `GET /projects/get-project/{project_id}` and `update_project`, `delete_project`.

**`list_all_projects()`**
- Calls `ProjectModel.find_all().to_list()`.
- Called by: `GET /projects/get-all-projects`.

**`update_project(project_id, project_title?, project_description?, main_data_type?)`**
- Loads project via `get_project_by_id`.
- Mutates fields and calls `project.save()`.
- Called by: `PUT /projects/update-project/{project_id}`.

**`delete_project(project_id)`**
- Loads project via `get_project_by_id`.
- Calls `project.delete()`.
- Called by: `DELETE /projects/delete-project/{project_id}`.

### 2.7 `web_api/services/FileHandlerService.py`

Class constants:
- `BASE_UPLOAD_DIR = "Uploaded_Files"`
- Uses `Uploaded_Files/pdf` and `Uploaded_Files/images`.

**`__init__()`**
- Initializes paths and calls `_ensure_directories()`.

**`_ensure_directories()`**
- Creates upload directory and the `pdf/` and `images/` subdirectories.

**`_get_file_type(filename)`**
- Inspects file extension.
- Returns `FileType.PDF` for `pdf` and `FileType.IMAGES` for common image extensions.
- Raises HTTP 400 for unsupported types.

**`_validate_project_exists(project_id)`**
- Calls `ProjectModel.get(project_id)`.
- Raises HTTP 404 if missing.

**`save_file(project_id, Type, file)`**
- Validates `project_id` format.
- Ensures the project exists.
- Computes `file_type` from the original filename.
- Generates a UUID-based stored filename.
- Reads `UploadFile` bytes and writes to disk.
- Creates and inserts a `DocumentModel` record.
- Called by: `POST /files/upload`.

**`save_multiple_files(project_id, Type, files)`**
- Iterates and calls `save_file(...)` per file.
- Called by: `POST /files/upload-multiple`.

**`get_document_by_id(document_id)`**
- Validates id and calls `DocumentModel.get(...)`.
- Called by: `GET /files/{document_id}`, also internal workflows.

**`list_all_documents()`**
- Calls `DocumentModel.find_all().to_list()`.
- Called by: `GET /files/`.

**`get_documents_by_project(project_id)`**
- Validates project id and project existence.
- Queries `DocumentModel.find(DocumentModel.project_id == project_obj_id).to_list()`.
- Called by: `GET /files/project/{project_id}` and `delete_documents_by_project`.

**`delete_document(document_id)`**
- Loads doc via `get_document_by_id`.
- Deletes file from disk (`Path.unlink()`).
- Deletes record from Mongo (`document.delete()`).
- Called by: `DELETE /files/{document_id}`.

**`delete_documents_by_project(project_id)`**
- Loads all docs via `get_documents_by_project`.
- Deletes files + deletes Mongo records.
- Called by: `DELETE /projects/delete-project/{project_id}` before removing the project.

### 2.8 `web_api/routers/FileMangerRouter.py`

Endpoints:
- `POST /files/upload` → calls `FileHandlerService.save_file`
- `POST /files/upload-multiple` → calls `FileHandlerService.save_multiple_files`
- `GET /files/{document_id}` → calls `FileHandlerService.get_document_by_id`
- `GET /files/` → calls `FileHandlerService.list_all_documents`
- `GET /files/project/{project_id}` → calls `FileHandlerService.get_documents_by_project`
- `DELETE /files/{document_id}` → calls `FileHandlerService.delete_document`

### 2.9 `web_api/routers/ProjectMangerRouter.py`

Endpoints:
- `POST /projects/Create-project` → `ProjectHandlerService.create_project`
- `GET /projects/get-project/{project_id}` → `ProjectHandlerService.get_project_by_id`
- `GET /projects/get-all-projects` → `ProjectHandlerService.list_all_projects`
- `PUT /projects/update-project/{project_id}` → `ProjectHandlerService.update_project`
- `DELETE /projects/delete-project/{project_id}` →
	- `FileHandlerService.delete_documents_by_project(project_id)`
	- then `ProjectHandlerService.delete_project(project_id)`

### 2.10 `web_api/routers/InternalRouter.py` (worker-only file APIs)

Constants:
- `FILE_SIZE_THRESHOLD = 5MB` (separate constant from worker-side Config threshold).

**`GET /internal/files/{document_id}/metadata`**
- Loads `DocumentModel`.
- Reads file size from disk.
- Returns a JSON object matching `workers.models.FileMetadata`.

**`GET /internal/files/{document_id}/base64`**
- Validates file exists.
- Reads file bytes and returns base64 string.
- Rejects files >= 5MB (forces streaming).

**`GET /internal/files/{document_id}/stream`**
- Streams file bytes in 8KB chunks.
- Rejects files < 5MB (recommends base64 endpoint).

### 2.11 `web_api/routers/ProcessingRouter.py` (enqueue Celery tasks)

Setup:
- Creates a Celery client connected to `CELERY_BROKER_URL`.

**`POST /processing/start`**
- Validates project.
- Loads either:
	- a subset of documents by id (`request.document_ids`), or
	- all documents in the project.
- Builds `task_payload` (see section 1.2).
- Calls `celery_client.send_task("workers.tasks.process_documents", args=[task_payload], task_id=task_id)`.

**`GET /processing/status/{task_id}`**
- Calls `celery_client.AsyncResult(task_id)`.
- Returns Celery state and result/error if ready.

### 2.12 `web_api/routers/WebhookRouter.py` (worker → API notifications)

**`POST /webhooks/processing-complete`**
- Validates ids.
- Loads `DocumentModel` to ensure existence.
- Builds a `ChunkModel` per chunk in `payload.chunks_data`.
- Calls `ChunkModel.insert_many(...)`.

**`POST /webhooks/processing-failed`**
- Validates doc id.
- Ensures document exists.
- Returns an acknowledgement (no DB write currently).

---

## 3) Workers: modules and call graph (function-by-function)

### 3.1 `workers/config.py`

`Config` centralizes operational parameters:

- **Web API**: `WEB_API_BASE_URL`, `FILE_SIZE_THRESHOLD`
- **Celery/Redis**: `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- **Temp files**: `TEMP_FILE_DIR`, `TEMP_FILE_RETENTION_HOURS`
- **Chunking (Chonkie)**: parent/child sizes + overlaps + tokenizer
- **LLM contextualization**: model name, concurrency, token limits
- **Embeddings**: model, dimensions, batching
- **Qdrant**: URL and collection names
- **Marker** (academic PDFs): output format, OCR flags, timeout, Gemini key for Marker
- **Vision**: provider, model name, context window, API keys
- **Retry**: max retries + backoff

Important note:
- `TEMP_FILE_DIR` is defined twice in `Config` (last assignment wins).

### 3.2 `workers/celery_app.py`

**`celery_app = Celery(...)`**
- Defines worker app name `synthetic_data_workers`.
- Uses Redis URLs from `Config`.
- `include=["workers.tasks.orchestrator", "workers.tasks.fiction_processor"]`.
	- Note: `academic_processor` is referenced by orchestrator but not listed in `include`.

**`celery_app.conf.update(...)`**
- JSON serializers.
- `task_acks_late=True`, `worker_prefetch_multiplier=1`.
- Long time limits (soft 5h, hard 6h).

### 3.3 `workers/models.py` (data contracts)

Key classes:
- `TaskDocument`: `{id, file_size}`
- `TaskData`: `{task_id, project_id, documents, data_type}`
- `FileMetadata`: returned by Web API internal metadata endpoint.
- Chunk models:
	- `ContextChunk` (parent chunk, with `child_indices` list)
	- `ChildChunk` (child chunk)
	- `ContextualizedChildChunk` (child chunk after LLM context)
- Vector models:
	- `SparseVector` for BM25/hybrid search

### 3.4 `workers/enums.py`

- `ProcessingStage`: used for pipeline stage tracking in logs + failure reporting.
- `DataCategory`: `fiction` or `academic`.

### 3.5 `workers/tasks/orchestrator.py`

**`ProcessDocumentsTask` (Celery Task base)**
- Configures automatic retry behavior:
	- `max_retries=3`, exponential backoff + jitter.

**`process_documents(self, task_data_dict)`**
- Celery task entrypoint (sync function).
- Parses payload dict into `TaskData`.
- Gets event loop and runs `_process_documents_async(self, task_data)`.

**`_process_documents_async(task, task_data)`**
- Selects processor:
	- If `task_data.data_type == "fiction"` → `FictionProcessor()`
	- If `task_data.data_type == "academic"` → `AcademicProcessor()`
- Iterates documents, calls `await processor.process_document(...)`.
- On error:
	- adds failure result entry
	- re-raises unless max retries reached (to trigger Celery retries)
- Returns summary dict.

### 3.6 `workers/tasks/fiction_processor.py`

`FictionProcessor.__init__()` constructs all per-document services:
- `FileFetcherService` → downloads files from Web API
- `TextExtractorService` → PDF → text
- `ChunkingService` → hierarchical chunking via Chonkie
- `Contextualizer` → OpenAI contextualization of child chunks
- `EmbeddingService` → OpenAI embedding calls
- `BM25Service` → sparse vectors
- `StorageService` → Qdrant upsert
- `TempFileManager` → temp storage per task
- `WebhookNotifier` → notify Web API

**`process_document(task_id, document, project_id)`**
Pipeline stages (with direct call relationships):

1) **FETCHING_FILES**
- `TempFileManager.get_file_path(task_id, f"{document_id}.pdf")`
- `await FileFetcherService.fetch_file(document_id, save_path)`
	- makes HTTP calls to Web API internal endpoints (see 3.8)

2) **EXTRACTING_TEXT**
- `TextExtractorService.extract_text_from_pdf(file_path)`
	- uses PyMuPDF (`fitz.open`, `page.get_text()`)

3) **CHUNKING**
- `ChunkingService.create_hierarchical_chunks(extracted_text)`
	- returns `(context_chunks, child_chunks)`

4) **CONTEXTUALIZING**
- Builds `book_metadata` dict.
- `await Contextualizer.contextualize_hierarchical(context_chunks, child_chunks, book_metadata)`
	- makes OpenAI Chat Completions calls (see 3.10)

5) **GENERATING_EMBEDDINGS**
- Extracts `combined_text` for each contextualized child chunk.
- `await EmbeddingService.generate_embeddings(combined_texts)`
	- makes OpenAI Embeddings API calls

6) **GENERATING_BM25**
- `BM25Service.generate_sparse_vectors_batch(combined_texts)`
	- local hashing tokenization, returns `SparseVector` list

7) **STORING_VECTORS**
- `await StorageService.store_chunks(...)`
	- ensures Qdrant collection exists
	- builds `PointStruct` objects with vectors and payload
	- `client.upsert(...)`

8) **NOTIFYING_COMPLETION**
- Builds `chunks_data` array: `{chunk_index, qdrant_point_id, metadata}`
- `await WebhookNotifier.notify_processing_complete(...)`
	- makes HTTP POST to `/webhooks/processing-complete`

9) **CLEANUP**
- `TempFileManager.cleanup_task_directory(task_id, force=True)`

On exception:
- Calls `WebhookNotifier.notify_processing_failed(task_id, document_id, error_message, stage)`.
- Does not clean up temp files (keeps for debugging).

### 3.7 `workers/tasks/academic_processor.py`

`AcademicProcessor.__init__()` constructs services:
- `FileFetcherService`
- `PDFToMarkdownService` (Marker CLI wrapper)
- `VisionService` (Gemini/OpenAI vision)
- `AcademicChunkingService`
- `Contextualizer`
- `EmbeddingService`
- `BM25Service`
- `StorageService`
- `TempFileManager`
- `WebhookNotifier`

**`process_document(task_id, document, project_id)`**
Implemented steps:

1) Fetch PDF (same pattern as fiction)
- `await file_fetcher.fetch_file(...)`

2) Convert PDF → Markdown
- `PDFToMarkdownService.convert_pdf(pdf_path, output_dir)`
	- runs `marker_single` subprocess
	- locates output markdown and extracted images

3) Caption images with context (if any)
- Parses markdown via `MarkdownChef` to locate image references.
- `await VisionService.caption_images_with_context(markdown_content, images, image_refs)`
	- makes calls to Gemini/OpenAI vision depending on provider.

4) Replace images in markdown
- `_replace_images_with_descriptions(markdown_text, image_descriptions)`
	- regex-replaces `![]()` occurrences with a textual block containing the caption.

5) Academic hierarchical chunking
- `AcademicChunkingService.create_hierarchical_chunks(enriched_markdown)`
	- uses MarkdownChef for tables/code
	- keeps math blocks whole

6) Contextualize + embed + BM25 + store + notify
- The code intends the same pattern as fiction.

Important notes (current code gaps / name mismatches):
- `BM25Service` implements `generate_sparse_vectors_batch`, but AcademicProcessor calls `generate_sparse_vectors`.
- `StorageService` implements `store_chunks`, but AcademicProcessor calls `store_vectors`.
- `WebhookNotifier` implements `notify_processing_complete`/`notify_processing_failed`, but AcademicProcessor calls `notify_completion`.

Because this document is strictly based on the code as written, those call targets do not exist in the current repository snapshot.

### 3.8 `workers/services/file_fetcher.py`

**`fetch_file(document_id, save_path)`**
- Calls `_get_file_metadata(document_id)` → `GET {WEB_API_BASE_URL}/internal/files/{id}/metadata`.
- Uses `metadata.should_stream` to choose download mode:
	- `_fetch_via_stream` → `GET /internal/files/{id}/stream` (stream response)
	- `_fetch_via_base64` → `GET /internal/files/{id}/base64` (base64 JSON)
- Writes bytes to `save_path`.

**`_get_file_metadata`**
- Parses JSON into `workers.models.FileMetadata`.

**`_fetch_via_base64`**
- Decodes base64 and writes to disk.

**`_fetch_via_stream`**
- Streams 8KB chunks and writes to disk.

### 3.9 `workers/services/text_extractor.py`

**`extract_text_from_pdf(pdf_path)`**
- Opens PDF via `fitz.open`.
- For each page: `page.get_text()`.
- Concatenates with newlines.

**`get_page_count(pdf_path)`**
- Returns `len(fitz.open(pdf_path))`.

### 3.10 `workers/services/chunking_service_fiction.py`

Uses Chonkie `SentenceChunker` for hierarchical chunking.

**`__init__`**
- Builds:
	- `parent_chunker` with overlap (30k tokens w/ 5k overlap by default)
	- `child_chunker` with overlap (800 tokens w/ 100 overlap)

**`create_hierarchical_chunks(text)`**
- Parent chunking: `parent_chunker.chunk(text)`.
- Child chunking per parent: `child_chunker.chunk_batch(parent_texts)`.
- Builds:
	- `ContextChunk` list (parent chunks)
	- `ChildChunk` list (global index across all parents)
- Populates `ContextChunk.child_indices` so contextualizer can quickly map parent→children.

**`chunk_text(text)`**
- Deprecated legacy chunking; uses child chunker directly and returns `Chunk` list.

**`get_chunker_metadata()`**
- Returns configuration summary.

### 3.11 `workers/services/chunking_service_academic.py`

Academic chunking pre-segments content types to avoid splitting tables/code/math poorly.

**`create_hierarchical_chunks(enriched_markdown)`**
- Parses markdown with `MarkdownChef` to find tables and code blocks.
- Extracts math blocks using regex for `$$ ... $$`.
- Builds parent chunks with overlap using `SentenceChunker`.
- For each parent chunk range:
	- Builds a list of segments (text/table/code/math) within that range.
	- Chunks each segment with the appropriate chunker:
		- text: `SentenceChunker` no overlap
		- table: `TableChunker` by rows
		- code: `CodeChunker` by tokens
		- math: kept whole
- Emits `ContextChunk` + `ChildChunk` with `child_indices` mapping.

Helper methods:
- `_extract_math_blocks(markdown)`
- `_chunk_parent_chunks(text)`
- `_chunk_child_chunks_smart(markdown, parent_chunks, doc, math_blocks)`
- `_build_segments_for_range(markdown, range_start, range_end, doc, math_blocks)`
- `_overlaps_range(...)`
- `get_chunker_metadata()`

### 3.12 `workers/services/contextualizer.py`

**Purpose**: for each child chunk, generate a concise context description using its parent context.

**`__init__`**
- Creates `openai.AsyncOpenAI` client.
- Applies concurrency limit via `asyncio.Semaphore`.

**`contextualize_hierarchical(context_chunks, child_chunks, book_metadata)`**
- Builds `child_by_index` dict for O(1) lookup.
- For each parent `ContextChunk`:
	- Collects `ChildChunk` objects via the `child_indices` list.
	- Batches children (size = `Config.LLM_MAX_CHUNKS_PER_BATCH`).
	- Schedules `_contextualize_batch_with_retry(...)` tasks.
- Runs tasks concurrently with `asyncio.gather(..., return_exceptions=True)`.
- Flattens results into a list of `ContextualizedChildChunk`.

**`_contextualize_batch_with_retry(...)`**
- Retries `_contextualize_batch(...)` up to 3 times with exponential backoff.

**`_contextualize_batch(parent_text, children, context_id, book_metadata)`**
- Builds prompt via `_build_hierarchical_prompt(...)`.
- Calls OpenAI structured output parsing:
	- `client.beta.chat.completions.parse(..., response_format=ContextualOutput)`
- Produces `ContextualizedChildChunk` items with:
	- `context_description`
	- `combined_text = context_description + "\n\n" + original_text`
	- `metadata=book_metadata`

**`_build_hierarchical_prompt(...)`**
- Constructs a prompt including:
	- book/paper title
	- truncated parent context (max 15000 chars)
	- all child chunks in the batch
	- constraints for the context descriptions

### 3.13 `workers/services/embedding_service.py`

**`generate_embeddings(texts)`**
- Batches input by `Config.EMBEDDING_BATCH_SIZE`.
- Calls `client.embeddings.create(model=..., input=batch)`.
- Returns list of embedding vectors (list of floats).

**`generate_single_embedding(text)`**
- Same API but for one string.

### 3.14 `workers/services/bm25_service.py`

**`generate_sparse_vector(text)`**
- Tokenizes with `text.lower().split()`.
- Hashes each token to an integer index.
- Builds frequencies, normalizes by max frequency.
- Returns `SparseVector(indices, values)`.

**`generate_sparse_vectors_batch(texts)`**
- Calls `generate_sparse_vector` per text.

### 3.15 `workers/services/storage_service.py`

**`__init__`**
- Creates `QdrantClient(url=Config.QDRANT_URL)`.
- Stores collection names and embedding dimension.

**`ensure_collection_exists(collection_name)`**
- Checks existing collections.
- If missing, creates a collection with:
	- Dense vector: cosine distance, size = embedding dimension.
	- Sparse vector: modifier IDF.

**`store_chunks(chunks, dense_vectors, sparse_vectors, document_id, project_id, book_metadata?, data_category="fiction")`**
- Chooses collection based on `data_category`.
- Ensures collection exists.
- For each chunk:
	- Creates a UUID `point_id`.
	- Creates payload:
		- `original_text`, `context_description`, `combined_text`
		- `document_id`, `project_id`, `chunk_index`, `parent_context_id`
		- `start_index`, `end_index`, `token_count`
		- `metadata`
		- optionally `book_metadata`
	- Builds a Qdrant `PointStruct` containing both `dense` and `sparse` vectors.
- Calls `client.upsert(collection_name, points)`.
- Returns the created `point_ids` list.

**`delete_document_chunks(document_id, data_category="fiction")`**
- Deletes all points from the chosen collection with payload filter `document_id == ...`.

### 3.16 `workers/utils/temp_file_manager.py`

**`get_task_directory(task_id)`**
- Creates `{TEMP_FILE_DIR}/{task_id}/`.

**`get_file_path(task_id, filename)`**
- Returns full path under the task directory.

**`cleanup_task_directory(task_id, force=False)`**
- If `force=True`, deletes directory immediately.
- Else, deletes only if directory age exceeds retention hours.

**`cleanup_old_directories()`**
- Iterates task directories and removes old ones.

### 3.17 `workers/utils/webhook_notifier.py`

**`notify_processing_complete(...)`**
- POSTs JSON to `{WEB_API_BASE_URL}/webhooks/processing-complete`.
- Payload matches the webhook router model:
	- `task_id`, `document_id`, `project_id`, `status`
	- `chunks_processed`, `total_chunks`, `chunks_data`
	- `error_message`, `completed_at`
- Errors are logged but do not fail the task.

**`notify_processing_failed(task_id, document_id, error_message, stage)`**
- POSTs JSON to `{WEB_API_BASE_URL}/webhooks/processing-failed`.
- Errors are logged but do not fail the task.

### 3.18 `workers/services/pdf_to_markdown.py`

**`PDFToMarkdownService.convert_pdf(pdf_path, output_dir)`**
- Runs Marker CLI via subprocess:
	- command starts with `marker_single <pdf> --output_dir <dir> --output_format <format>`
	- optionally adds: `--use_llm`, `--force_ocr`, `--redo_inline_math`
	- may pass `--gemini_api_key` if configured
- Locates markdown output file.
- Finds extracted images by scanning for image file extensions.
- Returns `MarkdownOutput(markdown_text, markdown_path, images, metadata)`.

### 3.19 `workers/services/vision_service.py`

**`caption_images_with_context(markdown_content, images, image_refs)`**
- Builds `image_map` and `ref_map` (filename → markdown position).
- For each image:
	- extracts surrounding markdown context with `_extract_image_context`.
	- runs `_caption_single_image` concurrently.
- Returns dict `{filename: caption}`.

**`_caption_single_image(image_path, context, filename)`**
- Uses a semaphore for concurrency.
- Delegates to provider-specific method:
	- `_caption_gemini` or `_caption_openai`.
- On errors returns a failure string.

**`_caption_gemini(image_path, context)`**
- Loads image via PIL.
- Calls Gemini synchronous SDK in a thread via `asyncio.to_thread`.

**`_caption_openai(image_path, context)`**
- Base64 encodes image bytes.
- Sends Chat Completions request with an `image_url` message.

---

## 4) Infrastructure & external dependencies

### 4.1 Docker services (`docker-compose.yml`)
- `redis` on `6379`
- `qdrant` on `6333` (HTTP) and `6334` (gRPC)
- `flower` on `5555`
- MongoDB is not started here (commented out; expected external).

### 4.2 External APIs / tools used

- **OpenAI**
	- Chat Completions (contextualization)
	- Embeddings (dense vectors)
- **Gemini** (optional)
	- Vision captioning
	- Marker CLI (if `--use_llm`)
- **Marker CLI (`marker_single`)**
	- Academic PDF → Markdown + extracted images
- **PyMuPDF (`fitz`)**
	- Fiction PDF text extraction
- **Qdrant**
	- Hybrid storage (dense + sparse)

---

## 5) Known wiring gaps / inconsistencies (as seen in this snapshot)

These are not “fix recommendations” here; they are observations of mismatches between modules that impact how calls resolve.

1) **Routers not mounted**
- `web_api/main.py` currently mounts only File + Project routers.
- Workers require Internal + Webhook routers.
- Processing trigger requires Processing router.

2) **Beanie model registration**
- `ChunkModel` exists and is used by webhook inserts.
- `web_api/database.init_db()` does not register `ChunkModel`.

3) **Data type spelling mismatch**
- Web API enum value: `Datatype.ACADAMIC = "acdamic"`.
- Workers expect `"academic"`.
- Orchestrator selects processor based on `DataCategory.ACADEMIC.value == "academic"`.

4) **Academic pipeline method name mismatches**
- AcademicProcessor calls methods not defined in current classes:
	- `BM25Service.generate_sparse_vectors` (only `generate_sparse_vectors_batch` exists)
	- `StorageService.store_vectors` (only `store_chunks` exists)
	- `WebhookNotifier.notify_completion` (only `notify_processing_complete`/`notify_processing_failed` exist)

5) **Some docs appear ahead of code**
- `SETUP_GUIDE.md` describes router wiring and Beanie model registration steps that are not reflected in `web_api/main.py` and `web_api/database.py` in this snapshot.

---

## 6) Quick reference: network/API surface

### 6.1 Web API (client-facing)
- `/projects/*` (create/get/list/update/delete)
- `/files/*` (upload, list, get, delete)
- `/processing/start` (enqueue Celery)
- `/processing/status/{task_id}` (poll Celery)

### 6.2 Web API (worker-facing)
- `/internal/files/{document_id}/metadata`
- `/internal/files/{document_id}/base64`
- `/internal/files/{document_id}/stream`
- `/webhooks/processing-complete`
- `/webhooks/processing-failed`

### 6.3 Worker outputs
- Qdrant collections:
	- `fiction_chunks` (default)
	- `academic_chunks` (default)

