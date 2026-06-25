"""Write requirements and blueprints as .md files on disk."""
import os
import json
from pathlib import Path

DOCS_ROOT = Path("docs")


def _project_dir(project_id: str) -> Path:
    return DOCS_ROOT / project_id


def _ensure(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_requirement(project_id: str, req) -> str:
    """Write requirement to docs/{project_id}/requirements/REQ-XXX.md"""
    d = _project_dir(project_id) / "requirements"
    _ensure(d)
    slug = req.req_id or req.id
    path = d / f"{slug}.md"

    try:
        criteria = json.loads(req.acceptance_criteria_json or "[]")
    except Exception:
        criteria = []

    ac_lines = "\n".join(
        f"- **AC.{i+1}** {c.get('text', c) if isinstance(c, dict) else c}"
        for i, c in enumerate(criteria)
    )

    try:
        warnings = json.loads(req.ears_warnings_json or "[]")
    except Exception:
        warnings = []

    warn_lines = ""
    if warnings:
        warn_lines = "\n\n## EARS Warnings\n" + "\n".join(
            f"- AC.{w.get('index','')+1}: {w.get('suggestion','')}"
            for w in warnings
        )

    content = f"""# {req.req_id or ''} {req.title}

**Category:** {req.category or 'General'}
**Priority:** {req.priority or 'medium'}
**Status:** {req.status or 'draft'}
**Created:** {req.created_at or ''}

## Description

{req.description or '_No description._'}

## Acceptance Criteria

{ac_lines or '_None defined._'}
{warn_lines}
"""
    path.write_text(content, encoding="utf-8")
    return str(path)


def save_blueprint(project_id: str, bp) -> str:
    """Write blueprint to docs/{project_id}/blueprints/BLU-XXX.md"""
    d = _project_dir(project_id) / "blueprints"
    _ensure(d)
    slug = bp.bp_id or bp.id
    path = d / f"{slug}.md"

    content = f"""# {bp.bp_id or ''} {bp.name}

**Status:** {bp.status or 'draft'}
**Created:** {bp.created_at or ''}

## Description

{bp.description or '_No description._'}

## DSL

```blueprint
{bp.dsl_content or ''}
```
"""
    path.write_text(content, encoding="utf-8")
    return str(path)
