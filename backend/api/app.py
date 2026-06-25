"""Main FastAPI application: registers all routers, CORS, lifespan, security middleware."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import settings
from backend.models.engine import init_db
from backend.api.middleware import SecurityHeadersMiddleware, RequestSizeLimitMiddleware


async def _cache_eviction_loop():
    """Periodically evict expired cache entries (every 10 minutes)."""
    from backend.services.token_engine import token_engine
    import logging
    log = logging.getLogger(__name__)
    while True:
        await asyncio.sleep(600)
        evicted = token_engine.evict_expired()
        if evicted:
            log.info("Token cache: evicted %d expired entries", evicted)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from backend.models.engine import AsyncSessionLocal
    from backend.seeds.templates import seed_templates
    async with AsyncSessionLocal() as db:
        await seed_templates(db)

    # Start background cache eviction
    eviction_task = asyncio.create_task(_cache_eviction_loop())

    yield

    eviction_task.cancel()
    # Shutdown: close persistent HTTP client
    from backend.services.llm_client import llm_client
    await llm_client.close()


app = FastAPI(
    title="1024 Studio",
    description="AI-native SDLC platform: local, free, open-source",
    version="0.1.0",
    lifespan=lifespan,
    # Disable automatic OpenAPI docs in production-like environments
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

# ── Security headers (innermost — applied to every response) ──────────────────
app.add_middleware(SecurityHeadersMiddleware)

# ── Request body size limit (1 MB; AI endpoints can raise this selectively) ───
app.add_middleware(RequestSizeLimitMiddleware, max_bytes=2 * 1024 * 1024)

# ── CORS: explicit allowlist only — never use "*" with credentials ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,   # explicit list, no wildcard
    allow_credentials=False,               # credentials don't apply to localhost API
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=[],
    max_age=600,
)

# ── Routers ───────────────────────────────────────────────────────────────────
from backend.api.health import router as health_router
from backend.api.projects import router as projects_router
from backend.api.requirements import router as requirements_router
from backend.api.blueprints import router as blueprints_router
from backend.api.work_orders import router as work_orders_router
from backend.api.feedback import router as feedback_router
from backend.api.tests_api import router as tests_router
from backend.api.audit import router as audit_router
from backend.api.knowledge_graph import router as kg_router
from backend.api.ai_endpoints import router as ai_router
from backend.api.ollama_manager import router as ollama_router
from backend.api.export import router as export_router
from backend.api.referrals import router as referrals_router
from backend.api.token_usage import router as token_usage_router
from backend.api.versions import router as versions_router
from backend.api.templates import router as templates_router
from backend.api.er_diagram import router as er_router
from backend.api.analytics import router as analytics_router

app.include_router(health_router)
app.include_router(projects_router)
app.include_router(requirements_router)
app.include_router(blueprints_router)
app.include_router(work_orders_router)
app.include_router(feedback_router)
app.include_router(tests_router)
app.include_router(audit_router)
app.include_router(kg_router)
app.include_router(ai_router)
app.include_router(ollama_router)
app.include_router(export_router)
app.include_router(referrals_router)
app.include_router(token_usage_router)
app.include_router(versions_router)
app.include_router(templates_router)
app.include_router(er_router)
app.include_router(analytics_router)
