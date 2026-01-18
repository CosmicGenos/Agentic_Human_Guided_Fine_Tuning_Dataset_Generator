
from typing import List
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document as LlamaDocument
import tiktoken
from workers.chunkers.base import ChunkingStrategy
from workers.models import Chunk


class LlamaIndexChunker(ChunkingStrategy):
    
    def __init__(self, chunk_size: int, chunk_overlap: int):
        super().__init__(chunk_size, chunk_overlap)
       
        self.splitter = SentenceSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            paragraph_separator="\n\n",
            secondary_chunking_regex="[.!?]\\s+",  )
        
        self.tokenizer = tiktoken.get_encoding("cl100k_base")  
    
    def chunk_text(self, text: str) -> List[Chunk]:

        llama_doc = LlamaDocument(text=text)

        nodes = self.splitter.get_nodes_from_documents([llama_doc])

        chunks = []
        for idx, node in enumerate(nodes):
            chunk_text = node.get_content()
            token_count = len(self.tokenizer.encode(chunk_text))
            
            chunk = Chunk(
                index=idx,
                text=chunk_text,
                start_char=node.start_char_idx or 0,
                end_char=node.end_char_idx or len(chunk_text),
                token_count=token_count,
                metadata={
                    "node_id": node.node_id,
                }
            )
            chunks.append(chunk)
        
        return chunks
    
    def get_metadata(self) -> dict:
        return {
            "strategy": "llama_index_sentence",
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "tokenizer": "cl100k_base",
        }
