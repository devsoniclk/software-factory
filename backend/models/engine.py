"""Async SQLAlchemy engine: SQLite with WAL mode and performance pragmas."""
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config.settings import settings

engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.db_path}",
    echo=False,
    # aiosqlite doesn't support pool_size; SQLite uses StaticPool by default
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def _apply_pragmas(conn):
    """Apply WAL mode and performance pragmas on every new connection."""
    await conn.execute(text("PRAGMA journal_mode=WAL"))
    await conn.execute(text("PRAGMA synchronous=NORMAL"))
    await conn.execute(text("PRAGMA cache_size=-64000"))   # 64MB page cache
    await conn.execute(text("PRAGMA foreign_keys=ON"))
    await conn.execute(text("PRAGMA temp_store=MEMORY"))
    await conn.execute(text("PRAGMA mmap_size=268435456"))  # 256MB mmap


async def init_db():
    import backend.models.database  # noqa: ensure all models are registered with Base
    async with engine.begin() as conn:
        await _apply_pragmas(conn)
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
