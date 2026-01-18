"""
Service for storing vectors and metadata in Qdrant.
"""

from typing import List
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    SparseVectorParams,
    SparseIndexParams,
    PointStruct,
    SparseVector as QdrantSparseVector,
    Modifier
)
from workers.models import ContextualizedChunk, SparseVector
from workers.config import Config
import logging
import uuid

logger = logging.getLogger(__name__)


class StorageService:
    """Service for storing chunks in Qdrant"""
    
    def __init__(self):
        self.client = QdrantClient(url=Config.QDRANT_URL)
        self.fiction_collection = Config.QDRANT_COLLECTION_FICTION
        self.academic_collection = Config.QDRANT_COLLECTION_ACADEMIC
        self.embedding_dimension = Config.EMBEDDING_DIMENSION
        
        logger.info(f"Initialized storage service, Qdrant URL: {Config.QDRANT_URL}")
    
    async def ensure_collection_exists(self, collection_name: str):
        """
        Ensure Qdrant collection exists with proper configuration.
        
        Args:
            collection_name: Name of collection to create/verify
        """
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            
            if not exists:
                logger.info(f"Creating Qdrant collection: {collection_name}")
                
                # Create collection with both dense and sparse vectors
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config={
                        "dense": VectorParams(
                            size=self.embedding_dimension,
                            distance=Distance.COSINE
                        )
                    },
                    sparse_vectors_config={
                        "sparse": SparseVectorParams(
                            index=SparseIndexParams(
                                on_disk=False  # Keep in memory for speed
                            ),
                            modifier=Modifier.IDF  # Use IDF for BM25-like scoring
                        )
                    }
                )
                
                logger.info(f"Created collection {collection_name}")
            else:
                logger.info(f"Collection {collection_name} already exists")
                
        except Exception as e:
            logger.error(f"Failed to ensure collection exists: {str(e)}")
            raise
    
    async def store_chunks(
        self,
        chunks: List[ContextualizedChunk],
        dense_vectors: List[List[float]],
        sparse_vectors: List[SparseVector],
        document_id: str,
        project_id: str,
        book_metadata: dict = None,
        data_category: str = "fiction"
    ) -> List[str]:
        """
        Store chunks with dense and sparse vectors in Qdrant.
        
        Args:
            chunks: List of contextualized chunks
            dense_vectors: List of dense embedding vectors
            sparse_vectors: List of sparse BM25 vectors
            document_id: Document ID
            project_id: Project ID
            book_metadata: Optional book metadata
            data_category: "fiction" or "academic"
            
        Returns:
            List of Qdrant point IDs
        """
        collection_name = (
            self.fiction_collection if data_category == "fiction"
            else self.academic_collection
        )
        
        # Ensure collection exists
        await self.ensure_collection_exists(collection_name)
        
        # Validate inputs
        if not (len(chunks) == len(dense_vectors) == len(sparse_vectors)):
            raise ValueError(
                f"Mismatched lengths: {len(chunks)} chunks, "
                f"{len(dense_vectors)} dense vectors, "
                f"{len(sparse_vectors)} sparse vectors"
            )
        
        # Build points
        points = []
        point_ids = []
        
        for idx, (chunk, dense_vec, sparse_vec) in enumerate(
            zip(chunks, dense_vectors, sparse_vectors)
        ):
            # Generate unique point ID
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)
            
            # Build payload
            payload = {
                "original_text": chunk.original_text,
                "contextualized_text": chunk.contextualized_text,
                "document_id": document_id,
                "project_id": project_id,
                "chunk_index": chunk.index,
                "metadata": chunk.metadata or {}
            }
            
            # Add book metadata if provided
            if book_metadata:
                payload["book_metadata"] = book_metadata
            
            # Create point
            point = PointStruct(
                id=point_id,
                vector={
                    "dense": dense_vec,
                    "sparse": QdrantSparseVector(
                        indices=sparse_vec.indices,
                        values=sparse_vec.values
                    )
                },
                payload=payload
            )
            
            points.append(point)
        
        # Upload to Qdrant
        logger.info(f"Uploading {len(points)} points to Qdrant collection {collection_name}")
        
        self.client.upsert(
            collection_name=collection_name,
            points=points
        )
        
        logger.info(f"Successfully stored {len(points)} chunks in Qdrant")
        
        return point_ids
    
    async def delete_document_chunks(
        self,
        document_id: str,
        data_category: str = "fiction"
    ):
        """
        Delete all chunks for a document.
        
        Args:
            document_id: Document ID
            data_category: "fiction" or "academic"
        """
        collection_name = (
            self.fiction_collection if data_category == "fiction"
            else self.academic_collection
        )
        
        self.client.delete(
            collection_name=collection_name,
            points_selector={
                "filter": {
                    "must": [
                        {
                            "key": "document_id",
                            "match": {
                                "value": document_id
                            }
                        }
                    ]
                }
            }
        )
        
        logger.info(f"Deleted chunks for document {document_id} from {collection_name}")
