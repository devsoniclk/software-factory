"""Feedback agent — parses user feedback into actionable tasks."""
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a product manager. Given user feedback text, analyze it and extract actionable information.

Return a JSON object with:
- "sentiment": one of "positive", "negative", "neutral", "mixed" (string)
- "summary": brief summary of the feedback (string)
- "tasks": array of actionable tasks derived from the feedback, each with:
  - "title": task title (string)
  - "description": what needs to be done (string)
  - "priority": 1 (critical) to 5 (nice-to-have) (integer)

Extract ALL actionable items. If feedback is vague, infer reasonable tasks.
Return ONLY the JSON object, no markdown fences or explanation."""


async def parse_feedback(feedback_text: str) -> dict:
    """Parse feedback text into structured tasks."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"User feedback:\n{feedback_text}"},
    ]
    return await llm_client.chat_json(messages, temperature=0.2)
