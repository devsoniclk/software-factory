"""
MCP (Model Context Protocol) server for 1024 Studio.

Implements JSON-RPC 2.0 over HTTP at /mcp so Claude Code and Cursor
can connect and access work orders, blueprints, and code context.

Add to Claude Code via:
  claude mcp add studio-1024 --transport http --url http://localhost:8099/mcp
"""
import json
import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from backend.models.engine import AsyncSessionLocal
from backend.models.database import WorkOrder, Blueprint, Project, WOStatus

log = logging.getLogger(__name__)
router = APIRouter(prefix="/mcp", tags=["mcp"])

# ── MCP Protocol helpers ───────────────────────────────────────────────────────

def _ok(id, result):
    return {"jsonrpc": "2.0", "id": id, "result": result}

def _err(id, code, message, data=None):
    err = {"code": code, "message": message}
    if data: err["data"] = data
    return {"jsonrpc": "2.0", "id": id, "error": err}

# ── Tool definitions ───────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "list_work_orders",
        "description": "List work orders for a blueprint or project. Returns id, wo_id, title, status, description.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "blueprint_id": {"type": "string", "description": "Filter by blueprint ID"},
                "project_id": {"type": "string", "description": "Filter by project (returns WOs from all blueprints)"},
                "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "blocked"], "description": "Filter by status"},
            },
        },
    },
    {
        "name": "get_work_order",
        "description": "Get full details of a specific work order including description, context, and AI output.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "work_order_id": {"type": "string", "description": "The internal UUID of the work order"},
                "wo_id": {"type": "string", "description": "The human-readable WO-PREFIX-NNN id (e.g. WO-AUTH-001)"},
            },
        },
    },
    {
        "name": "update_work_order_status",
        "description": "Transition a work order's status. Valid transitions: pending→in_progress, in_progress→completed|blocked, blocked→in_progress, completed→in_progress.",
        "inputSchema": {
            "type": "object",
            "required": ["work_order_id", "new_status"],
            "properties": {
                "work_order_id": {"type": "string", "description": "The internal UUID of the work order"},
                "new_status": {"type": "string", "enum": ["pending", "in_progress", "completed", "blocked"]},
                "output": {"type": "string", "description": "Optional: AI output or completion notes to attach"},
            },
        },
    },
    {
        "name": "search_context",
        "description": "Search requirements, blueprints, and work orders for context relevant to a query.",
        "inputSchema": {
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "project_id": {"type": "string", "description": "Limit to a specific project"},
                "types": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["requirements", "blueprints", "work_orders"]},
                    "description": "Which entity types to search (default: all)",
                },
            },
        },
    },
]

VALID_TRANSITIONS = {
    "pending": ["in_progress"],
    "in_progress": ["completed", "blocked"],
    "blocked": ["in_progress"],
    "completed": ["in_progress"],
}

# ── Tool handlers ─────────────────────────────────────────────────────────────

async def _list_work_orders(args: dict) -> dict:
    blueprint_id = args.get("blueprint_id")
    project_id = args.get("project_id")
    status_filter = args.get("status")

    async with AsyncSessionLocal() as db:
        if blueprint_id:
            q = select(WorkOrder).where(WorkOrder.blueprint_id == blueprint_id)
        elif project_id:
            bp_result = await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))
            bp_ids = [bp.id for bp in bp_result.scalars().all()]
            q = select(WorkOrder).where(WorkOrder.blueprint_id.in_(bp_ids))
        else:
            q = select(WorkOrder)

        if status_filter:
            q = q.where(WorkOrder.status == WOStatus(status_filter))

        result = await db.execute(q.order_by(WorkOrder.created_at.desc()).limit(50))
        wos = result.scalars().all()

        return {
            "work_orders": [
                {
                    "id": wo.id, "wo_id": wo.wo_id, "title": wo.title,
                    "status": wo.status.value if hasattr(wo.status, "value") else wo.status,
                    "description": wo.description, "blueprint_id": wo.blueprint_id,
                    "created_at": wo.created_at,
                }
                for wo in wos
            ],
            "count": len(wos),
        }


async def _get_work_order(args: dict) -> dict:
    work_order_id = args.get("work_order_id")
    wo_id_str = args.get("wo_id")

    async with AsyncSessionLocal() as db:
        if work_order_id:
            wo = await db.get(WorkOrder, work_order_id)
        elif wo_id_str:
            result = await db.execute(select(WorkOrder).where(WorkOrder.wo_id == wo_id_str))
            wo = result.scalar_one_or_none()
        else:
            return {"error": "Provide work_order_id or wo_id"}

        if not wo:
            return {"error": "Work order not found"}

        bp = await db.get(Blueprint, wo.blueprint_id)

        return {
            "id": wo.id, "wo_id": wo.wo_id, "title": wo.title,
            "status": wo.status.value if hasattr(wo.status, "value") else wo.status,
            "description": wo.description,
            "context": json.loads(wo.context_json or "{}"),
            "ai_output": wo.ai_output,
            "git_commit": wo.git_commit,
            "blueprint_name": bp.name if bp else "",
            "created_at": wo.created_at,
        }


