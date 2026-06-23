"""Requirements agent — generates requirements from a project description."""
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a senior business analyst. Given a project description, generate a comprehensive list of functional and non-functional requirements.

Return a JSON array where each element has:
- "title": short requirement name (string)
- "description": detailed description (string)
- "priority": 1 (critical) to 5 (nice-to-have) (integer)
- "acceptance_criteria": list of specific, testable acceptance criteria (list of strings)

Generate 8-15 requirements covering: functional requirements, security, performance, usability, scalability, and error handling.
Return ONLY the JSON array, no markdown fences or explanation."""


async def generate_requirements(project_description: str) -> list[dict]:
    """Generate requirements from a project description."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Project description:\n{project_description}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.2)
    if isinstance(result, list):
        return result
    # If the model wraps in an object
    if isinstance(result, dict) and "requirements" in result:
        return result["requirements"]
    return result if isinstance(result, list) else [result]
