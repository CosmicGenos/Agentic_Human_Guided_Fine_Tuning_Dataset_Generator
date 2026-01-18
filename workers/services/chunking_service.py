
from typing import List, Tuple
from workers.models import Chunk, ContextChunk, ChildChunk
from workers.config import Config
import logging

logger = logging.getLogger(__name__)


class ChunkingService:
    """
    Hierarchical chunking service using Chonkie.
    Creates two levels:
    - Parent chunks (30k tokens) for LLM contextualization
    - Child chunks (800 tokens) for retrieval/embedding
    """
    
    def __init__(
        self,
        parent_chunk_size=None,
        parent_overlap=None,
        child_chunk_size=None,
        child_overlap=None
    ):
        from chonkie import SentenceChunker
        
        self.parent_chunk_size = parent_chunk_size or Config.PARENT_CHUNK_SIZE
        self.parent_overlap = parent_overlap or Config.PARENT_CHUNK_OVERLAP
        
        self.parent_chunker = SentenceChunker(
            tokenizer=Config.CHONKIE_TOKENIZER,
            chunk_size=self.parent_chunk_size,
            chunk_overlap=self.parent_overlap,
            min_sentences_per_chunk=Config.CHONKIE_MIN_SENTENCES
        )
        
        self.child_chunk_size = child_chunk_size or Config.CHILD_CHUNK_SIZE
        self.child_overlap = child_overlap or Config.CHILD_CHUNK_OVERLAP
        
        self.child_chunker = SentenceChunker(
            tokenizer=Config.CHONKIE_TOKENIZER,
            chunk_size=self.child_chunk_size,
            chunk_overlap=self.child_overlap,
            min_sentences_per_chunk=Config.CHONKIE_MIN_SENTENCES
        )
        
        logger.info(
            f"Initialized hierarchical chunking: "
            f"Parent={self.parent_chunk_size}/{self.parent_overlap}t, "
            f"Child={self.child_chunk_size}/{self.child_overlap}t"
        )
    
    def create_hierarchical_chunks(self, text: str) -> Tuple[List[ContextChunk], List[ChildChunk]]:
       
        logger.info(f"Creating hierarchical chunks for {len(text):,} characters")

        parent_chonkie_chunks = self.parent_chunker.chunk(text)
        logger.info(f"Created {len(parent_chonkie_chunks)} parent chunks")
        
        parent_texts = [chunk.text for chunk in parent_chonkie_chunks]
        child_chunks_per_parent = self.child_chunker.chunk_batch(parent_texts)
        
        total_children = sum(len(children) for children in child_chunks_per_parent)
        logger.info(f"Created {total_children} total child chunks")
        
        context_chunks = []
        for idx, parent_chunk in enumerate(parent_chonkie_chunks):
            context_chunks.append(ContextChunk(
                context_id=idx,
                text=parent_chunk.text,
                token_count=parent_chunk.token_count,
                start_index=parent_chunk.start_index,
                end_index=parent_chunk.end_index,
                child_indices=[] 
            ))
        
        child_chunks = []
        global_child_index = 0
        
        for parent_id, children in enumerate(child_chunks_per_parent):
            for child_chunk in children:
                child_chunks.append(ChildChunk(
                    index=global_child_index,
                    parent_context_id=parent_id,
                    original_text=child_chunk.text,
                    start_index=child_chunk.start_index,
                    end_index=child_chunk.end_index,
                    token_count=child_chunk.token_count
                ))
                
                context_chunks[parent_id].child_indices.append(global_child_index)
                global_child_index += 1
        
        logger.info(
            f"Hierarchical chunking complete: "
            f"{len(context_chunks)} parents, {len(child_chunks)} children"
        )
        
        return context_chunks, child_chunks
    
    def chunk_text(self, text: str) -> List[Chunk]:
        
        logger.warning("Using deprecated chunk_text() method. Use create_hierarchical_chunks() instead.")
        
        chonkie_chunks = self.child_chunker.chunk(text)
        
        chunks = [
            Chunk(
                index=idx,
                text=chunk.text,
                start_char=chunk.start_index,
                end_char=chunk.end_index,
                token_count=chunk.token_count,
                metadata=None
            )
            for idx, chunk in enumerate(chonkie_chunks)
        ]
        
        logger.info(f"Created {len(chunks)} chunks (legacy mode)")
        return chunks
    
    def get_chunker_metadata(self) -> dict:
        """Get metadata about chunking configuration"""
        return {
            "service": "hierarchical_chonkie",
            "parent": {
                "chunk_size": self.parent_chunk_size,
                "overlap": self.parent_overlap,
                "tokenizer": Config.CHONKIE_TOKENIZER
            },
            "child": {
                "chunk_size": self.child_chunk_size,
                "overlap": self.child_overlap,
                "tokenizer": Config.CHONKIE_TOKENIZER
            }
        }

