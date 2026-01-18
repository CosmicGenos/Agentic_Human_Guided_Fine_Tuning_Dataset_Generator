"""
Chunker factory for creating chunking strategies.
"""

from workers.enums import ChunkerType
from workers.chunkers.base import ChunkingStrategy
from workers.chunkers.llama_index_chunker import LlamaIndexChunker


class ChunkerFactory:

    @staticmethod
    def create(
        chunker_type: ChunkerType,
        chunk_size: int,
        chunk_overlap: int
    ) -> ChunkingStrategy:
        
        if chunker_type == ChunkerType.LLAMA_INDEX_SENTENCE:
            return LlamaIndexChunker(chunk_size, chunk_overlap)
        elif chunker_type == ChunkerType.LANGCHAIN_RECURSIVE:
            raise NotImplementedError("LangChain chunker not yet implemented")
        elif chunker_type == ChunkerType.CUSTOM_PARAGRAPH:
            raise NotImplementedError("Custom paragraph chunker not yet implemented")
        else:
            raise ValueError(f"Unknown chunker type: {chunker_type}")
