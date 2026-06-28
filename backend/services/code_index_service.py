"""Code indexing: walk repo files, extract symbols, store embeddings."""
import ast, json, logging, os, re
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.database import Repository, CodeSymbol, uid, now_iso

log = logging.getLogger(__name__)

# ─── Language detection ────────────────────────────────────────────────────────
LANG_MAP = {
    ".py": "python", ".ts": "typescript", ".tsx": "tsx",
    ".js": "javascript", ".jsx": "jsx", ".go": "go",
    ".rs": "rust", ".java": "java", ".rb": "ruby",
}

def _detect_lang(path: str) -> str:
    return LANG_MAP.get(Path(path).suffix.lower(), "")

# ─── Python AST extraction ─────────────────────────────────────────────────────
def _extract_python(source: str, file_path: str) -> List[dict]:
    symbols = []
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            sym_type = "function"
            parent = getattr(node, "_parent", None)
            if parent and isinstance(parent, ast.ClassDef):
                sym_type = "method"
            args = [a.arg for a in node.args.args]
            sig = f"def {node.name}({', '.join(args)})"
            doc = ast.get_docstring(node) or ""
            body_lines = source.splitlines()[node.lineno:min(node.lineno+20, node.end_lineno or node.lineno+20)]
            symbols.append({
                "name": node.name, "symbol_type": sym_type,
                "line_start": node.lineno, "line_end": getattr(node, "end_lineno", node.lineno),
                "signature": sig, "docstring": doc, "body_preview": "\n".join(body_lines)[:500],
            })
        elif isinstance(node, ast.ClassDef):
            doc = ast.get_docstring(node) or ""
            body_lines = source.splitlines()[node.lineno:min(node.lineno+10, node.end_lineno or node.lineno+10)]
            symbols.append({
                "name": node.name, "symbol_type": "class",
                "line_start": node.lineno, "line_end": getattr(node, "end_lineno", node.lineno),
                "signature": f"class {node.name}", "docstring": doc, "body_preview": "\n".join(body_lines)[:500],
            })
    # Annotate parent class for method detection
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for child in ast.walk(node):
                child._parent = node
    return symbols

# ─── Generic regex extraction (JS/TS/Go/etc.) ─────────────────────────────────
_PATTERNS = [
    ("class",    re.compile(r'^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)', re.M)),
    ("interface",re.compile(r'^(?:export\s+)?interface\s+(\w+)', re.M)),
    ("function", re.compile(r'^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)', re.M)),
    ("function", re.compile(r'^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>', re.M)),
]

def _extract_generic(source: str, lang: str) -> List[dict]:
    symbols = []
    lines = source.splitlines()
    for sym_type, pat in _PATTERNS:
        for m in pat.finditer(source):
            line_no = source[:m.start()].count('\n') + 1
            name = m.group(1)
            sig = m.group(0)[:120].split('\n')[0]
            preview_end = min(line_no + 15, len(lines))
            symbols.append({
                "name": name, "symbol_type": sym_type,
                "line_start": line_no, "line_end": line_no,
                "signature": sig.strip(), "docstring": "", "body_preview": "\n".join(lines[line_no-1:preview_end])[:500],
            })
    return symbols

# ─── Embedding via Ollama ──────────────────────────────────────────────────────
async def _embed(text: str) -> Optional[List[float]]:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("http://localhost:11434/api/embeddings", json={"model": "nomic-embed-text", "prompt": text[:2000]})
            if r.status_code == 200:
                return r.json().get("embedding")
    except Exception as e:
        log.debug("Embedding unavailable: %s", e)
    return None

def _cosine(a: List[float], b: List[float]) -> float:
    import math
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(x*x for x in b))
    return dot / (na * nb) if na and nb else 0.0

# ─── File walker ───────────────────────────────────────────────────────────────
def _should_include(rel: str, includes: List[str], excludes: List[str]) -> bool:
    import fnmatch
    for pat in excludes:
        if fnmatch.fnmatch(rel, pat) or any(fnmatch.fnmatch(part, pat.strip("*/")) for part in Path(rel).parts):
            return False
    return any(fnmatch.fnmatch(rel, pat) for pat in includes)

