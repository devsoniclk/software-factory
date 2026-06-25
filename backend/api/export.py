"""Export router — Markdown, HTML, and PDF (via HTML→PDF)."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder

router = APIRouter(prefix="/export", tags=["export"])


def _build_markdown(project, requirements, blueprints, work_orders_map) -> str:
    lines = [f"# {project.name}", "", f"**Description:** {project.description}", ""]
    lines.append(f"_Created: {project.created_at}_")
    lines.append(f"_Template: {project.template or 'None'}_")
    lines.append("")

    if requirements:
        lines.append("---")
        lines.append("## Requirements")
        lines.append("")
        for i, req in enumerate(requirements, 1):
            req_id = getattr(req, "req_id", "") or ""
            status = req.status.value if hasattr(req.status, "value") else req.status
            lines.append(f"### {req_id} {req.title}")
            lines.append(f"- **Status:** {status} | **Priority:** {req.priority}")
            if req.description:
                lines.append(f"- **Description:** {req.description}")
            try:
                criteria = json.loads(req.acceptance_criteria_json or "[]")
                if criteria:
                    lines.append("- **Acceptance Criteria:**")
                    for j, c in enumerate(criteria, 1):
                        text = c if isinstance(c, str) else c.get("text", str(c))
                        lines.append(f"  - AC.{j}: {text}")
            except json.JSONDecodeError:
                pass
            lines.append("")

    if blueprints:
        lines.append("---")
        lines.append("## Blueprints")
        lines.append("")
        for bp in blueprints:
            bp_id = getattr(bp, "bp_id", "") or ""
            lines.append(f"### {bp_id} {bp.name} (v{bp.version})")
            if bp.description:
                lines.append(f"{bp.description}")
            lines.append("")
            dsl = getattr(bp, "dsl_content", "") or ""
            if dsl.strip():
                lines.append("**DSL:**")
                lines.append("```blueprint")
                lines.append(dsl)
                lines.append("```")
                lines.append("")
            try:
                decisions = json.loads(bp.decisions_json or "[]")
                if decisions:
                    lines.append("**Decisions:**")
                    for d in decisions:
                        lines.append(f"- {d.get('title', d) if isinstance(d, dict) else d}")
                    lines.append("")
            except json.JSONDecodeError:
                pass
            wos = work_orders_map.get(bp.id, [])
            if wos:
                lines.append("**Work Orders:**")
                for wo in wos:
                    s = wo.status.value if hasattr(wo.status, "value") else wo.status
                    lines.append(f"- [{s}] {wo.title}")
                lines.append("")

    lines.append("---")
    lines.append("_Exported from 1024 Studio_")
    return "\n".join(lines)


def _build_html(project, requirements, blueprints, work_orders_map) -> str:
    def esc(s):
        return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{esc(project.name)}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #111; line-height: 1.6; }}
  h1 {{ font-size: 28px; font-weight: 800; margin-bottom: 4px; }}
  h2 {{ font-size: 20px; font-weight: 700; margin-top: 32px; border-bottom: 2px solid #e5e5e5; padding-bottom: 6px; }}
  h3 {{ font-size: 15px; font-weight: 600; margin-top: 20px; color: #1a1a1a; }}
  .meta {{ font-size: 13px; color: #666; margin-bottom: 20px; }}
  .badge {{ display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }}
  .badge-req {{ background: #e8f0fe; color: #1a56db; font-family: monospace; }}
  .badge-bp  {{ background: #f3e8ff; color: #7c3aed; font-family: monospace; }}
  .badge-status {{ background: #f0fdf4; color: #15803d; }}
  .ac-list {{ margin: 6px 0 12px 0; padding: 0; list-style: none; }}
  .ac-list li {{ padding: 4px 0 4px 14px; border-left: 2px solid #d1fae5; margin-bottom: 3px; font-size: 13px; color: #333; }}
  .ac-id {{ font-size: 10px; font-family: monospace; color: #888; margin-right: 6px; }}
  pre {{ background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; font-size: 12px; overflow-x: auto; }}
  .wo-item {{ font-size: 13px; padding: 4px 0; color: #444; }}
  footer {{ margin-top: 48px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }}
  @media print {{ body {{ margin: 20px; }} }}
</style>
</head>
<body>
<h1>{esc(project.name)}</h1>
<div class="meta">
  {esc(project.description)}<br>
  <small>Created: {esc(project.created_at)} | Template: {esc(project.template or 'None')}</small>
</div>
"""
    if requirements:
        html += "<h2>Requirements</h2>\n"
        for req in requirements:
            req_id = esc(getattr(req, "req_id", "") or "")
            status = req.status.value if hasattr(req.status, "value") else str(req.status)
            html += f'<h3><span class="badge badge-req">{req_id}</span> {esc(req.title)}</h3>\n'
            html += f'<p><span class="badge badge-status">{esc(status)}</span> &nbsp; Priority: P{req.priority}</p>\n'
            if req.description:
                html += f"<p>{esc(req.description)}</p>\n"
            try:
                criteria = json.loads(req.acceptance_criteria_json or "[]")
                if criteria:
                    html += '<ul class="ac-list">\n'
                    for i, c in enumerate(criteria, 1):
                        text = c if isinstance(c, str) else c.get("text", str(c))
                        html += f'<li><span class="ac-id">AC.{i}</span>{esc(text)}</li>\n'
                    html += "</ul>\n"
            except Exception:
                pass

    if blueprints:
        html += "<h2>Blueprints</h2>\n"
        for bp in blueprints:
            bp_id = esc(getattr(bp, "bp_id", "") or "")
            html += f'<h3><span class="badge badge-bp">{bp_id}</span> {esc(bp.name)} <small>v{bp.version}</small></h3>\n'
            if bp.description:
                html += f"<p>{esc(bp.description)}</p>\n"
            dsl = getattr(bp, "dsl_content", "") or ""
            if dsl.strip():
                html += f"<pre>{esc(dsl)}</pre>\n"
            wos = work_orders_map.get(bp.id, [])
            if wos:
                html += "<p><strong>Work Orders:</strong></p>\n"
                for wo in wos:
                    s = wo.status.value if hasattr(wo.status, "value") else str(wo.status)
                    html += f'<div class="wo-item">[{esc(s)}] {esc(wo.title)}</div>\n'

    html += "<footer>Exported from 1024 Studio</footer>\n</body>\n</html>"
    return html


