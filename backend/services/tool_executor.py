"""Tool executor: file ops, subprocess (sandboxed), git operations."""
import asyncio
import json
import os
import shlex
from pathlib import Path
from typing import Any, Optional, List

MAX_FILE_BYTES = 64_000
MAX_OUTPUT_BYTES = 32_000

ALLOWED_BINARIES = {
    "python", "python3", "pytest", "ruff", "mypy",
    "npm", "node", "npx",
    "ls", "find", "grep", "cat", "head", "tail", "wc",
    "git",
}


def _safe_path(path: str, root: str) -> Path:
    """Resolve path and enforce it stays within root. Always requires root."""
    p = Path(path).resolve()
    r = Path(root).resolve()
    try:
        p.relative_to(r)
    except ValueError:
        raise PermissionError(f"Path '{path}' is outside allowed root '{root}'")
    return p


async def read_file(path: str, root: str) -> dict:
    try:
        p = _safe_path(path, root)
    except PermissionError as e:
        return {"error": str(e)}
    if not p.exists():
        return {"error": f"File not found: {path}"}
    if not p.is_file():
        return {"error": f"Not a regular file: {path}"}
    try:
        raw = await asyncio.to_thread(p.read_bytes)
        content = raw[:MAX_FILE_BYTES].decode("utf-8", errors="replace")
        return {"path": str(p), "content": content, "truncated": len(raw) > MAX_FILE_BYTES, "size": len(raw)}
    except Exception as e:
        return {"error": str(e)}


async def write_file(path: str, content: str, root: str) -> dict:
    try:
        p = _safe_path(path, root)
    except PermissionError as e:
        return {"error": str(e)}
    try:
        def _write():
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
        await asyncio.to_thread(_write)
        return {"path": str(p), "bytes_written": len(content.encode())}
    except Exception as e:
        return {"error": str(e)}


async def list_directory(path: str, root: str) -> dict:
    try:
        p = _safe_path(path, root)
    except PermissionError as e:
        return {"error": str(e)}
    if not p.exists():
        return {"error": f"Directory not found: {path}"}
    if not p.is_dir():
        return {"error": f"Not a directory: {path}"}

    def _list():
        items = []
        for item in sorted(p.iterdir()):
            entry: dict = {"name": item.name, "type": "dir" if item.is_dir() else "file"}
            if item.is_file():
                entry["size"] = item.stat().st_size
            items.append(entry)
        return items

    items = await asyncio.to_thread(_list)
    return {"path": str(p), "count": len(items), "items": items}


async def run_command(command: str, cwd: Optional[str] = None, timeout: int = 30) -> dict:
    try:
        parts = shlex.split(command)
    except ValueError as e:
        return {"error": f"Invalid command: {e}"}

    if not parts:
        return {"error": "Empty command"}

    binary = os.path.basename(parts[0])
    if binary not in ALLOWED_BINARIES:
        return {"error": f"'{binary}' is not in the allowed command list: {sorted(ALLOWED_BINARIES)}"}

    try:
        proc = await asyncio.create_subprocess_exec(
            *parts,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        try:
            stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {"error": f"Command timed out after {timeout}s", "exit_code": -1}

        stdout = stdout_b.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES]
        stderr = stderr_b.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES]
        return {"stdout": stdout, "stderr": stderr, "exit_code": proc.returncode}
    except FileNotFoundError:
        return {"error": f"Command not found: {parts[0]}"}
    except Exception as e:
        return {"error": str(e)}


async def git_status(cwd: str) -> dict:
    r = await run_command("git status --porcelain", cwd=cwd)
    if r.get("exit_code") != 0:
        return {"error": r.get("stderr", "git status failed")}
    lines = [l for l in r["stdout"].splitlines() if l.strip()]
    return {"cwd": cwd, "changes": lines, "clean": len(lines) == 0}


async def git_diff(cwd: str, staged: bool = False) -> dict:
    cmd = "git diff --staged" if staged else "git diff"
    r = await run_command(cmd, cwd=cwd)
    return {"diff": r.get("stdout", ""), "exit_code": r.get("exit_code")}


