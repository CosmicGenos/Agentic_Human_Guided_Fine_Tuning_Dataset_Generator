
import re
from typing import List
import tiktoken
from workers.models import Chapter
from workers.config import Config
import logging

logger = logging.getLogger(__name__)


class ChapterDetectorService:
    
    def __init__(self):
        self.patterns = [re.compile(pattern, re.MULTILINE) for pattern in Config.CHAPTER_PATTERNS]
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
    
    def detect_chapters(self, text: str) -> List[Chapter]:
        
        chapters = self._detect_with_regex(text)
        
        if not chapters:
            logger.warning("No chapters detected with regex, using fixed windows")
            chapters = self._create_fixed_windows(text)
        
        logger.info(f"Detected {len(chapters)} chapters")
        return chapters
    
    def _detect_with_regex(self, text: str) -> List[Chapter]:
        chapter_positions = []
   
        for pattern in self.patterns:
            for match in pattern.finditer(text):
                chapter_positions.append({
                    "pos": match.start(),
                    "title": match.group().strip()
                })
        
        if not chapter_positions:
            return []

        chapter_positions.sort(key=lambda x: x["pos"])
        
        chapters = []
        for idx, chapter_info in enumerate(chapter_positions):
            start_pos = chapter_info["pos"]

            if idx + 1 < len(chapter_positions):
                end_pos = chapter_positions[idx + 1]["pos"]
            else:
                end_pos = len(text)
            
            chapter_text = text[start_pos:end_pos]
            token_count = len(self.tokenizer.encode(chapter_text))
            
            chapter = Chapter(
                chapter_number=idx + 1,
                title=chapter_info["title"],
                start_char=start_pos,
                end_char=end_pos,
                text=chapter_text,
                token_count=token_count
            )
            chapters.append(chapter)
        
        return chapters
    
    def _create_fixed_windows(
        self,
        text: str,
        target_tokens: int = 50_000
    ) -> List[Chapter]:
       
        total_tokens = len(self.tokenizer.encode(text))
        
        if total_tokens <= target_tokens:
            return [Chapter(
                chapter_number=1,
                title=None,
                start_char=0,
                end_char=len(text),
                text=text,
                token_count=total_tokens
            )]
        
        chars_per_window = target_tokens * 4
        
        chapters = []
        chapter_num = 1
        start_pos = 0
        
        while start_pos < len(text):
            end_pos = min(start_pos + chars_per_window, len(text))

            if end_pos < len(text):
                search_start = end_pos - int(chars_per_window * 0.2)
                paragraph_break = text.rfind("\n\n", search_start, end_pos)
                
                if paragraph_break != -1:
                    end_pos = paragraph_break
            
            window_text = text[start_pos:end_pos]
            token_count = len(self.tokenizer.encode(window_text))
            
            chapter = Chapter(
                chapter_number=chapter_num,
                title=f"Section {chapter_num}",
                start_char=start_pos,
                end_char=end_pos,
                text=window_text,
                token_count=token_count
            )
            chapters.append(chapter)
            
            chapter_num += 1
            start_pos = end_pos
        
        return chapters
