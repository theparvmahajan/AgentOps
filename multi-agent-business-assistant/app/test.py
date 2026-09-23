import asyncio

from app.agents.orchestrator import orchestrator


async def main():
    query = input("Enter your query: ")

    await orchestrator.run(query)


if __name__ == "__main__":
    asyncio.run(main())