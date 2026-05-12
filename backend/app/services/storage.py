import io
import json
import os

from minio import Minio

_client: Minio | None = None


def _get_client() -> tuple[Minio, str]:
    global _client
    bucket = os.environ.get("MINIO_BUCKET", "regevent")
    if _client is None:
        _client = Minio(
            os.environ["MINIO_ENDPOINT"],
            access_key=os.environ["MINIO_ROOT_USER"],
            secret_key=os.environ["MINIO_ROOT_PASSWORD"],
            secure=False,
        )
        if not _client.bucket_exists(bucket):
            _client.make_bucket(bucket)
            _client.set_bucket_policy(bucket, json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"],
                }],
            }))
    return _client, bucket


def upload_file(data: bytes, object_name: str, content_type: str) -> str:
    client, bucket = _get_client()
    client.put_object(
        bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    public_url = os.environ["MINIO_PUBLIC_URL"]
    return f"{public_url}/{bucket}/{object_name}"


def delete_file(object_name: str) -> None:
    client, bucket = _get_client()
    try:
        client.remove_object(bucket, object_name)
    except Exception:
        pass
