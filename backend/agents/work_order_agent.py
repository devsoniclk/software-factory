"""Work order agent — generates work orders from blueprint + requirements."""
import json
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a tech lead. Given a blueprint and requirements, generate concrete work orders (implementation tasks).

Return a JSON array where each element has:
- "title": work order title (string)
- "description": detailed implementation description (string)
- "structured_context": object with relevant context like "dependencies", "files_to_modify", "testing_notes" (object)

Generate 5-10 work orders that cover the full implementation of the blueprint.
Each work order should be independently assignable to a developer.
Return ONLY the JSON array, no markdown fences or explanation."""


async def generate_work_orders(blueprint: dict, requirements: list[dict]) -> list[dict]:
    """Generate work orders from a blueprint and related requirements."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Blueprint:\n{json.dumps(blueprint, indent=2)}\n\nRequirements:\n{json.dumps(requirements, indent=2)}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.2)
    return result if isinstance(result, list) else [result]
