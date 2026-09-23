# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# # from agents.orchestrator import orchestrator
# from app.agents.orchestrator import orchestrator


# app = FastAPI(
#     title="AgentOps Multi-Agent Business Assistant",
#     version="1.0.0"
# )


# # Allow the separate frontend to communicate with FastAPI
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# class ChatRequest(BaseModel):
#     message: str


# @app.get("/")
# async def root():
#     return {
#         "status": "running",
#         "service": "AgentOps Backend"
#     }


# @app.get("/health")
# async def health():
#     return {
#         "status": "healthy"
#     }


# @app.post("/chat")
# async def chat(request: ChatRequest):

#     result = await orchestrator.run(request.message)

#     return {
#         "response": str(result),
#         "agent": "Business Orchestrator",
#         "status": "success"
#     }





from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextvars import Token

from app.agents.orchestrator import orchestrator, agent_responses


app = FastAPI(
    title="AgentOps Multi-Agent Business Assistant",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "AgentOps Backend"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


@app.post("/chat")
async def chat(request: ChatRequest):

    responses = []

    token = agent_responses.set(responses)

    try:
        await orchestrator.run(request.message)

        return {
            "agents": responses
        }

    finally:
        agent_responses.reset(token)