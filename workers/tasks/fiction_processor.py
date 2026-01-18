
from workers.models import TaskDocument
from workers.services.file_fetcher import FileFetcherService
from workers.services.text_extractor import TextExtractorService
from workers.services.chapter_detector import ChapterDetectorService
from workers.services.chunking_service import ChunkingService
from workers.services.contextualizer import Contextualizer
from workers.services.embedding_service import EmbeddingService
from workers.services.bm25_service import BM25Service
from workers.services.storage_service import StorageService
from workers.utils.temp_file_manager import TempFileManager
from workers.utils.webhook_notifier import WebhookNotifier
from workers.enums import ProcessingStage
import logging

logger = logging.getLogger(__name__)


class FictionProcessor:
    
    def __init__(self):
        self.file_fetcher = FileFetcherService()
        self.text_extractor = TextExtractorService()
        self.chapter_detector = ChapterDetectorService()
        self.chunking_service = ChunkingService()
        self.contextualizer = Contextualizer()
        self.embedding_service = EmbeddingService()
        self.bm25_service = BM25Service()
        self.storage_service = StorageService()
        self.temp_file_manager = TempFileManager()
        self.webhook_notifier = WebhookNotifier()
    
    async def process_document(
        self,
        task_id: str,
        document: TaskDocument,
        project_id: str
    ) -> dict:

        document_id = document.id
        current_stage = ProcessingStage.FETCHING_FILES
        
        try:
            # ===== 1. Fetch File =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.FETCHING_FILES.value}")
            current_stage = ProcessingStage.FETCHING_FILES
            
            file_path = self.temp_file_manager.get_file_path(
                task_id,
                f"{document_id}.pdf"
            )
            
            file_metadata = await self.file_fetcher.fetch_file(
                document_id=document_id,
                save_path=file_path
            )
            
            # ===== 2. Extract Text =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.EXTRACTING_TEXT.value}")
            current_stage = ProcessingStage.EXTRACTING_TEXT
            
            extracted_text = self.text_extractor.extract_text_from_pdf(file_path)
            
            if not extracted_text.strip():
                raise ValueError("Extracted text is empty")
            
            # ===== 3. Detect Chapters =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.DETECTING_CHAPTERS.value}")
            current_stage = ProcessingStage.DETECTING_CHAPTERS
            
            chapters = self.chapter_detector.detect_chapters(extracted_text)
            
            # ===== 4. Chunk Text =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.CHUNKING.value}")
            current_stage = ProcessingStage.CHUNKING
            
            all_chunks = self.chunking_service.chunk_text(extracted_text)
            
            # ===== 5. Contextualize Chunks =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.CONTEXTUALIZING.value}")
            current_stage = ProcessingStage.CONTEXTUALIZING
            
            book_metadata = {
                "title": file_metadata.filename,
                "document_id": document_id,
                "project_id": project_id
            }
            
            contextualized_chunks = await self.contextualizer.contextualize_chapters(
                chapters=chapters,
                all_chunks=all_chunks,
                book_metadata=book_metadata
            )
            
            # ===== 6. Generate Embeddings =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.GENERATING_EMBEDDINGS.value}")
            current_stage = ProcessingStage.GENERATING_EMBEDDINGS
            
            # Embed contextualized text
            contextualized_texts = [chunk.contextualized_text for chunk in contextualized_chunks]
            dense_vectors = await self.embedding_service.generate_embeddings(contextualized_texts)
            
            # ===== 7. Generate BM25 Sparse Vectors =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.GENERATING_BM25.value}")
            current_stage = ProcessingStage.GENERATING_BM25
            
            # Use original text for BM25 (better keyword matching)
            original_texts = [chunk.original_text for chunk in contextualized_chunks]
            sparse_vectors = self.bm25_service.generate_sparse_vectors_batch(original_texts)
            
            # ===== 8. Store in Qdrant =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.STORING_VECTORS.value}")
            current_stage = ProcessingStage.STORING_VECTORS
            
            point_ids = await self.storage_service.store_chunks(
                chunks=contextualized_chunks,
                dense_vectors=dense_vectors,
                sparse_vectors=sparse_vectors,
                document_id=document_id,
                project_id=project_id,
                book_metadata=book_metadata,
                data_category="fiction"
            )
            
            # ===== 9. Notify Web API =====
            logger.info(f"[{document_id}] Stage: {ProcessingStage.NOTIFYING_COMPLETION.value}")
            current_stage = ProcessingStage.NOTIFYING_COMPLETION
            
            # Prepare chunks data for webhook
            chunks_data = [
                {
                    "chunk_index": chunk.index,
                    "qdrant_point_id": point_id,
                    "metadata": chunk.metadata
                }
                for chunk, point_id in zip(contextualized_chunks, point_ids)
            ]
            
            await self.webhook_notifier.notify_processing_complete(
                task_id=task_id,
                document_id=document_id,
                project_id=project_id,
                status="completed",
                chunks_processed=len(contextualized_chunks),
                total_chunks=len(contextualized_chunks),
                chunks_data=chunks_data
            )
            
            # ===== 10. Cleanup =====
            logger.info(f"[{document_id}] Cleaning up temp files")
            self.temp_file_manager.cleanup_task_directory(task_id, force=True)
            
            logger.info(f"[{document_id}] Processing completed successfully")
            
            return {
                "status": "completed",
                "document_id": document_id,
                "chunks_processed": len(contextualized_chunks),
                "chapters_detected": len(chapters)
            }
            
        except Exception as e:
            logger.error(f"[{document_id}] Processing failed at stage {current_stage.value}: {str(e)}")
            
            # Notify web_api of failure
            await self.webhook_notifier.notify_processing_failed(
                task_id=task_id,
                document_id=document_id,
                error_message=str(e),
                stage=current_stage.value
            )
            
            # Keep temp files for debugging
            logger.info(f"[{document_id}] Keeping temp files for debugging")
            
            raise
