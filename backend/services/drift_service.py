"""Drift detection: compare blueprint DSL against indexed code symbols."""
import json
import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.database import Blueprint, CodeSymbol, DriftAlert, Repository, uid, now_iso

log = logging.getLogger(__name__)


def _extract_component_names(dsl: str) -> list[str]:
    """Extract component names from blueprint DSL."""
    names = []
    for m in re.finditer(r'^component\s+(\S+)', dsl, re.MULTILINE):
        names.append(m.group(1))
    return names


def _extract_model_names(dsl: str) -> list[str]:
    """Extract model names from blueprint DSL."""
    names = []
    for m in re.finditer(r'^model\s+(\S+)', dsl, re.MULTILINE):
        names.append(m.group(1))
    return names


def _name_matches(bp_name: str, code_symbols: list) -> list:
    """Find code symbols whose name is similar to the blueprint name."""
    bp_lower = bp_name.lower()
    matches = []
    for s in code_symbols:
        if bp_lower in s.name.lower() or s.name.lower() in bp_lower:
            matches.append(s)
    return matches


async def detect_drift(project_id: str, blueprint_id: str, repo_id: str, db: AsyncSession) -> dict:
    """Run drift detection for a blueprint against a repository. Returns list of new alerts."""
    bp = await db.get(Blueprint, blueprint_id)
    if not bp:
        return {"error": "Blueprint not found"}

    repo = await db.get(Repository, repo_id)
    if not repo or repo.status != "ready":
        return {"error": "Repository not indexed or not found"}

    # Load all symbols from the repo
    result = await db.execute(select(CodeSymbol).where(CodeSymbol.repo_id == repo_id))
    all_symbols = result.scalars().all()

    dsl = bp.dsl_content or ""
    component_names = _extract_component_names(dsl)
    model_names = _extract_model_names(dsl)

    # Clear existing open drift alerts for this blueprint+repo combination
    await db.execute(
        delete(DriftAlert).where(
            DriftAlert.blueprint_id == blueprint_id,
            DriftAlert.repo_id == repo_id,
            DriftAlert.status == "open",
        )
    )

    alerts = []

    # Check each component for a matching class/interface in code
    for comp_name in component_names:
        matches = _name_matches(comp_name, [s for s in all_symbols if s.symbol_type in ("class", "interface")])
        if not matches:
            alert = DriftAlert(
                id=uid(), project_id=project_id, blueprint_id=blueprint_id, repo_id=repo_id,
                alert_type="missing_symbol", severity="warning",
                title=f"Component `{comp_name}` has no matching class in code",
                description=f"Blueprint '{bp.name}' defines component `{comp_name}` but no class or interface with a similar name was found in the indexed repository.",
                blueprint_reference=f"component {comp_name}",
                code_reality="(no matching class found)",
            )
            db.add(alert)
            alerts.append({"type": "missing_symbol", "name": comp_name, "severity": "warning"})
        else:
            # Found a match — check if any appear undocumented
            for sym in matches:
                if not sym.docstring.strip():
                    alert = DriftAlert(
                        id=uid(), project_id=project_id, blueprint_id=blueprint_id, repo_id=repo_id,
                        alert_type="undocumented_symbol", severity="info",
                        title=f"Class `{sym.name}` has no docstring",
                        description=f"Blueprint component `{comp_name}` maps to `{sym.name}` in {sym.file_path} but the class has no docstring.",
                        blueprint_reference=f"component {comp_name}",
                        code_reality=f"class {sym.name} in {sym.file_path}:{sym.line_start}",
                    )
                    db.add(alert)
                    alerts.append({"type": "undocumented_symbol", "name": sym.name, "severity": "info"})

    # Check each model for a matching class
    for model_name in model_names:
        matches = _name_matches(model_name, [s for s in all_symbols if s.symbol_type == "class"])
        if not matches:
            alert = DriftAlert(
                id=uid(), project_id=project_id, blueprint_id=blueprint_id, repo_id=repo_id,
                alert_type="missing_symbol", severity="warning",
                title=f"Model `{model_name}` has no matching class in code",
                description=f"Blueprint '{bp.name}' defines model `{model_name}` but no class with a similar name was found.",
                blueprint_reference=f"model {model_name}",
                code_reality="(no matching class found)",
            )
            db.add(alert)
            alerts.append({"type": "missing_symbol", "name": model_name, "severity": "warning"})

    await db.commit()
    log.info("Drift detection for blueprint %s: %d alerts", blueprint_id, len(alerts))
    return {"alerts": alerts, "total": len(alerts)}


async def run_project_drift(project_id: str, db: AsyncSession) -> dict:
    """Run drift detection across all blueprints for a project (uses first indexed repo)."""
    from backend.models.database import Blueprint as BlueprintModel

    # Find first ready repo for project
    repo_result = await db.execute(
        select(Repository).where(Repository.project_id == project_id, Repository.status == "ready").limit(1)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        return {"error": "No ready repository for this project. Index a repository first."}

    bp_result = await db.execute(select(BlueprintModel).where(BlueprintModel.project_id == project_id))
    blueprints = bp_result.scalars().all()

    total_alerts = 0
    results = []
    for bp in blueprints:
        r = await detect_drift(project_id, bp.id, repo.id, db)
        n = r.get("total", 0)
        total_alerts += n
        results.append({"blueprint_id": bp.id, "blueprint_name": bp.name, "new_alerts": n})

    return {"project_id": project_id, "repo_id": repo.id, "blueprints_checked": len(blueprints), "total_alerts": total_alerts, "results": results}
