export interface ExtractedImage {
  filename: string;
  storage_key: string;
  description: string;
  position: number | null;
}

export interface Extraction {
  document_id: string;
  char_count: number;
  image_count: number;
  /** e.g. { page_count, extraction_method } */
  metadata: Record<string, unknown>;
  images: ExtractedImage[];
  created_at: string;
}

export interface ExtractionDetail extends Extraction {
  /** Fiction: the extracted text. Academic: the original markdown. */
  text: string;
  /** Academic only: markdown with images replaced by their descriptions. */
  enriched_text: string | null;
}
