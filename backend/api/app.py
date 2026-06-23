"""Main FastAPI application — registers all routers, CORS, lifespan."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import settings
from backend.models.engine import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables + seed templates."""
    await init_db()
    # Seed default templates
    from backend.models.engine import AsyncSessionLocal
    from backend.seeds.templates import seed_templates
    async with AsyncSessionLocal() as db:
        await seed_templates(db)
    yield


app = FastAPI(
    title="1024 Studio",
    description="AI-native SDLC platform — local, free, open-source",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Import all routers ---
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

# --- Register all routers ---
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
