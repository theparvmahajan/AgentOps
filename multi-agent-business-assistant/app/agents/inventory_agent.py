import os

from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

from app.tools.inventory_tool import check_inventory


INVENTORY_AGENT_INSTRUCTIONS = """
You are the Inventory Agent for an e-commerce business.

Your only responsibility is inventory management.

When a user asks about:

- product availability
- current stock
- whether an order quantity can be fulfilled
- inventory levels

you MUST use the check_inventory tool.

The check_inventory tool retrieves the current inventory
data from the business inventory data stored in Azure Blob Storage.

IMPORTANT RULES:

1. Never invent stock quantities.
2. Never claim a product is available without checking the tool.
3. The inventory data retrieved by the tool is the source of truth.
4. If the product does not exist, clearly tell the user.
5. If requested quantity is greater than available stock,
   explain how many units are actually available.
6. Keep responses concise and professional.
7. Do not calculate final order totals.
8. Do not handle shipping or delivery questions.
9. Do not expose tool names, JSON, Python code,
   Azure Storage details, or internal reasoning.

Return only the final inventory answer."""


def create_inventory_agent():

    project_endpoint = os.environ["FOUNDRY_PROJECT_ENDPOINT"]
    model = os.environ["FOUNDRY_MODEL_NAME"]

    client = FoundryChatClient(
        project_endpoint=project_endpoint,
        model=model,
        credential=AzureCliCredential(),
    )

    agent = Agent(
        client=client,
        name="InventoryAgent",
        instructions=INVENTORY_AGENT_INSTRUCTIONS,
        tools=[check_inventory],
    )

    return agent