# ─── Main indexer ──────────────────────────────────────────────────────────────
async def index_repository(repo_id: str, db: AsyncSession) -> dict:
    repo = await db.get(Repository, repo_id)
    if not repo:
        return {"error": "Repository not found"}

    root = Path(repo.local_path)
    if not root.exists():
        repo.status = "error"
        repo.error_message = f"Path not found: {root}"
        await db.commit()
        return {"error": repo.error_message}

    repo.status = "indexing"
    await db.commit()

    includes = json.loads(repo.include_patterns_json or '["**/*.py","**/*.ts"]')
    excludes = json.loads(repo.exclude_patterns_json or '["**/node_modules/**"]')

    # Clear existing symbols for this repo
    await db.execute(delete(CodeSymbol).where(CodeSymbol.repo_id == repo_id))
    await db.commit()

    count = 0
    errors = []
    for fpath in root.rglob("*"):
        if not fpath.is_file():
            continue
        rel = str(fpath.relative_to(root))
        if not _should_include(rel, includes, excludes):
            continue
        lang = _detect_lang(rel)
        if not lang:
            continue
        try:
            source = fpath.read_text(encoding="utf-8", errors="replace")
            if len(source) > 200_000:  # skip huge files
                continue
            if lang == "python":
                raw_syms = _extract_python(source, rel)
            else:
                raw_syms = _extract_generic(source, lang)

            for s in raw_syms:
                text_for_embed = f"{s['name']} {s['signature']} {s['docstring'][:300]}"
                embedding = await _embed(text_for_embed)
                sym = CodeSymbol(
                    id=uid(), repo_id=repo_id, file_path=rel,
                    language=lang, **s,
                    qualified_name=f"{rel.replace('/', '.').replace('.py','')}.{s['name']}",
                    embedding_json=json.dumps(embedding) if embedding else None,
                )
                db.add(sym)
                count += 1
            if count % 100 == 0:
                await db.commit()
        except Exception as e:
            errors.append(f"{rel}: {e}")

    await db.commit()
    repo.status = "ready"
    repo.symbol_count = count
    repo.last_indexed_at = now_iso()
    repo.error_message = "; ".join(errors[:5]) if errors else ""
    await db.commit()
    return {"symbols": count, "errors": len(errors)}


async def search_symbols(query: str, repo_id: str, db: AsyncSession, limit: int = 20) -> List[dict]:
    """Search symbols: embedding similarity if available, else full-text name match."""
    result = await db.execute(select(CodeSymbol).where(CodeSymbol.repo_id == repo_id))
    symbols = result.scalars().all()

    q_embed = await _embed(query)
    scored = []
    query_lower = query.lower()

    for s in symbols:
        if q_embed and s.embedding_json:
            try:
                s_embed = json.loads(s.embedding_json)
                score = _cosine(q_embed, s_embed)
            except Exception:
                score = 0.0
        else:
            # Fallback: simple keyword match
            score = 0.0
            if query_lower in s.name.lower():
                score = 0.9
            elif query_lower in (s.docstring or "").lower():
                score = 0.5
            elif query_lower in (s.body_preview or "").lower():
                score = 0.3
        if score > 0.1:
            scored.append((score, s))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "id": s.id, "name": s.name, "symbol_type": s.symbol_type,
            "file_path": s.file_path, "line_start": s.line_start,
            "signature": s.signature, "docstring": s.docstring,
            "body_preview": s.body_preview, "language": s.language,
            "score": round(score, 4),
        }
        for score, s in scored[:limit]
    ]


async def answer_code_question(question: str, repo_id: str, db: AsyncSession) -> dict:
    """Find relevant symbols and return grounded context for a Q&A query."""
    symbols = await search_symbols(question, repo_id, db, limit=5)
    context_parts = []
    for s in symbols:
        context_parts.append(
            f"# {s['symbol_type']} `{s['name']}` in `{s['file_path']}` (line {s['line_start']})\n"
            f"{s['signature']}\n{s['docstring']}\n\n{s['body_preview']}"
        )
    return {"context": "\n\n---\n\n".join(context_parts), "symbols": symbols}
