

from dotenv import load_dotenv

load_dotenv()

import os
from contextvars import ContextVar

from dotenv import load_dotenv
from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

from app.agents.inventory_agent import create_inventory_agent
from app.agents.logistics_agent import logistics_agent
from app.agents.pricing_agent import run_pricing_agent


agent_responses = ContextVar("agent_responses", default=None)

# ============================================================
# 1. CREATE THE INVENTORY AGENT
# ============================================================

inventory_agent = create_inventory_agent()


# ============================================================
# 2. CREATE SPECIALIST AGENT TOOLS
# ============================================================

# @tool(approval_mode="never_require")
# async def inventory_tool(query: str) -> str:
#     """
#     Delegate inventory-related requests to the Inventory Agent.
#     The Inventory Agent prints its own final response.
#     """

#     result = await inventory_agent.run(query)

#     print(result.text)

#     return result.text


@tool(approval_mode="never_require")
async def inventory_tool(query: str) -> str:

    result = await inventory_agent.run(query)

    response_text = result.text

    print(response_text)

    responses = agent_responses.get()

    if responses is not None:
        responses.append({
            "name": "InventoryAgent",
            "response": response_text
        })

    return response_text

# @tool(approval_mode="never_require")
# async def logistics_tool(query: str) -> str:
#     """
#     Delegate logistics-related requests to the Logistics Agent.
#     The Logistics Agent prints its own final response.
#     """

#     result = await logistics_agent.run(query)

#     print(result.text)

#     return result.text

@tool(approval_mode="never_require")
async def logistics_tool(query: str) -> str:

    result = await logistics_agent.run(query)

    response_text = result.text

    print(response_text)

    responses = agent_responses.get()

    if responses is not None:
        responses.append({
            "name": "LogisticsAgent",
            "response": response_text
        })

    return response_text


# @tool(approval_mode="never_require")
# def pricing_tool(query: str) -> str:
#     """
#     Delegate pricing-related requests to the Pricing Agent.
#     The Pricing Agent prints its own final response.
#     """

#     return run_pricing_agent(query)

@tool(approval_mode="never_require")
def pricing_tool(query: str) -> str:

    response_text = run_pricing_agent(query)

    responses = agent_responses.get()

    if responses is not None:
        responses.append({
            "name": "PricingAgent",
            "response": response_text
        })

    return response_text

# ============================================================
# 3. CREATE THE BUSINESS ORCHESTRATOR
# ============================================================

orchestrator = Agent(
    client=FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["FOUNDRY_MODEL_NAME"],
        credential=AzureCliCredential(),
    ),

    name="BusinessOrchestrator",

    instructions="""
You are the central Orchestrator Agent for an
e-commerce Multi-Agent Business Assistant.

Your responsibility is to understand the user's request
and decide which specialist agent should handle it.

You have access to three specialist agents.

1. INVENTORY AGENT
   - Check product availability
   - Check stock quantity
   - Check whether requested quantities can be fulfilled
   - Identify insufficient stock

2. LOGISTICS AGENT
   - Look up orders
   - Check order status
   - Estimate delivery
   - Calculate shipping cost

3. PRICING AGENT
   - Get product prices
   - Calculate total prices
   - Handle pricing-related calculations


ROUTING RULES:

- Inventory questions → use the Inventory Agent.
- Order and delivery questions → use the Logistics Agent.
- Price and total-cost questions → use the Pricing Agent.

If a request requires multiple domains,
use the required specialist agents.

For example:

User:
"Check if 20 wireless keyboards are available
and calculate their total price."

You should:

1. Send the inventory question to the Inventory Agent.
2. Send the pricing question to the Pricing Agent.
3. Allow each specialist to handle its own task.
4. Do not perform the business calculations yourself.


IMPORTANT RULES:

- Never invent business information.
- Always use the specialist agents for business data.
- Do not answer inventory questions yourself.
- Do not answer logistics questions yourself.
- Do not answer pricing questions yourself.
- If an agent cannot find the requested information,
  clearly communicate that to the user.
- Use multiple agents when required.
- Currency is INR (₹).
- Do not expose internal tool names or implementation details.

The specialist agent is responsible for producing the
business answer for its assigned request.
""",

    tools=[
        inventory_tool,
        logistics_tool,
        pricing_tool,
    ],
)