async def git_log(cwd: str, n: int = 10) -> dict:
    r = await run_command(f"git log --oneline -{n}", cwd=cwd)
    if r.get("exit_code") != 0:
        return {"error": r.get("stderr")}
    return {"log": r["stdout"].strip()}


async def git_add(files: List[str], cwd: str) -> dict:
    quoted = " ".join(shlex.quote(f) for f in files)
    r = await run_command(f"git add {quoted}", cwd=cwd)
    return {
        "added": files,
        "exit_code": r.get("exit_code"),
        "error": r.get("stderr") if r.get("exit_code") != 0 else None,
    }


async def git_commit(message: str, cwd: str) -> dict:
    r = await run_command(f"git commit -m {shlex.quote(message)}", cwd=cwd)
    return {
        "stdout": r.get("stdout"),
        "exit_code": r.get("exit_code"),
        "error": r.get("stderr") if r.get("exit_code") != 0 else None,
    }


async def search_files(pattern: str, path: str, root: str, file_pattern: str = "*") -> dict:
    """Grep for a pattern in files under path."""
    try:
        p = _safe_path(path, root)
    except PermissionError as e:
        return {"error": str(e)}
    r = await run_command(
        f"grep -r --include={shlex.quote(file_pattern)} -n {shlex.quote(pattern)} {shlex.quote(str(p))}",
        cwd=str(p),
    )
    lines = r.get("stdout", "").splitlines()[:200]
    return {"matches": lines, "count": len(lines)}


TOOL_REGISTRY: dict = {
    "read_file": read_file,
    "write_file": write_file,
    "list_directory": list_directory,
    "run_command": run_command,
    "git_status": git_status,
    "git_diff": git_diff,
    "git_log": git_log,
    "git_add": git_add,
    "git_commit": git_commit,
    "search_files": search_files,
}


async def execute_tool(name: str, args: dict) -> Any:
    fn = TOOL_REGISTRY.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}. Available: {list(TOOL_REGISTRY.keys())}"}
    return await fn(**args)


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file from disk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute or relative path to the file"},
                    "root": {"type": "string", "description": "Root directory to restrict access (required)"},
                },
                "required": ["path", "root"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file. Creates parent directories as needed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                    "root": {"type": "string", "description": "Root directory to restrict access (required)"},
                },
                "required": ["path", "content", "root"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and subdirectories in a directory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "root": {"type": "string", "description": "Root directory to restrict access (required)"},
                },
                "required": ["path", "root"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run a shell command. Allowed binaries: python, pytest, ruff, npm, node, ls, find, grep, cat, head, tail, git.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The full command string to execute"},
                    "cwd": {"type": "string", "description": "Working directory"},
                    "timeout": {"type": "integer", "default": 30, "description": "Timeout in seconds"},
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_status",
            "description": "Get the git working tree status (modified, untracked files).",
            "parameters": {
                "type": "object",
                "properties": {"cwd": {"type": "string", "description": "Repository root"}},
                "required": ["cwd"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_diff",
            "description": "Show unstaged (or staged) changes as a unified diff.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cwd": {"type": "string"},
                    "staged": {"type": "boolean", "default": False},
                },
                "required": ["cwd"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_log",
            "description": "Show recent git commit history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cwd": {"type": "string"},
                    "n": {"type": "integer", "default": 10, "description": "Number of commits to show"},
                },
                "required": ["cwd"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_add",
            "description": "Stage files for a git commit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "files": {"type": "array", "items": {"type": "string"}},
                    "cwd": {"type": "string"},
                },
                "required": ["files", "cwd"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_commit",
            "description": "Create a git commit with a message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "cwd": {"type": "string"},
                },
                "required": ["message", "cwd"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Search for a text pattern across files in a directory (grep).",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Pattern to search for"},
                    "path": {"type": "string", "description": "Directory to search in"},
                    "root": {"type": "string", "description": "Root directory to restrict access (required)"},
                    "file_pattern": {"type": "string", "default": "*", "description": "File glob, e.g. '*.py'"},
                },
                "required": ["pattern", "path", "root"],
            },
        },
    },
]
