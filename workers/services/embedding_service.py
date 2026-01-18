"""
Service for generating embeddings.
"""

from typing import List
from openai import AsyncOpenAI
from workers.config import Config
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.EMBEDDING_MODEL
        self.dimension = Config.EMBEDDING_DIMENSION
        self.batch_size = Config.EMBEDDING_BATCH_SIZE
        
        logger.info(f"Initialized embedding service with model {self.model}")
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        Automatically batches requests.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            
            logger.info(f"Generating embeddings for batch {i//self.batch_size + 1} ({len(batch)} texts)")
            
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch
            )
            
            # Extract embeddings in order
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        logger.info(f"Generated {len(all_embeddings)} embeddings")
        return all_embeddings
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        response = await self.client.embeddings.create(
            model=self.model,
            input=[text]
        )
        
        return response.data[0].embedding
