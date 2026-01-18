"""
Abstract base class for chunking strategies.
"""

from abc import ABC, abstractmethod
from typing import List
from workers.models import Chunk


class ChunkingStrategy(ABC):
    
    
    def __init__(self, chunk_size: int, chunk_overlap: int):

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    @abstractmethod
    def chunk_text(self, text: str) -> List[Chunk]:

        pass
    
    @abstractmethod
    def get_metadata(self) -> dict:

        pass
