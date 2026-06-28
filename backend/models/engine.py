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


async def _migrate(conn):
    """Run additive ALTER TABLE migrations; log unexpected errors."""
    import logging, re as _re
    log = logging.getLogger(__name__)
    additive = [
        "ALTER TABLE blueprints ADD COLUMN wo_counter INTEGER DEFAULT 0",
        "ALTER TABLE work_orders ADD COLUMN wo_id TEXT DEFAULT ''",
    ]
    for sql in additive:
        try:
            await conn.execute(text(sql))
        except Exception as e:
            msg = str(e).lower()
            if "duplicate column" not in msg and "already exists" not in msg:
                log.warning("Migration skipped (%s): %s", sql[:60], e)

    # Backfill wo_id for existing work orders created before the WO-ID feature.
    try:
        rows = (await conn.execute(text(
            "SELECT wo.id, wo.blueprint_id,"
            " ROW_NUMBER() OVER (PARTITION BY wo.blueprint_id ORDER BY wo.created_at) AS rn,"
            " bp.name AS bp_name"
            " FROM work_orders wo JOIN blueprints bp ON wo.blueprint_id = bp.id"
            " WHERE wo.wo_id IS NULL OR wo.wo_id = ''"
        ))).fetchall()
        for row in rows:
            letters = _re.sub(r"[^a-zA-Z]", "", row[3] or "").upper()
            prefix = letters[:4] if letters else "WRK"
            wo_id = f"WO-{prefix}-{int(row[2]):03d}"
            await conn.execute(
                text("UPDATE work_orders SET wo_id = :wid WHERE id = :id"),
                {"wid": wo_id, "id": row[0]}
            )
        if rows:
            log.info("Backfilled wo_id for %d work orders", len(rows))
    except Exception as e:
        log.warning("wo_id backfill skipped: %s", e)


async def init_db():
    import backend.models.database  # noqa: ensure all models are registered with Base
    async with engine.begin() as conn:
        await _apply_pragmas(conn)
        await conn.run_sync(Base.metadata.create_all)
        await _migrate(conn)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
