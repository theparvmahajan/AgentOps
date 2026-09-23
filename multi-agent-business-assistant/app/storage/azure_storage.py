import json
import os

from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

load_dotenv()

STORAGE_ACCOUNT_NAME = os.environ["AZURE_STORAGE_ACCOUNT_NAME"]

CONTAINER_NAME = os.environ.get(
    "AZURE_STORAGE_CONTAINER",
    "business-data",
)

credential = DefaultAzureCredential()

blob_service_client = BlobServiceClient(
    account_url=f"https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net",
    credential=credential,
)


def load_json_from_blob(blob_name: str):
    blob_client = blob_service_client.get_blob_client(
        container=CONTAINER_NAME,
        blob=blob_name,
    )

    data = blob_client.download_blob().readall()

    return json.loads(data)