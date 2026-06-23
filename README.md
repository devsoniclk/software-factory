<div align="center">

# Software Factory

**Your AI native software development control plane. Runs entirely on your machine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-black?style=flat-square)]()
[![Stack](https://img.shields.io/badge/Stack-Tauri%20%7C%20React%20%7C%20FastAPI-black?style=flat-square)]()
[![Models](https://img.shields.io/badge/Models-Any%20Ollama%20Model-black?style=flat-square)]()

</div>

---

```
                      ╔══════════════════════════════════════════╗
                      ║         SOFTWARE  FACTORY  v1            ║
                      ║                                          ║
                      ║   Requirements → Blueprints → Code       ║
                      ║   Work Orders → Tests → Shipping         ║
                      ║                                          ║
                      ║   100% local  ·  0 subscriptions         ║
                      ║   Any model   ·  Your data               ║
                      ╚══════════════════════════════════════════╝
```

---

## What It Is

Software Factory is a desktop application that gives every developer an AI powered SDLC control plane without the cloud, without subscriptions, and without sharing your code with anyone. One install. Works offline. Runs any local model via Ollama.

It covers the full software development lifecycle in a single window: writing requirements, generating technical blueprints, breaking work into ordered work orders, running AI generated tests, collecting feedback, and maintaining a full audit trail of every AI decision made along the way.

---

## How It Compares

| | Others | Software Factory |
|---|---|---|
| Price | $100 to $300 per user per month | **Free forever** |
| Where it runs | Their cloud | **Your machine** |
| Your data | Their servers | **Your disk** |
| Model choice | Theirs | **Any Ollama model** |
| Works offline | No | **Yes** |
| Open source | No | **MIT license** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TAURI 2.0  (Rust)                          │
│                     Single binary per platform                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                       REACT FRONTEND                           │ │
│  │                                                                │ │
│  │   Dashboard    Requirements    Blueprints    Work Orders       │ │
│  │   Tests        Feedback        Knowledge Graph    Audit Log    │ │
│  │   Model Manager                                                │ │
│  └───────────────────────────────┬────────────────────────────────┘ │
│                                  │  HTTP / REST                      │
│  ┌───────────────────────────────▼────────────────────────────────┐ │
│  │                     PYTHON FASTAPI BACKEND                     │ │
│  │                                                                │ │
│  │   Requirements Agent    Blueprint Agent    Test Agent          │ │
│  │   Work Order Agent      Feedback Agent                        │ │
│  │                                                                │ │
│  │   Knowledge Graph       Audit Service      LLM Client         │ │
│  └───────────────────────────────┬────────────────────────────────┘ │
│                                  │  OpenAI compatible API            │
│  ┌───────────────────────────────▼────────────────────────────────┐ │
│  │                    OLLAMA SIDECAR  (bundled)                   │ │
│  │   llama3  ·  codestral  ·  deepseek  ·  phi3  ·  mistral      │ │
│  │   Any model from ollama.com works out of the box               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│   SQLite  ·  All data stored locally  ·  No network required        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The SDLC Flow

```
  You have an idea
        │
        ▼
  ┌─────────────┐
  │Requirements │  Write plain English. AI structures it,
  │             │  identifies missing pieces, asks clarifying
  └──────┬──────┘  questions and locks the scope.
         │
         ▼
  ┌─────────────┐
  │ Blueprints  │  From requirements, AI generates a full
  │             │  technical blueprint: architecture, data
  └──────┬──────┘  models, API contracts, component tree.
         │
         ▼
  ┌─────────────┐
  │ Work Orders │  Blueprint splits into ordered, atomic
  │             │  tasks with acceptance criteria. Assign,
  └──────┬──────┘  track, update status in real time.
         │
         ▼
  ┌─────────────┐
  │    Tests    │  AI writes test cases for each work order.
  │             │  Run, mark pass or fail, see coverage
  └──────┬──────┘  across the project at a glance.
         │
         ▼
  ┌─────────────┐
  │  Feedback   │  Collect structured feedback per feature.
  │             │  AI surfaces patterns and creates follow
  └──────┬──────┘  up work orders automatically.
         │
         ▼
  ┌─────────────┐
  │ Audit Trail │  Every AI decision, every change, every
  │             │  status update logged with full context.
  └─────────────┘  Know exactly what happened and why.
```

---

## Features

**Requirements**
Write requirements in natural language. The AI structures them, resolves ambiguity, extracts edge cases, and links each requirement to the blueprints and tests downstream.

**Blueprints**
One click turns requirements into a full technical design. Architecture diagrams, API specs, database schemas, component breakdowns. Fully editable and version tracked.

**Work Orders**
Blueprints break down into an ordered queue of atomic work items each with a clear definition of done. Track progress across the entire project from a single view.

**AI Agents**
Five purpose built agents collaborate to move your project forward: Requirements Agent, Blueprint Agent, Work Order Agent, Test Agent and Feedback Agent. Each reads full project context before acting.

**Knowledge Graph**
Every entity in your project (features, components, decisions, blockers) connects in a live graph. See how a single requirement change ripples across blueprints, work orders and tests.

**Model Manager**
Download, switch and manage local models without leaving the app. First launch auto downloads a sensible default. Swap to any Ollama compatible model in one click.

**Audit Trail**
A tamper evident log of every AI action and user decision. Know not just what changed but why, what context the AI had, and what alternatives were considered.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | React 18, Vite, Framer Motion |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Database | SQLite via SQLAlchemy |
| AI Runtime | Ollama (bundled sidecar) |
| AI Protocol | OpenAI compatible REST API |
| Packaging | Single binary, all dependencies bundled |

---

## Getting Started

**Prerequisites**

Node.js 18 or later, Python 3.11 or later, Rust toolchain, Ollama installed locally.

**Install**

```bash
git clone https://github.com/devsoniclk/software-factory
cd software-factory
```

**Backend**

```bash
pip install -r requirements.txt
uvicorn backend.api.app:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

**Desktop App**

```bash
cd src-tauri
cargo tauri dev
```

On first launch the app checks for Ollama, auto starts the sidecar, and downloads a default model if none is present.

---

## Project Structure

```
software-factory/
├── backend/
│   ├── agents/          # AI agents (requirements, blueprint, test, work order, feedback)
│   ├── api/             # FastAPI routes for each domain
│   ├── models/          # SQLAlchemy models and schemas
│   ├── services/        # LLM client, knowledge graph, audit
│   └── config/          # Settings and environment
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Requirements, Blueprints, Work Orders, Tests, Feedback
│   │   ├── components/  # Shared UI components
│   │   └── api/         # React Query hooks for all endpoints
│   └── public/
├── src-tauri/           # Rust shell, window management, Ollama sidecar
└── requirements.txt
```

---

## Roadmap

**Now**
Core SDLC flow, all five agents, knowledge graph, audit trail, model manager.

**Next**
Git integration with automatic commit message generation, code review agent, deployment pipeline builder, team collaboration via local network sync.

**Later**
Plugin API so the community can build domain specific agents, visual blueprint editor, mobile companion app for reviewing work orders on the go.

---

## Contributing

Pull requests are welcome. For large changes open an issue first to discuss what you would like to change. Please make sure tests pass and code is formatted before submitting.

---

## License

MIT. Use it, fork it, ship products with it. No restrictions.

---

<div align="center">

Built to give developers full control of their own AI powered SDLC.
No cloud required.

</div>
