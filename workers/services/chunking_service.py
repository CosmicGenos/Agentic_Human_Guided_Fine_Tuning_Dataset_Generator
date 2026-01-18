
from typing import List
from workers.chunkers.factory import ChunkerFactory
from workers.models import Chunk
from workers.config import Config
import logging

logger = logging.getLogger(__name__)


class ChunkingService:
    
    def __init__(
        self,
        chunker_type=None,
        chunk_size=None,
        chunk_overlap=None
    ):
       
        self.chunker_type = chunker_type or Config.CHUNKER_TYPE
        self.chunk_size = chunk_size or Config.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or Config.CHUNK_OVERLAP
        
        self.chunker = ChunkerFactory.create(
            chunker_type=self.chunker_type,
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
        logger.info(f"Initialized chunking service: {self.chunker.get_metadata()}")
    
    def chunk_text(self, text: str) -> List[Chunk]:

        chunks = self.chunker.chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks from {len(text)} characters")
        return chunks
    
    def get_chunker_metadata(self) -> dict:
        return self.chunker.get_metadata()
