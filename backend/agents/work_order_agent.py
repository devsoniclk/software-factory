from typing import Any, Optional, List
"""Work order agent: tech lead persona, generates actionable implementation tasks."""
import json
from backend.services.llm_client import llm_client
from backend.services.tool_executor import execute_tool, TOOL_SCHEMAS

SYSTEM_PROMPT = """You are a tech lead who translates architecture blueprints and requirements into concrete, developer-ready work orders (implementation tasks).

Given a blueprint and requirements, generate a prioritized set of work orders that a developer could pick up and implement independently.

Return a JSON array. Each element must have:
- "title": clear, action-oriented title starting with a verb, e.g. "Implement JWT authentication middleware" (string)
- "description": detailed implementation description including what to build, how, and why (string, min 100 chars)
- "priority": integer 1 (do first) to 5 (do last) — ordered by dependencies
- "estimated_hours": realistic time estimate in hours (integer)
- "structured_context": object with:
  - "dependencies": list of other work order titles that must be done first (list of strings)
  - "files_to_create": list of files the developer will create (list of strings)
  - "files_to_modify": list of existing files to modify (list of strings)
  - "testing_notes": how to verify the work is done correctly (string)
  - "acceptance_criteria": specific done conditions (list of strings)
- "tags": relevant tags like "backend", "frontend", "database", "auth", "api", "testing" (list of strings)

Generate 8-15 work orders covering the full implementation from foundation to features.
Order by dependency (infrastructure first, features last).
Return ONLY the JSON array, no markdown, no explanation."""

TOOLS = [t for t in TOOL_SCHEMAS if t["function"]["name"] in ("read_file", "list_directory", "search_files", "git_log", "git_status")]


async def generate_work_orders(
    blueprint: dict,
    requirements: list[dict],
    codebase_path: Optional[str] = None,
) -> list[dict]:
    """
    Generate work orders from a blueprint and requirements.
    If codebase_path provided, the agent reads existing files for context.
    """
    bp_summary = json.dumps(blueprint, indent=2)
    req_summary = json.dumps(requirements, indent=2)

    context = ""
    if codebase_path:
        context = f"\n\nThe existing codebase is at: {codebase_path}. Use list_directory and read_file to understand what already exists so you don't create duplicate work orders."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Blueprint:\n{bp_summary}\n\n"
                f"Requirements:\n{req_summary}"
                f"{context}"
            ),
        },
    ]

    if codebase_path:
        raw = await llm_client.run_agent(
            messages=messages,
            tools=TOOLS,
            tool_executor=execute_tool,
            max_iterations=10,
            temperature=0.2,
        )
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
        try:
            result = json.loads(text)
            return result if isinstance(result, list) else [result]
        except json.JSONDecodeError:
            pass

    result = await llm_client.chat_json(messages, temperature=0.2, max_retries=3)
    return result if isinstance(result, list) else [result]
