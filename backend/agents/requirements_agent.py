"""Requirements agent: senior BA persona, generates structured requirements with retry/repair."""
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a senior business analyst with 15 years of experience writing software requirements.

Given a project description, generate a comprehensive list of functional and non-functional requirements.

Return a JSON array. Each element must have:
- "title": short requirement name (string, max 80 chars)
- "description": detailed description covering what, why, and constraints (string)
- "priority": integer 1 (critical/must-have) to 5 (nice-to-have)
- "acceptance_criteria": list of specific, testable criteria — each MUST follow EARS (Easy Approach to Requirements Syntax) format:
  * "When <trigger>, the system shall <behaviour>"
  * "If <condition>, the system shall <behaviour>"
  * "While <state>, the system shall <behaviour>"
  * "Where <feature is included>, the system shall <behaviour>"
  * "The system shall <behaviour>"
  (list of strings, minimum 2 per requirement, no other format)
- "category": one of "functional", "security", "performance", "usability", "scalability", "reliability", "data", "integration" (string)

Generate 10-15 requirements. Cover:
- Core functional requirements (the main features)
- Authentication and authorization
- Data validation and error handling
- Performance targets (response times, throughput)
- Security (input validation, data protection, audit logging)
- Scalability and reliability
- API and integration requirements

Return ONLY the JSON array, no markdown, no explanation."""


async def generate_requirements(project_description: str) -> list[dict]:
    """Generate requirements from a project description. Retries on bad JSON."""
    messages = [
        {"role": "user", "content": f"Project description:\n{project_description}"},
    ]
    result = await llm_client.chat_json(
        messages,
        temperature=0.2,
        max_retries=3,
    )
    # Normalise — model may wrap in an object
    if isinstance(result, dict):
        for key in ("requirements", "items", "data", "result"):
            if key in result and isinstance(result[key], list):
                return result[key]
    if isinstance(result, list):
        return result
    return [result]


# Attach system prompt at call time so chat_json prepends its own system msg
_orig_generate = generate_requirements


async def generate_requirements(project_description: str) -> list[dict]:  # noqa: F811
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Project description:\n{project_description}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.2, max_retries=3)
    if isinstance(result, dict):
        for key in ("requirements", "items", "data"):
            if key in result and isinstance(result[key], list):
                return result[key]
    return result if isinstance(result, list) else [result]
