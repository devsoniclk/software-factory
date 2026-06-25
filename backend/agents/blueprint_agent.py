from typing import Any, Optional, List
"""Blueprint agent: senior architect persona, generates architecture blueprint with retry/repair."""
import json
from backend.services.llm_client import llm_client
from backend.services.tool_executor import execute_tool, TOOL_SCHEMAS

SYSTEM_PROMPT = """You are a principal software architect with deep expertise in distributed systems, cloud-native architecture, and developer tooling.

Given a project description (and optionally existing codebase context), generate a comprehensive technical architecture blueprint.

Return a JSON object with:
- "name": blueprint name, e.g. "v1 Architecture" (string)
- "description": 2-3 paragraph architectural overview covering style, data flow, and key tradeoffs (string)
- "architecture_style": e.g. "monolith", "microservices", "event-driven", "serverless" (string)
- "decisions": array of architectural decision records (ADRs), each with:
  - "title": decision name (string)
  - "context": why this decision was needed (string)
  - "decision": what was decided (string)
  - "rationale": why this option was chosen over alternatives (string)
  - "consequences": tradeoffs and implications (string)
- "components": array of system components, each with:
  - "name": component name (string)
  - "description": what it does and its responsibilities (string)
  - "technology": specific tech/library chosen (string)
  - "interfaces": how it communicates with other components (list of strings)
- "data_model": description of key entities and their relationships (string)
- "api_design": REST/GraphQL/gRPC API design principles and key endpoints (string)
- "deployment": deployment topology — containers, cloud services, CI/CD pipeline (string)
- "constraints": list of technical constraints, e.g. "Must run offline", "SQLite only" (list of strings)
- "risks": list of architectural risks and mitigations (list of strings)

Return ONLY the JSON object, no markdown, no explanation."""

TOOLS = [t for t in TOOL_SCHEMAS if t["function"]["name"] in ("read_file", "list_directory", "search_files")]


async def generate_blueprint(project_description: str, codebase_path: Optional[str] = None) -> dict:
    """
    Generate a blueprint. If codebase_path is provided, the agent can read
    existing files to produce a more accurate architecture.
    """
    context = ""
    if codebase_path:
        context = f"\nThe project codebase is at: {codebase_path}. Use read_file and list_directory tools to explore it before generating the blueprint."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Project description:\n{project_description}{context}"},
    ]

    if codebase_path:
        raw = await llm_client.run_agent(
            messages=messages,
            tools=TOOLS,
            tool_executor=execute_tool,
            max_iterations=8,
            temperature=0.2,
        )
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    return await llm_client.chat_json(messages, temperature=0.2, max_retries=3)
