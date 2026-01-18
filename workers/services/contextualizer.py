"""
Service for contextualizing chunks using LLM.
"""

import asyncio
from typing import List
from openai import AsyncOpenAI
from workers.models import Chunk, ContextualizedChunk, ContextualOutput, Chapter
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
    
    async def contextualize_chapters(
        self,
        chapters: List[Chapter],
        all_chunks: List[Chunk],
        book_metadata: dict = None
    ) -> List[ContextualizedChunk]:
       
        chapter_chunks_map = self._map_chunks_to_chapters(chapters, all_chunks)
        
        # Create tasks for each chapter
        tasks = []
        for chapter in chapters:
            chunks_for_chapter = chapter_chunks_map.get(chapter.chapter_number, [])
            if not chunks_for_chapter:
                continue
            
            task = self._contextualize_chapter(
                chapter=chapter,
                chunks=chunks_for_chapter,
                book_metadata=book_metadata
            )
            tasks.append(task)
        
        # Run in parallel with semaphore limiting concurrency
        logger.info(f"Processing {len(tasks)} chapters in parallel (max {self.max_concurrent} concurrent)")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results and handle errors
        contextualized_chunks = []
        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Chapter {chapters[idx].chapter_number} failed: {str(result)}")
                # Use original chunks as fallback
                chunks_for_chapter = chapter_chunks_map.get(chapters[idx].chapter_number, [])
                for chunk in chunks_for_chapter:
                    contextualized_chunks.append(ContextualizedChunk(
                        index=chunk.index,
                        original_text=chunk.text,
                        contextualized_text=chunk.text,  # Fallback: use original
                        metadata=chunk.metadata
                    ))
            else:
                contextualized_chunks.extend(result)
        
        # Sort by index
        contextualized_chunks.sort(key=lambda x: x.index)
        
        logger.info(f"Contextualized {len(contextualized_chunks)} chunks total")
        return contextualized_chunks
    
    async def _contextualize_chapter(
        self,
        chapter: Chapter,
        chunks: List[Chunk],
        book_metadata: dict = None
    ) -> List[ContextualizedChunk]:
        """
        Contextualize chunks for a single chapter.
        Batches chunks if chapter has many chunks.
        
        Args:
            chapter: Chapter object
            chunks: Chunks belonging to this chapter
            book_metadata: Optional book metadata
            
        Returns:
            List of ContextualizedChunk objects
        """
        # Check if chapter fits in context window
        if chapter.token_count > self.max_context_tokens:
            logger.warning(
                f"Chapter {chapter.chapter_number} ({chapter.token_count} tokens) "
                f"exceeds max context ({self.max_context_tokens}). Splitting..."
            )
            # TODO: Implement chapter splitting
            # For now, truncate
            pass
        
        # Batch chunks if too many
        contextualized_chunks = []
        for i in range(0, len(chunks), self.max_chunks_per_batch):
            batch = chunks[i:i + self.max_chunks_per_batch]
            
            batch_result = await self._contextualize_batch_with_retry(
                chapter_text=chapter.text,
                chunks=batch,
                chapter_number=chapter.chapter_number,
                chapter_title=chapter.title,
                book_metadata=book_metadata
            )
            
            contextualized_chunks.extend(batch_result)
        
        return contextualized_chunks
    
    async def _contextualize_batch_with_retry(
        self,
        chapter_text: str,
        chunks: List[Chunk],
        chapter_number: int,
        chapter_title: str = None,
        book_metadata: dict = None,
        max_retries: int = 3
    ) -> List[ContextualizedChunk]:
        """
        Contextualize a batch of chunks with retry logic.
        
        Args:
            chapter_text: Full chapter text (context)
            chunks: List of chunks to contextualize
            chapter_number: Chapter number
            chapter_title: Optional chapter title
            book_metadata: Optional book metadata
            max_retries: Maximum retry attempts
            
        Returns:
            List of ContextualizedChunk objects
        """
        for attempt in range(max_retries):
            try:
                return await self._contextualize_batch(
                    chapter_text=chapter_text,
                    chunks=chunks,
                    chapter_number=chapter_number,
                    chapter_title=chapter_title,
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
                    logger.error(f"All retry attempts failed for chapter {chapter_number}")
                    raise
    
    async def _contextualize_batch(
        self,
        chapter_text: str,
        chunks: List[Chunk],
        chapter_number: int,
        chapter_title: str = None,
        book_metadata: dict = None
    ) -> List[ContextualizedChunk]:
        """
        Contextualize a batch of chunks using LLM.
        Uses semaphore to limit concurrent API calls.
        
        Args:
            chapter_text: Full chapter text (context)
            chunks: List of chunks to contextualize
            chapter_number: Chapter number
            chapter_title: Optional chapter title
            book_metadata: Optional book metadata
            
        Returns:
            List of ContextualizedChunk objects
        """
        # Build prompt
        prompt = self._build_prompt(
            chapter_text=chapter_text,
            chunks=chunks,
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            book_metadata=book_metadata
        )
        
        # Call LLM with semaphore
        async with self.semaphore:
            logger.info(f"Sending {len(chunks)} chunks for contextualization (Chapter {chapter_number})")
            
            response = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that adds context to text chunks."
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
        
        # Validate output
        if len(result.contextual_chunks) != len(chunks):
            logger.warning(
                f"LLM returned {len(result.contextual_chunks)} chunks, expected {len(chunks)}. "
                "Filling missing with original text."
            )
            # Pad with original text
            while len(result.contextual_chunks) < len(chunks):
                result.contextual_chunks.append(chunks[len(result.contextual_chunks)].text)
        
        # Create ContextualizedChunk objects
        contextualized = []
        for idx, chunk in enumerate(chunks):
            contextualized.append(ContextualizedChunk(
                index=chunk.index,
                original_text=chunk.text,
                contextualized_text=result.contextual_chunks[idx],
                metadata={
                    **(chunk.metadata or {}),
                    "chapter": chapter_number,
                    "chapter_title": chapter_title
                }
            ))
        
        return contextualized
    
    def _build_prompt(
        self,
        chapter_text: str,
        chunks: List[Chunk],
        chapter_number: int,
        chapter_title: str = None,
        book_metadata: dict = None
    ) -> str:
        """Build prompt for LLM contextualization"""
        
        book_info = ""
        if book_metadata:
            book_info = f"\nBook: {book_metadata.get('title', 'Unknown')}"
            if 'author' in book_metadata:
                book_info += f" by {book_metadata['author']}"
        
        chapter_info = f"Chapter {chapter_number}"
        if chapter_title:
            chapter_info += f": {chapter_title}"
        
        # Build chunks section
        chunks_text = "\n\n".join([
            f"Chunk {idx + 1}:\n{chunk.text}"
            for idx, chunk in enumerate(chunks)
        ])
        
        prompt = f"""You are analyzing a section of text.{book_info}
{chapter_info}

<context>
{chapter_text[:10000]}...
</context>

<chunks>
{chunks_text}
</chunks>

For each chunk, provide a brief contextualized version that includes:
- What part of the narrative this is from
- Key themes, characters, or events present
- How it relates to the surrounding context

Output a JSON object with a list called "contextual_chunks" containing the contextualized versions in the same order.
Each contextualized chunk should be 1-2 sentences prepended to the original chunk text for better retrieval."""
        
        return prompt
    
    def _map_chunks_to_chapters(
        self,
        chapters: List[Chapter],
        chunks: List[Chunk]
    ) -> dict:
        """
        Map chunks to their respective chapters based on character positions.
        
        Returns:
            Dictionary mapping chapter_number -> List[Chunk]
        """
        chapter_chunks_map = {ch.chapter_number: [] for ch in chapters}
        
        for chunk in chunks:
            # Find which chapter this chunk belongs to
            for chapter in chapters:
                if chapter.start_char <= chunk.start_char < chapter.end_char:
                    chapter_chunks_map[chapter.chapter_number].append(chunk)
                    break
        
        return chapter_chunks_map
