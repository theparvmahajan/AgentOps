import os

from dotenv import load_dotenv

# Load variables from BackEnd/.env
load_dotenv()

from agent_framework import Agent, tool    # agent is the class used to create ai agents  and tool here will make python function behave like tool that can be called anytime 
from agent_framework.foundry import FoundryChatClient # this is the chat with the model 
from azure.identity import AzureCliCredential

from app.tools.logistics_tools import (
    get_order_details,
    estimate_delivery,
    get_shipping_cost
)


@tool(approval_mode="never_require")
def order_lookup(order_id: str) -> str:
    """
    Find an e-commerce order using its order ID.  
    """

    result = get_order_details(order_id)

    return str(result)


@tool(approval_mode="never_require")
def delivery_estimator(order_id: str) -> str:
    """
    Estimate the delivery date and status of an order.
    """

    result = estimate_delivery(order_id)

    return str(result)


@tool(approval_mode="never_require")
def shipping_calculator(order_id: str) -> str:
    """
    Get the shipping cost of an order.
    """

    result = get_shipping_cost(order_id)

    return str(result)


logistics_agent = Agent(
    client=FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["FOUNDRY_MODEL_NAME"],
        credential=AzureCliCredential(),
    ),

    name="LogisticsAgent",

    instructions="""
You are the Logistics Agent for an e-commerce business called AgentOps.

Your responsibility is to handle logistics and delivery-related
business requests.

Your main responsibilities are:

1. Check the status of an order.
2. Find order details.
3. Estimate delivery dates.
4. Calculate shipping costs.
5. Identify delayed orders.
6. Provide concise logistics information to the business user.

You work as a specialized agent inside a larger multi-agent
e-commerce system.

You are NOT responsible for:

- Inventory management
- Product pricing
- Customer support
- General business questions

Those tasks should be handled by other specialized agents.

IMPORTANT RULES:

- Never invent order information.
- Never invent delivery dates.
- Never invent shipping costs.
- When actual order information is required, use the appropriate
  logistics tool.
- The logistics tools retrieve current order data from Azure
  Blob Storage.
- The order data retrieved by the tools is the source of truth.
- If an order cannot be found, clearly state that it was not found.
- If the requested information is unavailable, clearly explain
  what information is missing.
- Use INR (₹) for monetary values.
- Keep responses concise and business-oriented.
- Clearly distinguish between estimated and confirmed delivery dates.
- Do not expose tool names, JSON, Python code, Azure Storage
  details, or internal reasoning.

When responding about an order, provide:

- Order ID
- Current status
- Destination
- Expected delivery date
- Shipping cost when requested

You are a tool-using logistics specialist, not a generic chatbot.
""",

    tools=[
        order_lookup,
        delivery_estimator,
        shipping_calculator
    ]
)


