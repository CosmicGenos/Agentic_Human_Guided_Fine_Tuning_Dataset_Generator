"""
Service for contextualizing chunks using LLM.
"""

import asyncio
from typing import List
from openai import AsyncOpenAI
from workers.models import (
 ContextualOutput,ContextChunk, ChildChunk, ContextualizedChildChunk
)
from workers.config import Config
import tiktoken
import logging

logger = logging.getLogger(__name__)


class Contextualizer:
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.LLM_MODEL
        self.temperature = Config.LLM_TEMPERATURE
        self.max_concurrent = Config.LLM_MAX_CONCURRENT_CALLS
        self.max_context_tokens = Config.LLM_MAX_CONTEXT_TOKENS
        self.max_chunks_per_batch = Config.LLM_MAX_CHUNKS_PER_BATCH
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        
        logger.info(f"Initialized contextualizer with model {self.model}, max concurrent: {self.max_concurrent}")
    
    async def contextualize_hierarchical(
        self,
        context_chunks: List[ContextChunk],
        child_chunks: List[ChildChunk],
        book_metadata: dict
    ) -> List[ContextualizedChildChunk]:
       
        logger.info(
            f"Starting hierarchical contextualization: "
            f"{len(context_chunks)} parents, {len(child_chunks)} children"
        )
        
        tasks = []
        
        for context_chunk in context_chunks:

            children_for_context = [
                child for child in child_chunks 
                if child.parent_context_id == context_chunk.context_id
            ]
            
            if not children_for_context:
                continue
            
            for i in range(0, len(children_for_context), self.max_chunks_per_batch):
                batch = children_for_context[i:i + self.max_chunks_per_batch]
                
                task = self._contextualize_batch_with_retry(
                    parent_text=context_chunk.text,
                    children=batch,
                    context_id=context_chunk.context_id,
                    book_metadata=book_metadata
                )
                tasks.append(task)
        
        logger.info(f"Created {len(tasks)} batches for parallel processing")
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_contextualized = []
        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch {idx} failed: {str(result)}")
                continue
            all_contextualized.extend(result)
        
        logger.info(f"Contextualized {len(all_contextualized)} chunks total")
        return all_contextualized
    
    async def _contextualize_batch_with_retry(
        self,
        parent_text: str,
        children: List[ChildChunk],
        context_id: int,
        book_metadata: dict,
        max_retries: int = 3
    ) -> List[ContextualizedChildChunk]:
        
        for attempt in range(max_retries):
            try:
                return await self._contextualize_batch(
                    parent_text=parent_text,
                    children=children,
                    context_id=context_id,
                    book_metadata=book_metadata
                )
            except Exception as e:
                logger.warning(
                    f"Contextualization attempt {attempt + 1}/{max_retries} failed: {str(e)}"
                )
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"All retry attempts failed for context {context_id}")
                    raise
    
    async def _contextualize_batch(
        self,
        parent_text: str,
        children: List[ChildChunk],
        context_id: int,
        book_metadata: dict
    ) -> List[ContextualizedChildChunk]:
        
        prompt = self._build_hierarchical_prompt(parent_text, children, book_metadata)
        
        # Call LLM with semaphore
        async with self.semaphore:
            logger.info(f"Sending {len(children)} chunks for contextualization (Context {context_id})")
            
            response = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You generate concise context descriptions for text chunks."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                response_format=ContextualOutput
            )
            
            result = response.choices[0].message.parsed
        
        if len(result.contextual_chunks) != len(children):
            logger.warning(
                f"LLM returned {len(result.contextual_chunks)} descriptions, expected {len(children)}. "
                "Padding with default descriptions."
            )
            while len(result.contextual_chunks) < len(children):
                result.contextual_chunks.append("Context not available.")
        
        contextualized = []
        for idx, child in enumerate(children):
            context_desc = result.contextual_chunks[idx]
            combined = f"{context_desc}\n\n{child.original_text}"
            
            contextualized.append(ContextualizedChildChunk(
                index=child.index,
                parent_context_id=child.parent_context_id,
                original_text=child.original_text,
                context_description=context_desc,
                combined_text=combined,
                start_index=child.start_index,
                end_index=child.end_index,
                token_count=child.token_count,
                metadata=book_metadata
            ))
        
        return contextualized
    
    def _build_hierarchical_prompt(
        self,
        parent_text: str,
        children: List[ChildChunk],
        book_metadata: dict
    ) -> str:
        
        book_name = book_metadata.get('title', 'Unknown')
        author = book_metadata.get('author', '')
        
        book_info = f"Book: {book_name}"
        if author:
            book_info += f" by {author}"
        
        chunks_text = "\n\n".join([
            f"Chunk {idx + 1}:\n{child.original_text}"
            for idx, child in enumerate(children)
        ])
        
        max_parent_chars = min(len(parent_text), 15000)
        
        prompt = f"""{book_info}

<parent_context>
{parent_text[:max_parent_chars]}{"..." if len(parent_text) > max_parent_chars else ""}
</parent_context>

<child_chunks>
{chunks_text}
</child_chunks>

For each child chunk, generate a concise context description ({Config.CONTEXT_DESCRIPTION_MIN_TOKENS}-{Config.CONTEXT_DESCRIPTION_MAX_TOKENS} tokens) that:
- Identifies what part of the narrative/content this is
- Mentions key themes, characters, or concepts present
- Relates it to the parent context

IMPORTANT: Return ONLY the context descriptions, NOT the original chunk text.
Output a JSON object with "contextual_chunks" array containing the descriptions in the same order.
Each description will be prepended to the original chunk text for better retrieval."""
        
        return prompt