async def _fetch_data(project_id: str, db: AsyncSession):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.priority)
    )
    requirements = req_result.scalars().all()
    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id).order_by(Blueprint.version.desc())
    )
    blueprints = bp_result.scalars().all()
    work_orders_map = {}
    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id).order_by(WorkOrder.created_at)
        )
        work_orders_map[bp.id] = wo_result.scalars().all()
    return project, requirements, blueprints, work_orders_map


@router.get("/project/{project_id}/markdown")
async def export_markdown(project_id: str, db: AsyncSession = Depends(get_db)):
    project, reqs, bps, wos = await _fetch_data(project_id, db)
    md = _build_markdown(project, reqs, bps, wos)
    filename = f"{project.name.replace(' ', '_')}.md"
    return PlainTextResponse(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/project/{project_id}/html")
async def export_html(project_id: str, db: AsyncSession = Depends(get_db)):
    project, reqs, bps, wos = await _fetch_data(project_id, db)
    html = _build_html(project, reqs, bps, wos)
    filename = f"{project.name.replace(' ', '_')}.html"
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/project/{project_id}/pdf")
async def export_pdf(project_id: str, db: AsyncSession = Depends(get_db)):
    """PDF export via WeasyPrint if available; falls back to HTML with print stylesheet."""
    project, reqs, bps, wos = await _fetch_data(project_id, db)
    html = _build_html(project, reqs, bps, wos)

    try:
        from weasyprint import HTML as WP_HTML
        pdf_bytes = WP_HTML(string=html).write_pdf()
        filename = f"{project.name.replace(' ', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ImportError:
        # WeasyPrint not installed — return HTML with print hint
        hint = "<script>window.onload=()=>window.print();</script>"
        html_print = html.replace("</head>", f"{hint}</head>")
        return HTMLResponse(
            content=html_print,
            headers={
                "X-Export-Note": "WeasyPrint not installed; returning print-ready HTML",
                "Content-Disposition": f'inline; filename="{project.name}.html"',
            },
        )


@router.post("/project/{project_id}/git-init")
async def export_git_init(project_id: str, db: AsyncSession = Depends(get_db)):
    """Initialize a git repo and commit project docs to ~/1024Studio/exports/<project_name>/."""
    import os, subprocess, tempfile, pathlib

    project, reqs, bps, wos = await _fetch_data(project_id, db)
    md = _build_markdown(project, reqs, bps, wos)

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in project.name)
    export_dir = pathlib.Path.home() / "1024Studio" / "exports" / safe_name
    export_dir.mkdir(parents=True, exist_ok=True)

    md_path = export_dir / "README.md"
    md_path.write_text(md, encoding="utf-8")

    git = ["git", "-C", str(export_dir)]

    def run(*args):
        return subprocess.run([*git, *args], capture_output=True, text=True)

    # Init repo if needed
    if not (export_dir / ".git").exists():
        run("init")
        run("config", "user.email", "studio@1024.local")
        run("config", "user.name", "1024 Studio")

    run("add", "README.md")
    result = run("commit", "-m", f"Export: {project.name}")

    return {
        "path": str(export_dir),
        "committed": result.returncode == 0,
        "message": result.stdout.strip() or result.stderr.strip(),
    }
