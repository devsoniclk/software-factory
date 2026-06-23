"""Test agent — generates test cases from requirements."""
import json
from backend.services.llm_client import llm_client

SYSTEM_PROMPT = """You are a QA engineer. Given a requirement with its acceptance criteria, generate comprehensive test cases.

Return a JSON array where each element has:
- "name": test case name (string)
- "description": what this test verifies (string)
- "test_type": one of "unit", "integration", "e2e", "performance", "security" (string)
- "steps": array of test steps as strings (list of strings)
- "expected_result": expected outcome (string)

Generate 3-6 test cases per requirement, covering: happy path, edge cases, error handling, and at least one security or performance test.
Return ONLY the JSON array, no markdown fences or explanation."""


async def generate_tests(requirement: dict) -> list[dict]:
    """Generate test cases from a requirement."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Requirement:\n{json.dumps(requirement, indent=2)}"},
    ]
    result = await llm_client.chat_json(messages, temperature=0.2)
    return result if isinstance(result, list) else [result]