async def _update_work_order_status(args: dict) -> dict:
    work_order_id = args.get("work_order_id")
    new_status = args.get("new_status")
    output = args.get("output", "")

    async with AsyncSessionLocal() as db:
        wo = await db.get(WorkOrder, work_order_id)
        if not wo:
            return {"error": "Work order not found"}

        current = wo.status.value if hasattr(wo.status, "value") else wo.status
        allowed = VALID_TRANSITIONS.get(current, [])
        if new_status not in allowed:
            return {"error": f"Invalid transition from '{current}' to '{new_status}'. Allowed: {allowed}"}

        wo.status = WOStatus(new_status)
        if output:
            wo.ai_output = output
        await db.commit()
        return {"id": wo.id, "wo_id": wo.wo_id, "status": new_status, "success": True}


async def _search_context(args: dict) -> dict:
    query = args.get("query", "").lower()
    project_id = args.get("project_id")
    types = set(args.get("types") or ["requirements", "blueprints", "work_orders"])

    results = []
    async with AsyncSessionLocal() as db:
        if "requirements" in types:
            from backend.models.database import Requirement
            q = select(Requirement)
            if project_id:
                q = q.where(Requirement.project_id == project_id)
            r = await db.execute(q.limit(200))
            for req in r.scalars().all():
                text = f"{req.title} {req.description}".lower()
                if query in text:
                    results.append({
                        "type": "requirement", "id": req.id,
                        "title": req.title, "description": req.description[:300],
                        "status": req.status.value if hasattr(req.status, "value") else req.status,
                    })

        if "blueprints" in types:
            q = select(Blueprint)
            if project_id:
                q = q.where(Blueprint.project_id == project_id)
            r = await db.execute(q.limit(100))
            for bp in r.scalars().all():
                text = f"{bp.name} {bp.description} {bp.dsl_content}".lower()
                if query in text:
                    results.append({
                        "type": "blueprint", "id": bp.id,
                        "title": bp.name, "description": bp.description[:300],
                        "dsl_excerpt": bp.dsl_content[:500] if bp.dsl_content else "",
                    })

        if "work_orders" in types:
            q = select(WorkOrder)
            if project_id:
                bp_result = await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))
                bp_ids = [bp.id for bp in bp_result.scalars().all()]
                q = q.where(WorkOrder.blueprint_id.in_(bp_ids))
            r = await db.execute(q.limit(200))
            for wo in r.scalars().all():
                text = f"{wo.title} {wo.description}".lower()
                if query in text:
                    results.append({
                        "type": "work_order", "id": wo.id, "wo_id": wo.wo_id,
                        "title": wo.title, "description": wo.description[:300],
                        "status": wo.status.value if hasattr(wo.status, "value") else wo.status,
                    })

    return {"query": query, "results": results[:30], "count": len(results)}


# ── Main MCP endpoint ──────────────────────────────────────────────────────────

@router.post("")
async def mcp_endpoint(request: Request):
    """Handle MCP JSON-RPC 2.0 requests."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(_err(None, -32700, "Parse error"), status_code=400)

    req_id = body.get("id")
    method = body.get("method", "")
    params = body.get("params", {})

    log.debug("MCP request: method=%s id=%s", method, req_id)

    if method == "initialize":
        return JSONResponse(_ok(req_id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "1024-studio", "version": "0.1.0"},
        }))

    elif method == "notifications/initialized":
        return JSONResponse({}, status_code=200)

    elif method == "tools/list":
        return JSONResponse(_ok(req_id, {"tools": TOOLS}))

    elif method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        try:
            if tool_name == "list_work_orders":
                result = await _list_work_orders(arguments)
            elif tool_name == "get_work_order":
                result = await _get_work_order(arguments)
            elif tool_name == "update_work_order_status":
                result = await _update_work_order_status(arguments)
            elif tool_name == "search_context":
                result = await _search_context(arguments)
            else:
                return JSONResponse(_err(req_id, -32601, f"Unknown tool: {tool_name}"))

            return JSONResponse(_ok(req_id, {
                "content": [{"type": "text", "text": json.dumps(result, indent=2)}],
                "isError": "error" in result,
            }))
        except Exception as e:
            log.exception("Tool call error: %s", e)
            return JSONResponse(_err(req_id, -32603, f"Internal error: {e}"))

    elif method == "ping":
        return JSONResponse(_ok(req_id, {}))

    else:
        return JSONResponse(_err(req_id, -32601, f"Method not found: {method}"))


@router.get("")
async def mcp_info():
    """Return MCP server info and connection instructions."""
    return {
        "name": "1024-studio",
        "version": "0.1.0",
        "protocol": "MCP JSON-RPC 2.0",
        "tools": [t["name"] for t in TOOLS],
        "connect": {
            "claude_code": "claude mcp add studio-1024 --transport http --url http://localhost:8099/mcp",
            "cursor": "Add to .cursor/mcp.json: {\"studio-1024\": {\"url\": \"http://localhost:8099/mcp\"}}",
        },
    }
