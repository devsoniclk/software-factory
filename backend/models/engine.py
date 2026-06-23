"""Async SQLAlchemy engine — SQLite with aiosqlite."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config.settings import settings

engine = create_async_engine(f"sqlite+aiosqlite:///{settings.db_path}", echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def init_db():
    import backend.models.database  # noqa — ensure all models are registered with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
