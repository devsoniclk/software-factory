"""Product Overview agent: generates structured product context from interview answers."""
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a senior product manager with 15 years of experience at top software companies.

Given answers from a product discovery interview, generate a comprehensive Product Overview document.

Return a JSON object with:
- "business_problem": one clear paragraph describing the core problem being solved (string)
- "current_state": description of how users deal with this problem today — manual processes, existing tools, pain points (string)
- "personas": array of user personas, each with:
  - "name": persona name (string, e.g. "Power User")
  - "role": job title or role (string)
  - "goals": list of 2-3 goals this persona has (list of strings)
  - "pain_points": list of 2-3 pain points they experience (list of strings)
- "product_description": clear description of what the product does and its core value proposition (string)
- "success_metrics": list of 3-5 measurable success criteria (list of strings)
- "technical_requirements": list of non-functional/technical constraints derived from the context (list of strings)

Return ONLY the JSON object, no markdown, no explanation."""


async def generate_product_overview(interview_answers: dict) -> dict:
    """Generate a product overview from structured interview answers."""
    answers_text = "\n".join(
        f"**{k.replace('_', ' ').title()}:** {v}"
        for k, v in interview_answers.items()
        if v
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Interview answers:\n\n{answers_text}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.3, max_retries=3, agent_type="requirements")

    if isinstance(result, dict) and "business_problem" in result:
        return result

    # Fallback: build a basic overview from the raw answers
    return {
        "business_problem": interview_answers.get("business_problem", ""),
        "current_state": interview_answers.get("current_state", ""),
        "personas": interview_answers.get("personas", []),
        "product_description": interview_answers.get("product_description", ""),
        "success_metrics": interview_answers.get("success_metrics", []),
        "technical_requirements": interview_answers.get("technical_requirements", []),
    }
