import os
import io
import asyncio
import logging
from minio import Minio

logger = logging.getLogger(__name__)


class MinioService:
    def __init__(self):
        self.client = Minio(
            endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=os.getenv("MINIO_SECURE", "false").lower() == "true"
        )
        self.bucket = os.getenv("MINIO_BUCKET", "synthetic-data")
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"Created MinIO bucket: {self.bucket}")
        except Exception as e:
            logger.warning(f"MinIO bucket init failed (will retry on first use): {e}")

    async def upload(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        await asyncio.to_thread(
            self.client.put_object,
            self.bucket, key,
            io.BytesIO(data), len(data),
            content_type=content_type
        )
        return key

    async def download(self, key: str) -> bytes:
        response = await asyncio.to_thread(self.client.get_object, self.bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    async def stat(self, key: str):
        return await asyncio.to_thread(self.client.stat_object, self.bucket, key)

    async def delete(self, key: str):
        await asyncio.to_thread(self.client.remove_object, self.bucket, key)

    async def stream(self, key: str):
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, self.client.get_object, self.bucket, key)
        try:
            while True:
                chunk = await loop.run_in_executor(None, response.read, 8192)
                if not chunk:
                    break
                yield chunk
        finally:
            response.close()
            response.release_conn()


minio_service = MinioService()
