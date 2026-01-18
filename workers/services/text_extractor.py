
import fitz 
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class TextExtractorService:
    
    def extract_text_from_pdf(self, pdf_path: Path) -> str:

        try:
            doc = fitz.open(pdf_path)
            text_parts = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                text_parts.append(text)
            
            doc.close()
            
            full_text = "\n".join(text_parts)
            logger.info(f"Extracted characters from {pdf_path}")
            
            return full_text
            
        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path}: {str(e)}")
            raise
    
    def get_page_count(self, pdf_path: Path) -> int:
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            doc.close()
            return page_count
        except Exception as e:
            logger.error(f"Failed to get page count from {pdf_path}: {str(e)}")
            raise
