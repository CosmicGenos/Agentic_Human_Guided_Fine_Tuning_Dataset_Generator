import subprocess
import logging
from pathlib import Path
from typing import Tuple, List, Dict, Any
from dataclasses import dataclass
from workers.config import Config

logger = logging.getLogger(__name__)


@dataclass
class ImageFile:
    filename: str
    path: Path
    

@dataclass
class MarkdownOutput:
    markdown_text: str
    markdown_path: Path
    images: List[ImageFile]
    metadata: Dict[str, Any]


class PDFToMarkdownService:

    
    def __init__(self):
        self.output_format = Config.MARKER_OUTPUT_FORMAT
        self.use_llm = Config.MARKER_USE_LLM
        self.force_ocr = Config.MARKER_FORCE_OCR
        self.redo_inline_math = Config.MARKER_REDO_INLINE_MATH
        self.timeout = Config.MARKER_TIMEOUT
        
        logger.info(
            f"PDFToMarkdownService initialized: "
            f"format={self.output_format}, use_llm={self.use_llm}, "
            f"force_ocr={self.force_ocr}, redo_math={self.redo_inline_math}"
        )
    
    def convert_pdf(self, pdf_path: Path, output_dir: Path) -> MarkdownOutput:

        logger.info(f"Converting PDF to markdown: {pdf_path}")
        
        output_dir.mkdir(parents=True, exist_ok=True)
        try:
            self._run_marker_cli(pdf_path, output_dir)
        except subprocess.TimeoutExpired:
            raise TimeoutError(
                f"Marker conversion timeout ({self.timeout}s) for {pdf_path}"
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Marker conversion failed for {pdf_path}: {e.stderr}"
            )
        
        # Parse Marker output
        markdown_path = self._find_markdown_output(output_dir, pdf_path)
        markdown_text = markdown_path.read_text(encoding='utf-8')
        
        images = self._extract_images(output_dir)
        
        metadata = {
            "source_pdf": str(pdf_path),
            "markdown_path": str(markdown_path),
            "image_count": len(images),
            "marker_config": {
                "use_llm": self.use_llm,
                "force_ocr": self.force_ocr,
                "redo_inline_math": self.redo_inline_math
            }
        }
        
        logger.info(
            f"PDF conversion complete: {len(markdown_text)} chars, "
            f"{len(images)} images"
        )
        
        return MarkdownOutput(
            markdown_text=markdown_text,
            markdown_path=markdown_path,
            images=images,
            metadata=metadata
        )
    
    def _run_marker_cli(self, pdf_path: Path, output_dir: Path):

        cmd = [
            "marker_single",
            str(pdf_path),
            "--output_dir", str(output_dir),
            "--output_format", self.output_format,
        ]

        if self.use_llm:
            cmd.append("--use_llm")
        
        if self.force_ocr:
            cmd.append("--force_ocr")
        
        if self.redo_inline_math:
            cmd.append("--redo_inline_math")
 
        if self.use_llm and Config.GEMINI_API_KEY:
            cmd.extend(["--gemini_api_key", Config.GEMINI_API_KEY])
        
        logger.info(f"Running Marker command: {' '.join(cmd[:4])}...") 
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.timeout,
            check=True
        )
        
        logger.debug(f"Marker output: {result.stdout}")
        
        if result.stderr:
            logger.warning(f"Marker stderr: {result.stderr}")
    
    def _find_markdown_output(self, output_dir: Path, pdf_path: Path) -> Path:

        pdf_stem = pdf_path.stem
        markdown_path = output_dir / f"{pdf_stem}.md"
        
        if markdown_path.exists():
            return markdown_path

        markdown_path = output_dir / pdf_stem / f"{pdf_stem}.md"
        
        if markdown_path.exists():
            return markdown_path

        md_files = list(output_dir.rglob("*.md"))
        
        if md_files:
            logger.warning(
                f"Using first found markdown file: {md_files[0]}"
            )
            return md_files[0]
        
        raise FileNotFoundError(
            f"No markdown output found in {output_dir}"
        )
    
    def _extract_images(self, output_dir: Path) -> List[ImageFile]:
 
        images = []
        
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.svg'}

        for img_path in output_dir.rglob("*"):
            if img_path.is_file() and img_path.suffix.lower() in image_extensions:
                images.append(ImageFile(
                    filename=img_path.name,
                    path=img_path
                ))
        
        logger.info(f"Found {len(images)} extracted images")
        
        return images
