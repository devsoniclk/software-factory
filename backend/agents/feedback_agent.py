from typing import Any, Optional, List
"""Feedback agent: product manager persona, parses feedback into actionable tasks."""
import json
from backend.services.llm_client import llm_client
from backend.services.tool_executor import execute_tool, TOOL_SCHEMAS

SYSTEM_PROMPT = """You are an experienced product manager who specialises in translating raw user feedback into structured, actionable product tasks.

Given user feedback text, analyse it deeply and extract everything actionable.

Return a JSON object with:
- "sentiment": one of "positive", "negative", "neutral", "mixed" (string)
- "sentiment_score": float from -1.0 (very negative) to 1.0 (very positive)
- "summary": concise 1-2 sentence summary of the core feedback theme (string)
- "pain_points": list of specific problems or frustrations mentioned (list of strings)
- "feature_requests": list of explicit or implied feature requests (list of strings)
- "praise": list of things the user liked (list of strings)
- "tasks": array of actionable tasks derived from the feedback, each with:
  - "title": clear task title starting with a verb (string)
  - "description": what needs to be done and why, including context from the feedback (string)
  - "type": one of "bug", "feature", "improvement", "investigation", "documentation" (string)
  - "priority": 1 (critical/blocking) to 5 (nice-to-have) (integer)
  - "effort": one of "small" (hours), "medium" (days), "large" (weeks) (string)
  - "related_feedback": direct quote(s) from the feedback that drove this task (list of strings)
- "requires_immediate_action": true if any critical bugs or blockers mentioned (boolean)
- "user_segment_guess": inferred user type based on language/context, e.g. "developer", "enterprise admin", "casual user" (string)

Extract ALL actionable items. If feedback mentions a bug, create a bug task. If it implies a missing feature, create a feature task. Be specific.
Return ONLY the JSON object, no markdown, no explanation."""

SEARCH_TOOLS = [t for t in TOOL_SCHEMAS if t["function"]["name"] in ("search_files", "read_file", "list_directory")]


async def parse_feedback(feedback_text: str) -> dict:
    """Parse feedback into structured tasks. Retries on bad JSON."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"User feedback:\n{feedback_text}"},
    ]
    return await llm_client.chat_json(messages, temperature=0.1, max_retries=3)


async def parse_feedback_with_context(
    feedback_text: str,
    codebase_path: Optional[str] = None,
) -> dict:
    """
    Parse feedback and optionally search the codebase to link tasks to specific files.
    The agent can grep for mentioned function/component names to add file context.
    """
    if not codebase_path:
        return await parse_feedback(feedback_text)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\nAfter identifying the tasks, use search_files to find relevant source files mentioned in the feedback and add file paths to the task descriptions."},
        {
            "role": "user",
            "content": (
                f"User feedback:\n{feedback_text}\n\n"
                f"The codebase is at: {codebase_path}. "
                f"Search for relevant files/components to add context to tasks."
            ),
        },
    ]

    raw = await llm_client.run_agent(
        messages=messages,
        tools=SEARCH_TOOLS,
        tool_executor=execute_tool,
        max_iterations=6,
        temperature=0.1,
    )

    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return await parse_feedback(feedback_text)
