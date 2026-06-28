"""
Live Assistance: embeddable widget JS, friction detection, RAG support chat.
"""
import json
import logging
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.database import Requirement, Blueprint, KGNode

log = logging.getLogger(__name__)

# ── Widget JS template ────────────────────────────────────────────────────────

def generate_widget_js(project_id: str, api_base: str = "http://localhost:8099") -> str:
    """Generate the embeddable JavaScript widget snippet."""
    return f"""
/* 1024 Studio Live Assistance Widget — project: {project_id} */
(function() {{
  const PROJECT_ID = "{project_id}";
  const API_BASE   = "{api_base}";
  const SESSION_ID = Math.random().toString(36).slice(2);
  let rageClickTracker = {{}};

  function postEvent(type, severity, page_url, selector, message, meta) {{
    fetch(API_BASE + "/live-assist/events", {{
      method: "POST",
      headers: {{ "Content-Type": "application/json" }},
      body: JSON.stringify({{
        project_id: PROJECT_ID, session_id: SESSION_ID,
        event_type: type, severity: severity,
        page_url: page_url || location.href,
        element_selector: selector || "",
        message: message || "",
        metadata_json: JSON.stringify(meta || {{}})
      }})
    }}).catch(function() {{}});
  }}

  /* Rage click: 3+ clicks on same element within 1.5s */
  document.addEventListener("click", function(e) {{
    var sel = (e.target.id ? "#" + e.target.id : e.target.tagName).toLowerCase();
    var now = Date.now();
    if (!rageClickTracker[sel]) rageClickTracker[sel] = [];
    rageClickTracker[sel] = rageClickTracker[sel].filter(function(t) {{ return now - t < 1500; }});
    rageClickTracker[sel].push(now);
    if (rageClickTracker[sel].length >= 3) {{
      postEvent("rage_click", "warning", location.href, sel, "Rage click detected on " + sel, {{clicks: rageClickTracker[sel].length}});
      rageClickTracker[sel] = [];
    }}
  }}, true);

  /* JS errors */
  window.addEventListener("error", function(e) {{
    postEvent("error", "critical", location.href, "", e.message, {{filename: e.filename, lineno: e.lineno}});
  }});

  window.addEventListener("unhandledrejection", function(e) {{
    postEvent("error", "warning", location.href, "", String(e.reason), {{}});
  }});

  /* Support chat button */
  var btn = document.createElement("button");
  btn.id = "studio1024-help-btn";
  btn.textContent = "?";
  btn.style.cssText = "position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;background:#0071E3;color:#fff;font-size:20px;font-weight:700;border:none;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.2);z-index:9999;";
  document.body.appendChild(btn);

  var panel = document.createElement("div");
  panel.id = "studio1024-panel";
  panel.style.cssText = "display:none;position:fixed;bottom:80px;right:24px;width:320px;height:420px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);z-index:9999;flex-direction:column;overflow:hidden;font-family:system-ui,sans-serif;";
  panel.innerHTML = '<div style="background:#0071E3;color:#fff;padding:12px 16px;font-weight:600;font-size:14px;">Help &amp; Support</div><div id="s1024-msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;"></div><div style="padding:8px;border-top:1px solid #e5e5e5;display:flex;gap:6px;"><input id="s1024-inp" placeholder="Ask a question…" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"/><button id="s1024-send" style="background:#0071E3;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;">Send</button></div>';
  document.body.appendChild(panel);

  btn.addEventListener("click", function() {{
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
    panel.style.flexDirection = "column";
  }});

  function addMsg(text, isUser) {{
    var msgs = document.getElementById("s1024-msgs");
    var el = document.createElement("div");
    el.style.cssText = "margin-bottom:8px;padding:8px 10px;border-radius:8px;max-width:90%;" + (isUser ? "background:#EBF5FF;margin-left:auto;text-align:right;" : "background:#F5F5F5;");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }}

  document.getElementById("s1024-send").addEventListener("click", function() {{
    var inp = document.getElementById("s1024-inp");
    var q = inp.value.trim();
    if (!q) return;
    inp.value = "";
    addMsg(q, true);
    postEvent("feedback", "info", location.href, "", q, {{}});
    fetch(API_BASE + "/live-assist/chat", {{
      method: "POST",
      headers: {{ "Content-Type": "application/json" }},
      body: JSON.stringify({{ project_id: PROJECT_ID, question: q, page_url: location.href }})
    }}).then(function(r) {{ return r.json(); }})
      .then(function(d) {{ addMsg(d.answer || "Sorry, I couldn't find an answer.", false); }})
      .catch(function() {{ addMsg("Unable to reach support. Please try again.", false); }});
  }});
}})();
""".strip()


# ── RAG Support ───────────────────────────────────────────────────────────────

async def rag_answer(question: str, project_id: str, page_url: str, db: AsyncSession) -> str:
    """Answer a user question using requirements and blueprints as context."""
    # Gather context from requirements
    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).limit(20)
    )
    reqs = req_result.scalars().all()

    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id).limit(5)
    )
    blueprints = bp_result.scalars().all()

    q_lower = question.lower()
    relevant_reqs = [r for r in reqs if any(w in r.title.lower() or w in r.description.lower()
                                             for w in q_lower.split() if len(w) > 3)]
    relevant_bps  = [b for b in blueprints if any(w in b.name.lower() or w in b.description.lower()
                                                   for w in q_lower.split() if len(w) > 3)]

    context_parts = []
    for r in relevant_reqs[:5]:
        context_parts.append(f"Requirement {r.req_id or r.id}: {r.title}\n{r.description}")
    for b in relevant_bps[:3]:
        context_parts.append(f"Blueprint: {b.name}\n{b.description}")

    context = "\n\n".join(context_parts) or "No directly relevant documentation found."

    prompt = f"""You are a helpful support assistant for a software product. Answer the user's question based on the product documentation below.

Page the user is on: {page_url}

Product Documentation:
{context}

User Question: {question}

Give a concise, helpful answer (2-4 sentences). If the documentation doesn't cover the question, say so and suggest contacting the team."""

    from backend.services.llm_client import llm_client
    return await llm_client.complete(prompt, agent_type="live_assist")
