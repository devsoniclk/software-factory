from typing import Any, Optional, List
"""Test agent: QA engineer persona, generates and optionally writes runnable test cases."""
import json
from backend.services.llm_client import llm_client
from backend.services.tool_executor import execute_tool, TOOL_SCHEMAS

SYSTEM_PROMPT = """You are a senior QA engineer and test automation specialist.

Given a requirement with its acceptance criteria, generate comprehensive test cases.

Return a JSON array. Each element must have:
- "name": descriptive test case name (string)
- "description": what this test verifies and why it matters (string)
- "test_type": one of "unit", "integration", "e2e", "performance", "security", "smoke" (string)
- "preconditions": setup steps or system state required before running (list of strings)
- "steps": ordered test execution steps (list of strings, each starting with a verb)
- "expected_result": specific, observable expected outcome (string)
- "edge_cases": list of boundary/negative cases this test should also cover (list of strings)
- "priority": 1 (run first / critical path) to 3 (run later) (integer)

Generate 4-8 test cases per requirement covering:
1. Happy path (positive case)
2. Boundary conditions and edge cases
3. Error/failure handling (negative cases)
4. At least one security test (input validation, auth bypass attempt)
5. At least one performance consideration

Return ONLY the JSON array, no markdown, no explanation."""

WRITE_SYSTEM_PROMPT = """You are a senior QA engineer writing runnable pytest test code.

Given a requirement and its test cases, write a complete, runnable Python pytest file.

Rules:
- Use pytest fixtures for setup/teardown
- Import only standard library and pytest (no external deps unless httpx for API tests)
- Each test function starts with test_
- Include docstrings explaining what each test validates
- Add parametrize decorators for data-driven tests where appropriate
- Mock external dependencies using unittest.mock
- Return ONLY the Python code, no markdown fences, no explanation"""

TOOLS = [t for t in TOOL_SCHEMAS if t["function"]["name"] in ("read_file", "write_file", "run_command", "list_directory")]


async def generate_tests(requirement: dict) -> list[dict]:
    """Generate test cases from a requirement. Retries on bad JSON."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Requirement:\n{json.dumps(requirement, indent=2)}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.2, max_retries=3)
    return result if isinstance(result, list) else [result]


async def generate_and_write_tests(
    requirement: dict,
    output_path: str,
    codebase_path: Optional[str] = None,
) -> dict:
    """
    Generate test cases AND write a runnable pytest file.
    The agent reads the relevant source code, writes the test file, then runs it.
    Returns: {"test_cases": [...], "file": "...", "run_result": {...}}
    """
    req_json = json.dumps(requirement, indent=2)
    context = f"\nThe codebase is at: {codebase_path}." if codebase_path else ""

    messages = [
        {"role": "system", "content": WRITE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Requirement:\n{req_json}\n"
                f"{context}\n\n"
                f"Write the test file to: {output_path}\n"
                f"After writing, run 'pytest {output_path} -v' to verify it executes."
            ),
        },
    ]

    await llm_client.run_agent(
        messages=messages,
        tools=TOOLS,
        tool_executor=execute_tool,
        max_iterations=8,
        temperature=0.1,
    )

    test_cases = await generate_tests(requirement)
    return {
        "test_cases": test_cases,
        "file": output_path,
    }
