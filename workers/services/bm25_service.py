"""
Service for generating BM25 sparse vectors using Qdrant's built-in tokenizer.
"""

from typing import List
from workers.models import SparseVector
import logging

logger = logging.getLogger(__name__)


class BM25Service:
    """
    Service for generating BM25 sparse vectors.
    Uses Qdrant's built-in tokenizer (simple whitespace + lowercase).
    """
    
    def __init__(self):
        logger.info("Initialized BM25 service (using Qdrant built-in tokenizer)")
    
    def generate_sparse_vector(self, text: str) -> SparseVector:
        """
        Generate BM25-compatible sparse vector for a single text.
        
        Qdrant will handle the actual BM25 scoring internally.
        We just need to provide a simple tokenized representation.
        
        Args:
            text: Text to vectorize
            
        Returns:
            SparseVector object
            
        Note:
            Qdrant's sparse vector with modifier="idf" will automatically
            compute BM25 scores. We just provide token indices and frequencies.
        """
        # Simple tokenization (lowercase + split on whitespace)
        tokens = text.lower().split()
        
        # Build vocabulary and count frequencies
        token_freqs = {}
        for token in tokens:
            # Use hash of token as index (simple approach)
            # In production, you might want a consistent vocabulary
            token_hash = hash(token) % (2**31)  # Keep positive
            token_freqs[token_hash] = token_freqs.get(token_hash, 0) + 1
        
        # Convert to sparse vector format
        indices = list(token_freqs.keys())
        values = list(token_freqs.values())
        
        # Normalize values (term frequency)
        max_freq = max(values) if values else 1
        normalized_values = [v / max_freq for v in values]
        
        return SparseVector(
            indices=indices,
            values=normalized_values
        )
    
    def generate_sparse_vectors_batch(self, texts: List[str]) -> List[SparseVector]:
        """
        Generate sparse vectors for multiple texts.
        
        Args:
            texts: List of texts
            
        Returns:
            List of SparseVector objects
        """
        return [self.generate_sparse_vector(text) for text in texts]
