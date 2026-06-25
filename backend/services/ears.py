"""EARS (Easy Approach to Requirements Syntax) format validator.

Supported EARS patterns:
  Ubiquitous:   The system shall <action>
  Event-driven: When <trigger>, the system shall <action>
  State-driven: While <state>, the system shall <action>
  Conditional:  If <condition>, the system shall <action>
  Optional:     Where <feature>, the system shall <action>
"""
import re

_EARS_PATTERNS = [
    re.compile(r"^when\s+.+,?\s+the system shall\s+.+", re.IGNORECASE),
    re.compile(r"^while\s+.+,?\s+the system shall\s+.+", re.IGNORECASE),
    re.compile(r"^if\s+.+,?\s+the system shall\s+.+", re.IGNORECASE),
    re.compile(r"^where\s+.+,?\s+the system shall\s+.+", re.IGNORECASE),
    re.compile(r"^the system shall\s+.+", re.IGNORECASE),
]

_SUGGESTION_PREFIXES = ["When", "If", "While", "Where"]


def check_criterion(text: str) -> bool:
    """Return True if the criterion matches any EARS pattern."""
    t = text.strip()
    return any(p.match(t) for p in _EARS_PATTERNS)


def validate_criteria(criteria: list[str]) -> list[dict]:
    """
    Validate a list of acceptance criteria strings.

    Returns a list of warning objects for non-conforming items:
      { "index": int, "text": str, "suggestion": str }
    """
    warnings = []
    for i, ac in enumerate(criteria):
        if not check_criterion(ac):
            first_word = ac.split()[0] if ac.strip() else ""
            prefix = "When"
            for p in _SUGGESTION_PREFIXES:
                if first_word.lower() == p.lower():
                    prefix = p
                    break
            suggestion = f"{prefix} [condition], the system shall {ac.rstrip('.')}"
            warnings.append({"index": i, "text": ac, "suggestion": suggestion})
    return warnings
