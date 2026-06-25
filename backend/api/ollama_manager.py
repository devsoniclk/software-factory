"""Ollama / provider management router."""
import httpx
import json
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.config.settings import settings, PROVIDERS
from backend.services.llm_client import llm_client
from backend.models.schemas import SwitchProviderRequest, PullModelRequest

router = APIRouter(prefix="/ollama", tags=["ollama"])

OLLAMA_BASE = "http://127.0.0.1:11434"


@router.get("/status")
async def provider_status():
    """Get current provider status."""
    provider_cfg = PROVIDERS.get(settings.active_provider, {})
    is_ollama = settings.active_provider == "ollama"
    ollama_running = False
    if is_ollama:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{OLLAMA_BASE}/api/tags")
                ollama_running = resp.status_code == 200
        except Exception:
            pass
    status = "running" if (not is_ollama or ollama_running) else "not_running"
    return {
        "provider": settings.active_provider,
        "provider_name": provider_cfg.get("name", ""),
        "model": settings.active_model,
        "status": status,
        "offline": provider_cfg.get("offline", False),
        "ollama_running": ollama_running if is_ollama else None,
    }


@router.get("/models")
async def list_models():
    """List popular models (from config) + installed Ollama models."""
    provider_cfg = PROVIDERS.get(settings.active_provider, {})
    popular = provider_cfg.get("models", [])

    installed = []
    if settings.active_provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{OLLAMA_BASE}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    installed = [m["name"] for m in data.get("models", [])]
        except Exception:
            pass

    return {
        "provider": settings.active_provider,
        "popular": popular,
        "installed": installed,
        "current_model": settings.active_model,
    }


@router.post("/pull")
async def pull_model(body: PullModelRequest):
    """Pull/download an Ollama model."""
    if settings.active_provider != "ollama":
        raise HTTPException(status_code=400, detail="Pull only works with Ollama provider")
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{OLLAMA_BASE}/api/pull", json={"name": body.name})
            resp.raise_for_status()
            return {"status": "pulling", "model": body.name}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pull/stream")
async def pull_model_stream(name: str):
    """Pull/download an Ollama model with SSE progress streaming."""
    if settings.active_provider != "ollama":
        raise HTTPException(status_code=400, detail="Pull only works with Ollama provider")

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream("POST", f"{OLLAMA_BASE}/api/pull", json={"name": name}) as resp:
                    if resp.status_code != 200:
                        yield f"data: {json.dumps({'error': f'Ollama returned {resp.status_code}'})}\n\n"
                        return
                    async for line in resp.aiter_lines():
                        if line.strip():
                            yield f"data: {line}\n\n"
            yield f"data: {json.dumps({'status': 'done', 'model': name})}\n\n"
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Ollama is not running. Start it with: ollama serve'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/switch")
async def switch_provider(body: SwitchProviderRequest):
    """Switch active provider and/or model."""
    try:
        llm_client.set_provider(body.provider, body.model, body.api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "provider": llm_client.provider,
        "model": llm_client.model,
    }


@router.post("/benchmark")
async def benchmark():
    """Quick benchmark: send a simple prompt, measure latency."""
    start = time.time()
    try:
        result = await llm_client.chat(
            [{"role": "user", "content": "Say 'pong' and nothing else."}],
            max_tokens=10,
        )
        elapsed = time.time() - start
        return {
            "provider": llm_client.provider,
            "model": llm_client.model,
            "response": result.strip(),
            "latency_seconds": round(elapsed, 2),
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "provider": llm_client.provider,
            "model": llm_client.model,
            "error": str(e),
            "latency_seconds": round(elapsed, 2),
        }
