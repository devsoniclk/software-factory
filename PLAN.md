# Software Factory: Desktop App (Better Than 8090.ai)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a downloadable desktop application that gives every developer their own AI-native SDLC control plane: no cloud, no subscriptions, no API keys. One install, works offline.

**Architecture:** Tauri 2.0 (Rust shell) + bundled Ollama sidecar (auto-managed) + Python FastAPI backend + React frontend. Single binary per platform (~30MB), auto-downloads a default model on first launch.

**Why this beats 8090.ai:**

| | 8090.ai | Software Factory |
|---|---|---|
| **Price** | $200/user/month | **$0 forever** |
| **Where it runs** | Their cloud | **Your machine** |
| **Data** | Their servers | **Your disk** |
| **LLM** | Their choice | **Your choice (any model)** |
| **Offline** | ❌ | ✅ |
| **Install** | Sign up + configure | **Double-click** |
| **Open source** | ❌ | ✅ MIT |
| **Source code** | Proprietary | **Yours to read/modify** |
| **Lock-in** | Total | **Zero** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TAURI SHELL (Rust)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   REACT FRONTEND                          │  │
│  │  ┌─────────┬──────────┬──────────┬─────────┬──────────┐  │  │
│  │  │Dashboard│Require-  │Blueprints│Work     │Tests &   │  │  │
│  │  │         │ments     │          │Orders   │Feedback  │  │  │
│  │  └─────────┴──────────┴──────────┴─────────┴──────────┘  │  │
│  │  ┌──────────────────┬──────────────────────────────────┐  │  │
│  │  │ Knowledge Graph  │  Audit Trail & Decision Log      │  │  │
│  │  └──────────────────┴──────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Model Manager (download/switch/local models)         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              PYTHON FASTAPI (embedded subprocess)         │  │
│  │  ┌──────┬─────────┬───────────┬────────┬──────────────┐  │  │
│  │  │ Req  │ Blueprint│Work Order │ Test   │  Feedback    │  │  │
│  │  │Agent │ Agent    │Agent      │ Agent  │  Parser      │  │  │
│  │  └──────┴─────────┴───────────┴────────┴──────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Knowledge Graph (SQLite + custom graph layer)        │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              OLLAMA (auto-managed sidecar process)        │  │
│  │  Models: qwen2.5:7b (default) → any GGUF/ollama model   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Data: ~/SoftwareFactory/ (projects DB, models, exports)
```

## Key Differentiators Over 8090.ai

### 1. 🚀 One-Click Install
- macOS: Drag to Applications, double-click
- Windows: Installer exe, double-click
- Linux: AppImage, double-click
- First launch: auto-downloads ~4GB default model (qwen2.5:7b) OR activates free MiMo API: user's choice

### 2. 🧠 Built-In Model Manager
- Browse and download any Ollama model from the UI
- Switch models per-task (fast model for drafting, big model for architecture)
- See VRAM usage, speed benchmarks
- Supports: Llama 3, Qwen, DeepSeek, Mistral, Phi, Gemma: anything Ollama runs
- "Bring your own API key" mode for OpenAI/Anthropic/DeepSeek if user wants cloud
- **Xiaomi MiMo API**: Free cloud models (mimo-v2.5-pro) with no API key cost. Get key at https://platform.xiaomimimo.com
- **Multi-provider switcher**: Ollama (local) → MiMo (free cloud) → OpenAI/Anthropic (paid cloud). One click to switch.

### 3. 🔒 Local-First Data
- SQLite database at `~/SoftwareFactory/data.db`
- Knowledge graph stored in same DB (graph table pattern)
- All files, exports, and artifacts on user's disk
- **Zero telemetry** (no phone-home, ever)
- **Optional** Git sync: export project to Git repo for team sharing

### 4. 📦 Offline-First
- Works completely offline after model download
- No account creation, no sign-in, no tokens
- All AI inference runs on local GPU/CPU via Ollama

### 5. 🎯 Better Than 8090's Features
- **Templates:** Pre-built project templates (web app, API, mobile, data pipeline)
- **Export:** PDF/Markdown/HTML reports for requirements, blueprints, work orders
- **Git Integration:** Auto-commit work order outputs, track changes
- **Plugin System:** Custom AI agents via Python scripts in `~/.software-factory/plugins/`
- **Dark/Light Theme:** System-aware, user-switchable
- **Keyboard-First:** Cmd+K command palette, vim keybindings option

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop Shell | Tauri 2.0 (Rust) | 5MB binary vs Electron's 150MB, native perf, auto-update |
| Frontend | React 18 + Vite + Tailwind + Framer Motion | Fast dev, beautiful UI, smooth animations |
| Backend | Python 3.11 + FastAPI | Rich AI ecosystem, async, fast |
| Database | SQLite (via SQLAlchemy async) | Zero config, portable, battle-tested |
| Graph Layer | SQLite recursive CTEs | No extra dependency, works everywhere |
| LLM Runtime | Ollama (bundled sidecar) | One-command model management, GPU support |
| Default Model | qwen2.5:7b (4.4GB) | Best quality/size ratio for coding tasks |
| Packaging | Tauri bundler → .dmg/.msi/.AppImage | Native installers per platform |

---

## Data Model

```sql
-- Core entities
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    template TEXT DEFAULT '',
    settings_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE requirements (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'draft',  -- draft/review/approved/implemented
    acceptance_criteria_json TEXT DEFAULT '[]',
    ai_generated INTEGER DEFAULT 0,
    created_by TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE blueprints (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    decisions_json TEXT DEFAULT '[]',
    components_json TEXT DEFAULT '[]',
    constraints_json TEXT DEFAULT '[]',
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE work_orders (
    id TEXT PRIMARY KEY,
    blueprint_id TEXT REFERENCES blueprints(id) ON DELETE CASCADE,
    requirement_ids_json TEXT DEFAULT '[]',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    context_json TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending',  -- pending/in_progress/completed/blocked
    assigned_to TEXT DEFAULT '',
    ai_output TEXT DEFAULT '',
    git_commit TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE test_cases (
    id TEXT PRIMARY KEY,
    requirement_id TEXT REFERENCES requirements(id) ON DELETE CASCADE,
    work_order_id TEXT REFERENCES work_orders(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    test_type TEXT DEFAULT 'unit',
    status TEXT DEFAULT 'pending',  -- pending/passed/failed/skipped
    result TEXT DEFAULT '',
    evidence_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE feedbacks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'manual',
    raw_text TEXT NOT NULL,
    parsed_tasks_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'new',
    linked_work_order_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT DEFAULT 'user',
    before_json TEXT DEFAULT '{}',
    after_json TEXT DEFAULT '{}',
    rationale TEXT DEFAULT '',
    timestamp TEXT DEFAULT (datetime('now'))
);

-- Knowledge graph (adjacency list in SQLite)
CREATE TABLE kg_nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE kg_edges (
    source_id TEXT REFERENCES kg_nodes(id) ON DELETE CASCADE,
    target_id TEXT REFERENCES kg_nodes(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    metadata_json TEXT DEFAULT '{}',
    PRIMARY KEY (source_id, target_id, relationship)
);

-- Templates
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    requirements_json TEXT DEFAULT '[]',
    blueprint_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Settings (key-value)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## Build Phases

### PHASE 1: Tauri Shell + Backend Bootstrap (~20 tasks)
Desktop app skeleton with embedded Python backend and Ollama sidecar management.

### PHASE 2: Core Backend APIs (~15 tasks)
All CRUD endpoints, AI agents, knowledge graph, audit trail.

### PHASE 3: Frontend UI (~15 tasks)
Dashboard, 5 module pages, model manager, knowledge graph viz, command palette.

### PHASE 4: Model Manager + Ollama Integration (~8 tasks)
Browse models, download, switch, benchmark, bring-your-own-API-key.

### PHASE 5: Export, Templates, Polish (~7 tasks)
PDF/Markdown export, project templates, auto-update, packaging.

---

## PHASE 1: Tauri Shell + Backend Bootstrap

### Task 1: Initialize Tauri 2.0 Project

**Objective:** Create the Tauri desktop app with React frontend and Python backend.

**Files:**
- Create: `~/Projects/software-factory/src-tauri/` (Tauri Rust project)
- Create: `~/Projects/software-factory/frontend/` (React + Vite)

**Step 1: Install prerequisites**

```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Install Tauri CLI
cargo install create-tauri-app
```

**Step 2: Create the project**

```bash
cd ~/Projects/software-factory

# Create frontend with Vite + React + TypeScript
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom@6 @tanstack/react-query axios framer-motion lucide-react
cd ..

# Initialize Tauri inside the project
cd frontend
cargo tauri init --app-name "Software Factory" --window-title "Software Factory" --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build" --frontend-dist ../dist --ci
cd ..
```

**Step 3: Configure Tauri**

`src-tauri/tauri.conf.json`:
```json
{
  "productName": "Software Factory",
  "version": "0.1.0",
  "identifier": "ai.software-factory.app",
  "build": {
    "beforeDevCommand": "cd frontend && npm run dev",
    "beforeBuildCommand": "cd frontend && npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "windows": [
      {
        "title": "Software Factory",
        "width": 1400,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 600,
        "resizable": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Step 4: Tauri Rust sidecar management**

`src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};
use std::process::{Command, Child};
use std::sync::Mutex;

struct AppState {
    backend: Mutex<Option<Child>>,
    ollama: Mutex<Option<Child>>,
}

#[tauri::command]
fn start_backend(state: tauri::State<AppState>) -> Result<String, String> {
    let python = find_python();
    let child = Command::new(&python)
        .args(["-m", "uvicorn", "backend.api.app:app", "--host", "127.0.0.1", "--port", "8099"])
        .current_dir(get_app_dir())
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;
    *state.backend.lock().unwrap() = Some(child);
    Ok("Backend started on port 8099".into())
}

#[tauri::command]
fn start_ollama(state: tauri::State<AppState>) -> Result<String, String> {
    let ollama = find_ollama();
    let child = Command::new(&ollama)
        .arg("serve")
        .spawn()
        .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    *state.ollama.lock().unwrap() = Some(child);
    Ok("Ollama started".into())
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "python": find_python(),
        "ollama": find_ollama(),
    })
}

fn find_python() -> String {
    for p in ["python3", "python"] {
        if Command::new(p).arg("--version").output().is_ok() {
            return p.to_string();
        }
    }
    "python3".to_string()
}

fn find_ollama() -> String {
    for p in ["/usr/local/bin/ollama", "/opt/homebrew/bin/ollama", "ollama"] {
        if Command::new(p).arg("--version").output().is_ok() {
            return p.to_string();
        }
    }
    "ollama".to_string()
}

fn get_app_dir() -> std::path::PathBuf {
    dirs::home_dir().unwrap_or_default().join("SoftwareFactory")
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            backend: Mutex::new(None),
            ollama: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![start_backend, start_ollama, get_system_info])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<AppState>();
                // Kill backend
                if let Some(mut child) = state.backend.lock().unwrap().take() {
                    let _ = child.kill();
                }
                // Kill ollama
                if let Some(mut child) = state.ollama.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: Commit**

```bash
git init && git add -A && git commit -m "feat: Tauri desktop app with embedded backend + Ollama sidecar"
```

---

### Task 2: Python Backend Structure

**Objective:** Create the FastAPI backend that runs as a subprocess inside the Tauri app.

**Files:**
- Create: `backend/api/app.py`
- Create: `backend/config/settings.py`
- Create: `backend/models/database.py`
- Create: `backend/models/engine.py`
- Create: `requirements.txt`

**requirements.txt:**
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
aiosqlite==0.20.0
pydantic==2.9.0
pydantic-settings==2.5.0
openai==1.50.0
httpx==0.27.0
rich==13.8.0
markdown==3.7
weasyprint==62.3
```

**config/settings.py:**
```python
"""Configuration: auto-detects Ollama, sets data paths."""
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
import json, os

DATA_DIR = Path.home() / "SoftwareFactory"
DATA_DIR.mkdir(exist_ok=True)
(DATA_DIR / "projects").mkdir(exist_ok=True)
(DATA_DIR / "exports").mkdir(exist_ok=True)


class LLMConfig(BaseSettings):
    base_url: str = "http://127.0.0.1:11434/v1"
    api_key: str = "ollama"
    model: str = "qwen2.5:7b"
    temperature: float = 0.3
    max_tokens: int = 4096
    model_config = {"env_prefix": "LLM_"}


class Settings:
    def __init__(self):
        self.llm = LLMConfig()
        self.db_path = str(DATA_DIR / "data.db")
        self.data_dir = DATA_DIR

settings = Settings()
```

**models/engine.py:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config.settings import settings
from pathlib import Path

Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
engine = create_async_engine(f"sqlite+aiosqlite:///{settings.db_path}", echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def init_db():
    from backend.models.database import *  # noqa: ensure all models imported
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**api/app.py:**
```python
"""Main FastAPI app: runs as subprocess inside Tauri."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.models.engine import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Software Factory", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

# Routers added in subsequent tasks
```

**Commit:**
```bash
git add -A && git commit -m "feat: Python backend structure with auto-data-dir"
```

---

### Task 3: Database Models (All Entities)

**Objective:** SQLAlchemy models for all entities matching the data model above.

**File:** `backend/models/database.py`

```python
"""All SQLAlchemy models."""
import enum, uuid, json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from backend.models.engine import Base

def uid() -> str: return uuid.uuid4().hex[:12]
def now() -> str: return datetime.now(timezone.utc).isoformat()

class ReqStatus(str, enum.Enum): DRAFT="draft"; REVIEW="review"; APPROVED="approved"; IMPLEMENTED="implemented"
class WOStatus(str, enum.Enum): PENDING="pending"; IN_PROGRESS="in_progress"; COMPLETED="completed"; BLOCKED="blocked"
class TestStatus(str, enum.Enum): PENDING="pending"; PASSED="passed"; FAILED="failed"; SKIPPED="skipped"

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    template = Column(String, default="")
    settings_json = Column(Text, default="{}")
    created_at = Column(String, default=now)
    updated_at = Column(String, default=now, onupdate=now)
    requirements = relationship("Requirement", cascade="all,delete-orphan", back_populates="project")
    blueprints = relationship("Blueprint", cascade="all,delete-orphan", back_populates="project")
    feedbacks = relationship("Feedback", cascade="all,delete-orphan", back_populates="project")

class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    priority = Column(Integer, default=3)
    status = Column(SAEnum(ReqStatus), default=ReqStatus.DRAFT)
    acceptance_criteria_json = Column(Text, default="[]")
    ai_generated = Column(Boolean, default=False)
    created_by = Column(String, default="user")
    created_at = Column(String, default=now)
    project = relationship("Project", back_populates="requirements")
    test_cases = relationship("TestCase", cascade="all,delete-orphan", back_populates="requirement")

class Blueprint(Base):
    __tablename__ = "blueprints"
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    decisions_json = Column(Text, default="[]")
    components_json = Column(Text, default="[]")
    constraints_json = Column(Text, default="[]")
    version = Column(Integer, default=1)
    created_at = Column(String, default=now)
    project = relationship("Project", back_populates="blueprints")
    work_orders = relationship("WorkOrder", cascade="all,delete-orphan", back_populates="blueprint")

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(String, primary_key=True, default=uid)
    blueprint_id = Column(String, ForeignKey("blueprints.id", ondelete="CASCADE"), nullable=False)
    requirement_ids_json = Column(Text, default="[]")
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    context_json = Column(Text, default="{}")
    status = Column(SAEnum(WOStatus), default=WOStatus.PENDING)
    assigned_to = Column(String, default="")
    ai_output = Column(Text, default="")
    git_commit = Column(String, default="")
    created_at = Column(String, default=now)
    blueprint = relationship("Blueprint", back_populates="work_orders")
    test_cases = relationship("TestCase", cascade="all,delete-orphan", back_populates="work_order")

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(String, primary_key=True, default=uid)
    requirement_id = Column(String, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    test_type = Column(String, default="unit")
    status = Column(SAEnum(TestStatus), default=TestStatus.PENDING)
    result = Column(Text, default="")
    evidence_json = Column(Text, default="{}")
    created_at = Column(String, default=now)
    requirement = relationship("Requirement", back_populates="test_cases")
    work_order = relationship("WorkOrder", back_populates="test_cases")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source = Column(String, default="manual")
    raw_text = Column(Text, nullable=False)
    parsed_tasks_json = Column(Text, default="[]")
    status = Column(String, default="new")
    linked_work_order_id = Column(String, nullable=True)
    created_at = Column(String, default=now)
    project = relationship("Project", back_populates="feedbacks")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    actor = Column(String, default="user")
    before_json = Column(Text, default="{}")
    after_json = Column(Text, default="{}")
    rationale = Column(Text, default="")
    timestamp = Column(String, default=now)

class KGNode(Base):
    __tablename__ = "kg_nodes"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    node_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(String, default=now)

class KGEdge(Base):
    __tablename__ = "kg_edges"
    source_id = Column(String, ForeignKey("kg_nodes.id", ondelete="CASCADE"), primary_key=True)
    target_id = Column(String, ForeignKey("kg_nodes.id", ondelete="CASCADE"), primary_key=True)
    relationship = Column(String, primary_key=True)
    weight = Column(Float, default=1.0)
    metadata_json = Column(Text, default="{}")

class Template(Base):
    __tablename__ = "templates"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    category = Column(String, default="general")
    requirements_json = Column(Text, default="[]")
    blueprint_json = Column(Text, default="{}")
    created_at = Column(String, default=now)

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
```

**Commit:**
```bash
git add -A && git commit -m "feat: All database models"
```

---

### Task 4: Audit Service

**Objective:** Central audit logger for every mutation.

**File:** `backend/services/audit_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.database import AuditLog, now

class AuditService:
    @staticmethod
    async def log(db, entity_type, entity_id, action, actor="user", before=None, after=None, rationale=""):
        entry = AuditLog(
            entity_type=entity_type, entity_id=entity_id, action=action,
            actor=actor, before_json=json.dumps(before or {}),
            after_json=json.dumps(after or {}), rationale=rationale,
        )
        db.add(entry)
        await db.flush()

import json
```

**Commit:**
```bash
git add -A && git commit -m "feat: Audit service"
```

---

### Task 5: LLM Client

**Objective:** OpenAI-compatible client that auto-detects Ollama and supports streaming.

**File:** `backend/services/llm_client.py`

```python
"""LLM client: auto-detects Ollama, supports streaming + JSON mode."""
from openai import AsyncOpenAI
from backend.config.settings import settings
import json, httpx

class LLMClient:
    def __init__(self):
        self._client = None
        self._configured_model = settings.llm.model

    @property
    def client(self):
        if not self._client:
            **File:** `backend/services/llm_client.py`

            ```python
            """Multi-provider LLM client: Ollama (local), MiMo (free), OpenAI/Anthropic (paid)."""
            from openai import AsyncOpenAI
            from backend.config.settings import settings
            import json, httpx, os

            # Provider configs
            PROVIDERS = {
                "ollama": {
                    "name": "Ollama (Local)",
                    "base_url": "http://127.0.0.1:11434/v1",
                    "api_key": "ollama",
                    "models_endpoint": "http://127.0.0.1:11434/api/tags",
                    "requires_key": False,
                    "offline": True,
                },
                "mimo": {
                    "name": "Xiaomi MiMo (Free)",
                    "base_url": "https://token-plan-sgp.xiaomimimo.com/v1",
                    "api_key_env": "XIAOMI_API_KEY",
                    "requires_key": True,
                    "offline": False,
                    "models": [
                        {"name": "mimo-v2.5-pro", "desc": "Flagship: reasoning + tool calling", "tags": ["coding","reasoning","best"]},
                        {"name": "mimo-v2.5", "desc": "Multimodal (text/image/audio/video)", "tags": ["multimodal"]},
                        {"name": "mimo-v2-pro", "desc": "Older pro model", "tags": ["general"]},
                    ],
                },
                "openai": {
                    "name": "OpenAI",
                    "base_url": "https://api.openai.com/v1",
                    "api_key_env": "OPENAI_API_KEY",
                    "requires_key": True,
                    "offline": False,
                },
                "anthropic": {
                    "name": "Anthropic",
                    "base_url": "https://api.anthropic.com/v1",
                    "api_key_env": "ANTHROPIC_API_KEY",
                    "requires_key": True,
                    "offline": False,
                },
                "deepseek": {
                    "name": "DeepSeek",
                    "base_url": "https://api.deepseek.com/v1",
                    "api_key_env": "DEEPSEEK_API_KEY",
                    "requires_key": True,
                    "offline": False,
                },
            }

            class LLMClient:
                def __init__(self):
                    self._clients = {}
                    self._active_provider = "ollama"
                    self._active_model = settings.llm.model
                    self._api_keys = {}  # user-provided keys stored in settings DB

                def set_provider(self, provider: str, api_key: str | None = None):
                    """Switch active provider. Optionally set/store API key."""
                    self._active_provider = provider
                    if api_key:
                        self._api_keys[provider] = api_key
                    self._clients.pop(provider, None)  # reset client

                def set_model(self, model: str):
                    self._active_model = model

                @property
                def provider_config(self) -> dict:
                    return PROVIDERS[self._active_provider]

                @property
                def client(self) -> AsyncOpenAI:
                    if self._active_provider not in self._clients:
                        cfg = PROVIDERS[self._active_provider]
                        api_key = self._api_keys.get(self._active_provider) or os.environ.get(cfg.get("api_key_env",""), cfg.get("api_key",""))
                        self._clients[self._active_provider] = AsyncOpenAI(
                            base_url=cfg["base_url"], api_key=api_key
                        )
                    return self._clients[self._active_provider]

                @property
                def model(self) -> str:
                    if self._active_provider == "ollama":
                        return self._active_model
                    elif self._active_provider == "mimo":
                        return self._active_model or "mimo-v2.5-pro"
                    return self._active_model

                async def health_check(self) -> dict:
                    """Check active provider status."""
                    if self._active_provider == "ollama":
                        try:
                            async with httpx.AsyncClient() as c:
                                r = await c.get(PROVIDERS["ollama"]["models_endpoint"], timeout=5)
                                models = [m["name"] for m in r.json().get("models", [])]
                                return {"provider": "ollama", "status": "running", "models": models}
                        except Exception:
                            return {"provider": "ollama", "status": "not_running", "models": []}
                    else:
                        # Test API with minimal call
                        try:
                            r = await self.client.chat.completions.create(
                                model=self.model, messages=[{"role":"user","content":"ping"}], max_tokens=5
                            )
                            return {"provider": self._active_provider, "status": "ok", "model": self.model}
                        except Exception as e:
                            return {"provider": self._active_provider, "status": "error", "error": str(e)}

                async def chat(self, system: str, user: str, temp: float | None = None) -> str:
                    r = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                        temperature=temp or settings.llm.temperature,
                        max_tokens=settings.llm.max_tokens,
                    )
                    return r.choices[0].message.content

                async def chat_json(self, system: str, user: str) -> dict | list:
                    raw = await self.chat(system, user)
                    raw = raw.strip()
                    if raw.startswith("```"):
                        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    return json.loads(raw)

                async def stream(self, system: str, user: str):
                    stream = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                        temperature=settings.llm.temperature,
                        max_tokens=settings.llm.max_tokens,
                        stream=True,
                    )
                    async for chunk in stream:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content

            llm = LLMClient()
            ```

**Commit:**
```bash
git add -A && git commit -m "feat: LLM client with Ollama auto-detect"
```

---

### Tasks 6-10: CRUD API Routers

**Objective:** Full CRUD for all 5 core entities plus audit and knowledge graph.

Each router follows the same pattern. Here's the combined structure:

**Files:**
- `backend/api/projects.py`: POST/GET/DELETE projects
- `backend/api/requirements.py`: CRUD + status transitions + AI generate
- `backend/api/blueprints.py`: CRUD + versioning + AI generate
- `backend/api/work_orders.py`: CRUD + status + AI generate
- `backend/api/feedback.py`: CRUD + AI parse
- `backend/api/tests_api.py`: CRUD + AI generate
- `backend/api/audit.py`: GET audit logs with filters
- `backend/api/knowledge_graph.py`: Graph queries + visualization data
- `backend/api/ai_endpoints.py`: All AI agent endpoints
- `backend/api/ollama_manager.py`: Model list/download/switch
- `backend/api/export.py`: PDF/Markdown export

**Register all in app.py:**
```python
from backend.api import projects, requirements, blueprints, work_orders, feedback, tests_api, audit, knowledge_graph, ai_endpoints, ollama_manager, export

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(requirements.router, prefix="/api/projects/{pid}/requirements", tags=["requirements"])
app.include_router(blueprints.router, prefix="/api/projects/{pid}/blueprints", tags=["blueprints"])
app.include_router(work_orders.router, prefix="/api/blueprints/{bid}/work-orders", tags=["work-orders"])
app.include_router(feedback.router, prefix="/api/projects/{pid}/feedback", tags=["feedback"])
app.include_router(tests_api.router, prefix="/api/requirements/{rid}/tests", tags=["tests"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(knowledge_graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(ai_endpoints.router, prefix="/api/ai", tags=["ai"])
app.include_router(ollama_manager.router, prefix="/api/ollama", tags=["ollama"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
```

**Commit each router separately.**

---

### Task 11: 5 AI Agents

**Objective:** All AI agents: requirements, blueprints, work orders, tests, feedback.

**Files:**
- `backend/agents/requirements_agent.py`
- `backend/agents/blueprint_agent.py`
- `backend/agents/work_order_agent.py`
- `backend/agents/test_agent.py`
- `backend/agents/feedback_agent.py`

**(Same agent logic as the plan above: each wraps `llm.chat_json()` with a system prompt)**

---

### Task 12: Knowledge Graph Service (SQLite-based)

**Objective:** Graph layer using SQLite recursive CTEs: no external graph DB dependency.

**File:** `backend/services/knowledge_graph.py`

```python
"""Knowledge graph using SQLite: recursive CTEs for traversals."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.models.database import KGNode, KGEdge
import json

class KnowledgeGraphService:
    async def add_node(self, db: AsyncSession, node_id, project_id, node_type, title, content="", metadata=None):
        node = KGNode(id=node_id, project_id=project_id, node_type=node_type, title=title, content=content,
                      metadata_json=json.dumps(metadata or {}))
        db.merge(node)
        await db.flush()

    async def add_edge(self, db: AsyncSession, src, dst, rel, weight=1.0):
        edge = KGEdge(source_id=src, target_id=dst, relationship=rel, weight=weight)
        db.merge(edge)
        await db.flush()

    async def get_graph(self, db: AsyncSession, project_id: str) -> dict:
        """Full graph for visualization."""
        nodes = (await db.execute(
            text("SELECT id, node_type, title FROM kg_nodes WHERE project_id = :pid"),
            {"pid": project_id}
        )).fetchall()
        edges = (await db.execute(
            text("SELECT e.source_id, e.target_id, e.relationship FROM kg_edges e "
                 "JOIN kg_nodes n ON e.source_id = n.id WHERE n.project_id = :pid"),
            {"pid": project_id}
        )).fetchall()
        return {
            "nodes": [{"id": r[0], "type": r[1], "title": r[2]} for r in nodes],
            "edges": [{"source": r[0], "target": r[1], "relationship": r[2]} for r in edges],
        }

    async def neighbors(self, db: AsyncSession, node_id: str, rel: str | None = None) -> list:
        if rel:
            rows = (await db.execute(
                text("SELECT n.id, n.title, n.node_type FROM kg_edges e "
                     "JOIN kg_nodes n ON e.target_id = n.id WHERE e.source_id = :sid AND e.relationship = :rel"),
                {"sid": node_id, "rel": rel}
            )).fetchall()
        else:
            rows = (await db.execute(
                text("SELECT n.id, n.title, n.node_type, e.relationship FROM kg_edges e "
                     "JOIN kg_nodes n ON e.target_id = n.id WHERE e.source_id = :sid"),
                {"sid": node_id}
            )).fetchall()
        return [dict(r._mapping) for r in rows]

    async def sync_entity(self, db: AsyncSession, entity_type: str, entity) -> None:
        """Auto-sync a DB entity into the knowledge graph."""
        if entity_type == "requirement":
            await self.add_node(db, f"req:{entity.id}", entity.project_id, "requirement", entity.title, entity.description)
            for i, ac in enumerate(json.loads(entity.acceptance_criteria_json or "[]")):
                aid = f"ac:{entity.id}:{i}"
                await self.add_node(db, aid, entity.project_id, "acceptance_criteria", f"AC: {ac[:60]}", ac)
                await self.add_edge(db, f"req:{entity.id}", aid, "has_criterion")
        elif entity_type == "blueprint":
            await self.add_node(db, f"bp:{entity.id}", entity.project_id, "blueprint", entity.name, entity.description)
            for i, d in enumerate(json.loads(entity.decisions_json or "[]")):
                did = f"dec:{entity.id}:{i}"
                await self.add_node(db, did, entity.project_id, "decision", d.get("title",""), d.get("choice",""))
                await self.add_edge(db, f"bp:{entity.id}", did, "decided")
        elif entity_type == "work_order":
            await self.add_node(db, f"wo:{entity.id}", "", "work_order", entity.title, entity.description)
            await self.add_edge(db, f"bp:{entity.blueprint_id}", f"wo:{entity.id}", "implements")
            for rid in json.loads(entity.requirement_ids_json or "[]"):
                await self.add_edge(db, f"wo:{entity.id}", f"req:{rid}", "fulfills")

kg = KnowledgeGraphService()
```

**Commit:**
```bash
git add -A && git commit -m "feat: SQLite-based knowledge graph service"
```

---

### Task 13: Ollama Manager API

**Objective:** API endpoints to list, download, switch, and benchmark local models.

**File:** `backend/api/ollama_manager.py`

```python
"""Ollama model management: list, pull, switch, benchmark."""
from fastapi import APIRouter
from pydantic import BaseModel
import httpx
from backend.config.settings import settings
from backend.services.llm_client import llm

router = APIRouter()
OLLAMA_URL = "http://127.0.0.1:11434"

@router.get("/status")
async def ollama_status():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags", timeout=5)
            models = [{"name": m["name"], "size": m.get("size", 0), "modified": m.get("modified_at","")}
                      for m in r.json().get("models", [])]
            return {"status": "running", "models": models, "active": settings.llm.model}
    except Exception:
        return {"status": "not_running", "models": [], "active": settings.llm.model}

@router.get("/models")
async def list_models():
    """List all available models (local + popular remote)."""
    popular = [
        {"name": "qwen2.5:7b", "size": "4.4GB", "desc": "Best 7B coding model", "tags": ["coding","fast"]},
        {"name": "qwen2.5:14b", "size": "9.0GB", "desc": "Strong 14B model", "tags": ["coding","quality"]},
        {"name": "llama3.1:8b", "size": "4.7GB", "desc": "Meta's latest 8B", "tags": ["general","fast"]},
        {"name": "deepseek-coder-v2:16b", "size": "8.9GB", "desc": "Top coding model", "tags": ["coding"]},
        {"name": "mistral:7b", "size": "4.1GB", "desc": "Fast general purpose", "tags": ["general","fast"]},
        {"name": "phi3:mini", "size": "2.3GB", "desc": "Tiny but capable", "tags": ["fast","small"]},
        {"name": "gemma2:9b", "size": "5.4GB", "desc": "Google's 9B model", "tags": ["general"]},
        {"name": "codellama:7b", "size": "3.8GB", "desc": "Code-focused Llama", "tags": ["coding","fast"]},
    ]
    # Check which are installed
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags", timeout=5)
            installed = {m["name"] for m in r.json().get("models", [])}
    except Exception:
        installed = set()
    for m in popular:
        m["installed"] = m["name"] in installed
    return popular

class PullRequest(BaseModel):
    name: str

@router.post("/pull")
async def pull_model(req: PullRequest):
    """Start downloading a model (streaming progress)."""
    async with httpx.AsyncClient(timeout=None) as c:
        r = await c.post(f"{OLLAMA_URL}/api/pull", json={"name": req.name}, stream=True)
        events = []
        async for line in r.aiter_lines():
            if line:
                import json
                try:
                    events.append(json.loads(line))
                except Exception:
                    pass
        return {"status": "complete", "model": req.name, "events": len(events)}

class SwitchRequest(BaseModel):
    model: str

@router.post("/switch")
async def switch_model(req: SwitchRequest):
    """Switch the active model."""
    llm.set_model(req.model)
    return {"switched_to": req.model}

@router.post("/benchmark")
async def benchmark():
    """Quick benchmark of the active model."""
    import time
    start = time.time()
    response = await llm.chat("Respond with exactly: BENCHMARK_OK", "ping")
    elapsed = time.time() - start
    return {"model": settings.llm.model, "latency_ms": round(elapsed * 1000), "response": response[:100]}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Ollama model manager API"
```

---

### Task 14: Export Service (PDF/Markdown)

**Objective:** Export requirements, blueprints, and work orders as PDF or Markdown.

**File:** `backend/api/export.py`

```python
"""Export to Markdown and PDF."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder, TestCase
from sqlalchemy import select
import json

router = APIRouter()

@router.get("/project/{pid}/markdown")
async def export_markdown(pid: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, pid)
    reqs = (await db.execute(select(Requirement).where(Requirement.project_id == pid))).scalars().all()
    bps = (await db.execute(select(Blueprint).where(Blueprint.project_id == pid))).scalars().all()

    md = f"# {project.name}\n\n{project.description}\n\n"
    md += "## Requirements\n\n"
    for r in reqs:
        ac = json.loads(r.acceptance_criteria_json or "[]")
        md += f"### {r.title} [{r.status.value}]\n\n{r.description}\n\n"
        if ac:
            md += "**Acceptance Criteria:**\n" + "\n".join(f"- {c}" for c in ac) + "\n\n"

    md += "## Blueprints\n\n"
    for bp in bps:
        decisions = json.loads(bp.decisions_json or "[]")
        components = json.loads(bp.components_json or "[]")
        md += f"### {bp.name} (v{bp.version})\n\n{bp.description}\n\n"
        if decisions:
            md += "**Decisions:**\n"
            for d in decisions:
                md += f"- **{d.get('title','')}**: {d.get('choice','')}\n"
            md += "\n"
        if components:
            md += "**Components:**\n"
            for c in components:
                md += f"- **{c.get('name','')}**: {c.get('responsibility','')}\n"
            md += "\n"

    # Work orders for each blueprint
    for bp in bps:
        wos = (await db.execute(select(WorkOrder).where(WorkOrder.blueprint_id == bp.id))).scalars().all()
        if wos:
            md += f"## Work Orders: {bp.name}\n\n"
            for wo in wos:
                md += f"### {wo.title} [{wo.status.value}]\n\n{wo.description}\n\n"

    return Response(content=md, media_type="text/markdown",
                    headers={"Content-Disposition": f"attachment; filename={project.name}.md"})


@router.get("/project/{pid}/pdf")
async def export_pdf(pid: str, db: AsyncSession = Depends(get_db)):
    """Export project as PDF using WeasyPrint."""
    # Get markdown first, then convert
    md_content = (await export_markdown(pid, db)).body.decode()
    import markdown
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}}
    h1{{color:#1a1a2e}}h2{{color:#16213e;border-bottom:2px solid #e2e8f0;padding-bottom:8px}}
    h3{{color:#0f3460}}code{{background:#f1f5f9;padding:2px 6px;border-radius:4px}}</style>
    </head><body>{markdown.markdown(md_content, extensions=['tables','fenced_code'])}</body></html>"""

    from weasyprint import HTML
    pdf = HTML(string=html).write_pdf()
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=project.pdf"})
```

**Commit:**
```bash
git add -A && git commit -m "feat: Markdown and PDF export"
```

---

## PHASE 3: Frontend (React + Tailwind + Framer Motion)

### Task 15: Frontend Scaffolding

**Objective:** Vite + React + Tailwind + router + query client setup.

```bash
cd ~/Projects/software-factory/frontend
# Already created in Task 1: configure Tailwind
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8099' } }
})
```

**src/index.css:**
```css
@import "tailwindcss";

:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a25;
  --border: #2a2a3a;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.15);
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Glassmorphism utility */
.glass {
  background: rgba(18, 18, 26, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(42, 42, 58, 0.5);
}

/* Glow effect */
.glow { box-shadow: 0 0 20px var(--accent-glow); }
```

**Commit:**
```bash
git add -A && git commit -m "feat: Frontend scaffolding with dark theme"
```

---

### Task 16: Layout + Sidebar + Command Palette

**Objective:** App shell with animated sidebar, status indicators, and Cmd+K command palette.

**Files:**
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/StatusBar.tsx`

**Sidebar with connection status:**
```tsx
// Shows: ● Backend connected / ● Ollama running / Active model name
// Navigation: Dashboard, Requirements, Blueprints, Work Orders, Tests, Feedback, Graph, Audit, Models
// Bottom: Settings, Export button
```

**Command Palette (Cmd+K):**
```tsx
// Fuzzy search across:
// - Navigation (go to any page)
// - Actions (create requirement, generate with AI, export)
// - Projects (switch project)
// - Models (switch model)
```

---

### Task 17-21: Module Pages (5 pages)

Each page has:
1. **Table/card list** with filters and search
2. **Create form** (modal slide-over panel)
3. **AI Generate button** (prominent, animated)
4. **Status badges** (color-coded, animated transitions)
5. **Detail panel** (expandable, shows full content + related entities)
6. **Empty state** (illustration + helpful CTA)

---

### Task 22: Knowledge Graph Visualization (Canvas + Force-Directed)

**Objective:** Interactive graph with zoom, pan, click-to-expand, and relationship filtering.

```tsx
// Features:
// - Force-directed layout (custom physics engine, no external lib)
// - Color-coded by entity type (requirement=blue, blueprint=purple, etc.)
// - Click node → expand details panel
// - Drag nodes to rearrange
// - Filter by relationship type
// - Zoom/pan with mouse wheel + drag
// - Animated node additions (pop-in effect)
```

---

### Task 23: Model Manager Page

**Objective:** Browse, download, switch, and benchmark AI models: the killer feature over 8090.

```tsx
// Features:
// - Grid of popular models with install status, size, description
// - Download progress bar (real-time via polling)
// - "Active Model" indicator with switch button
// - Quick benchmark (latency test)
// - VRAM/RAM usage indicator
// - "Bring Your Own API Key" section for OpenAI/Anthropic/DeepSeek
// - Model comparison table (speed vs quality)
```

---

### Task 24: Audit Trail Timeline

**Objective:** Beautiful timeline view of all system mutations with filters and search.

```tsx
// Features:
// - Vertical timeline with color-coded events
// - Filter by entity type, action, actor
// - Expand to see before/after state diff
// - Search across rationale text
// - Export audit log as CSV
```

---

### Task 25: Dashboard

**Objective:** Project overview with stats, recent activity, quick actions, and getting started guide.

```tsx
// Features:
// - Project selector (dropdown)
// - Stats cards: requirements count, blueprints, work orders, test pass rate
// - Recent activity feed (from audit log)
// - Quick actions: AI Generate for each module
// - Getting started wizard (for new users)
// - Model status indicator
```

---

## PHASE 4: Templates + Polish

### Task 26: Project Templates

**Objective:** Pre-built templates for common project types.

**Templates:**
1. **Web Application**: React/Next.js stack requirements + architecture
2. **REST API**: FastAPI/Express requirements + architecture
3. **Mobile App**: React Native / Flutter requirements
4. **Data Pipeline**: ETL/Airflow requirements
5. **CLI Tool**: Command-line application requirements
6. **Microservices**: Distributed system architecture

**File:** `backend/seeds/templates.py`

Each template contains:
- 10-15 pre-written requirements with acceptance criteria
- A blueprint with architectural decisions
- Suggested work order breakdown

---

### Task 27: Auto-Updater

**Objective:** Tauri's built-in auto-update mechanism.

**In `tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://releases.software-factory.app/{{target}}/{{current_version}}"],
      "pubkey": "..."
    }
  }
}
```

---

### Task 28: Build + Package

**Objective:** Build native installers for macOS, Windows, Linux.

```bash
cd ~/Projects/software-factory/frontend
npm run build
cd ..
cargo tauri build
```

**Output:**
- macOS: `Software Factory_0.1.0_aarch64.dmg` (~15MB)
- Windows: `Software Factory_0.1.0_x64-setup.exe` (~12MB)
- Linux: `software-factory_0.1.0_amd64.AppImage` (~15MB)

---

### Task 29: First-Launch Wizard

**Objective:** On first launch, detect system, download default model, create first project.

```tsx
// Step 1: Welcome + system check (Python? Ollama? GPU?)
// Step 2: Download recommended model (qwen2.5:7b) with progress bar
// Step 3: Quick benchmark to verify it works
// Step 4: Create first project (or use template)
// Step 5: Generate first requirements with AI
```

---

## Summary

| | 8090.ai | Our Software Factory |
|---|---|---|
| **Price** | $200/user/month | **Free forever** |
| **Data** | Their cloud | **Your machine** |
| **Privacy** | Their servers | **Zero telemetry** |
| **Models** | Their choice | **Any Ollama model** |
| **Offline** | ❌ | ✅ **Full offline** |
| **Install** | Account + configure | **Double-click** |
| **Source** | Proprietary | **Open source MIT** |
| **Export** | Their format | **PDF, Markdown, CSV** |
| **Customization** | None | **Plugins, custom agents** |
| **Size** | SaaS | **~15MB installer** |
| **Lock-in** | Total | **Zero** |

### Build Stats

| Phase | Tasks | Est. Lines | Est. Time |
|-------|-------|-----------|-----------|
| 1: Tauri + Backend | 14 | ~3,000 | 3-4 hrs |
| 2: APIs + Agents | 8 | ~2,000 | 2-3 hrs |
| 3: Frontend | 11 | ~3,500 | 4-5 hrs |
| 4: Polish | 4 | ~500 | 1-2 hrs |
| **Total** | **37** | **~9,000** | **10-14 hrs** |
