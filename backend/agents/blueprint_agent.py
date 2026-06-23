"""Blueprint agent — generates architecture blueprint from project description."""
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a senior software architect. Given a project description, generate a technical blueprint.

Return a JSON object with:
- "name": blueprint name (string)
- "description": architectural overview (string)
- "decisions": array of design decisions, each with "title" and "rationale" (string)
- "components": array of system components, each with "name", "description", and "technology" (string)
- "constraints": array of technical constraints (list of strings)

Cover: architecture style, data layer, API design, auth, deployment, and tech stack.
Return ONLY the JSON object, no markdown fences or explanation."""


async def generate_blueprint(project_description: str) -> dict:
    """Generate a blueprint from a project description."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Project description:\n{project_description}"},
    ]
    return await llm_client.chat_json(messages, temperature=0.2)
