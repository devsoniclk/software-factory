# Pre-Build Checklist: What's Left to Plan

## ✅ Already Planned

| Document | Status | Coverage |
|----------|--------|----------|
| `PLAN.md` | ✅ Complete | Tech stack, architecture, 37 tasks, data model |
| `BUSINESS_MODEL.md` | ✅ Complete | Revenue streams, projections, GTM, unit economics |
| `BRAND_AND_REFERRALS.md` | ✅ Complete | Name (1024), identity, referral system, gamification |

---

## 🔴 BLOCKING: Must Plan Before Building

These decisions directly affect code architecture. Can't change them later without major refactoring.

### 1. License Strategy
**Why it blocks:** Determines if companies can use it, if competitors can fork it, and if we can monetize.

| Option | Allows Commercial Use | Allows Fork | Can Sell | Example |
|--------|----------------------|-------------|----------|---------|
| **MIT** | ✅ | ✅ | ✅ | React, VS Code |
| **Apache 2.0** | ✅ | ✅ | ✅ | Kubernetes, TensorFlow |
| **BSL 1.1** (Business Source) | ❌ (3yr delay) | ❌ | ✅ | MariaDB, HashiCorp |
| **AGPL** | ✅ (must open source) | ✅ | ✅ | MongoDB, Grafana |
| **Dual License** | Tiered | Tiered | ✅ | Qt, MySQL |

**Recommendation:** **Apache 2.0** for the core, **proprietary** for Team/Enterprise features. This is the Postman/Redis model: open core, paid add-ons.

**Decision needed:** Open core vs fully open vs BSL?

---

### 2. Payment Infrastructure
**Why it blocks:** Affects user model, database schema, API design, and frontend flows.

| Component | Options | Notes |
|-----------|---------|-------|
| **Payment processor** | Stripe vs Paddle vs LemonSqueezy | Stripe is standard, LemonSqueezy handles tax globally |
| **Billing model** | Per-seat vs flat vs usage | Per-seat for Team/Enterprise, usage for Compute |
| **Trial system** | 14-day free trial vs freemium | We have freemium (free tier), trials for Team |
| **License keys** | Server-validated vs offline | Need offline validation for local-first app |
| **Tax handling** | Manual vs automated | LemonSqueezy/Paddle handle this, Stripe needs Tax API |

**Recommendation:** **LemonSqueezy** (handles global tax, merchant of record, simple API) + offline license key validation for Team/Enterprise features.

**Decision needed:** Stripe vs LemonSqueezy vs Paddle?

---

### 3. Security Architecture
**Why it blocks:** Affects data storage, API design, encryption, and compliance.

| Concern | Question | Options |
|---------|----------|---------|
| **Data at rest** | Encrypt local SQLite? | SQLCipher (encrypted SQLite) vs plain |
| **Data in transit** | Sync encryption | TLS + E2E encryption for Team sync |
| **API keys** | How users store provider keys | OS keychain vs encrypted local store |
| **Auth for Team** | How team members authenticate | Email/password vs SSO vs magic links |
| **Telemetry** | Any data collection? | None (pure local) vs opt-in anonymous |
| **Model data** | Does prompt data go anywhere? | Ollama = fully local, MiMo/OpenAI = cloud |

**Recommendation:**
- Local data: **SQLCipher** (encrypted SQLite)
- API keys: **OS keychain** (macOS Keychain, Windows Credential Manager)
- Auth: **Magic links** (email-based, no passwords) for Team, SSO for Enterprise
- Telemetry: **Zero** by default, opt-in anonymous usage stats
- Prompts: Clear disclosure when using cloud models (MiMo, OpenAI)

**Decision needed:** Telemetry policy? Encryption approach?

---

### 4. UX/UI Design System
**Why it blocks:** Every frontend task depends on consistent components.

| Component | What to Define |
|-----------|---------------|
| **Color palette** | Primary, secondary, accent, semantic (success/error/warning) |
| **Typography** | Font family, sizes, weights, line heights |
| **Spacing scale** | 4px base grid (4, 8, 12, 16, 24, 32, 48, 64) |
| **Component library** | Buttons, inputs, modals, cards, tables, badges, tooltips |
| **Icon system** | Lucide icons (already chosen): which subset? |
| **Layout patterns** | Sidebar + main, split pane, modal vs slide-over |
| **Empty states** | What each page shows when empty |
| **Loading states** | Skeletons, spinners, progress bars |
| **Error states** | What happens when LLM fails, Ollama crashes |
| **Animations** | Framer Motion: enter/exit, page transitions, micro-interactions |

**Recommendation:** Use **shadcn/ui** component library (built on Radix + Tailwind). Copy components into project, customize. Saves 2-3 weeks of UI work.

**Decision needed:** shadcn/ui vs custom components?

---

### 5. Minimum System Requirements
**Why it blocks:** Affects which models we recommend, UI warnings, and marketing claims.

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| **RAM** | 8GB | 16GB+ | 7B model needs ~5GB RAM |
| **Storage** | 10GB | 50GB+ | App + models (4-8GB each) |
| **GPU** | None (CPU works) | 8GB+ VRAM | NVIDIA, AMD, Apple Silicon |
| **OS** | macOS 12+, Win 10+, Ubuntu 20+ | Latest | Tauri supports all three |
| **CPU** | Any 64-bit | Apple M1+, modern Intel/AMD | ARM preferred for efficiency |

**Key question:** Do we support CPU-only inference? (Slower but works for everyone)

**Recommendation:** Yes, CPU-only works. Show warning: "No GPU detected. AI generation will be slower. Consider MiMo API for faster results."

**Decision needed:** Finalize minimum requirements?

---

## 🟡 IMPORTANT: Plan During Build

These can be designed as we build, but should have a rough direction.

### 6. CI/CD Pipeline
- GitHub Actions for: lint → test → build → release
- Cross-platform builds (macOS, Windows, Linux)
- Auto-update mechanism (Tauri updater)
- Automated changelog generation

### 7. Testing Strategy
- **Unit tests:** pytest for backend, Vitest for frontend
- **Integration tests:** API endpoint tests with test DB
- **E2E tests:** Playwright for desktop app flows
- **LLM tests:** Mock LLM responses for deterministic tests
- **Performance tests:** Benchmark AI generation latency

### 8. Documentation Plan
- **User docs:** Getting started, tutorials, FAQ (VitePress or Docusaurus)
- **API docs:** Auto-generated from FastAPI (OpenAPI/Swagger)
- **Developer docs:** Contributing guide, architecture overview
- **In-app help:** Tooltips, guided tours, contextual help

### 9. Error Handling & Resilience
| Scenario | Handling |
|----------|----------|
| Ollama not installed | First-launch wizard offers to install |
| Ollama crashed | Auto-restart with notification |
| Model download failed | Retry with fallback model |
| LLM returned garbage | Parse error → retry with simpler prompt |
| Disk full | Warning + offer to clean old models |
| Network offline | Graceful fallback to local-only mode |
| SQLite corrupt | Auto-backup + restore from last good state |

### 10. Data Migration (Import from Other Tools)
- Jira → import issues as requirements
- Linear → import projects as work orders
- Notion → import pages as requirements
- Confluence → import docs as knowledge base
- CSV/Markdown → generic import

### 11. Internationalization (i18n)
- **Phase 1:** English only
- **Phase 2:** Add i18n framework (react-i18next), extract strings
- **Phase 3:** Community translations (Japanese, Chinese, Spanish, Portuguese)

### 12. Analytics (Privacy-Respecting)
- **Default:** Zero telemetry
- **Opt-in:** Anonymous usage stats (features used, not content)
- **No:** Prompt content, project names, requirement text
- **Tool:** Plausible (self-hosted) or PostHog (open source)

### 13. Accessibility (a11y)
- WCAG 2.1 AA compliance
- Keyboard navigation for all features
- Screen reader support
- High contrast mode
- Reduced motion option

---

## 🟢 NICE-TO-HAVE: Plan Later

### 14. Mobile Companion (Future)
- Read-only viewer for requirements/blueprints on mobile
- Push notifications for team updates
- Quick feedback capture from phone

### 15. AI Fine-Tuning (Future)
- Let users fine-tune models on their project data
- Custom agents trained on company coding standards
- Knowledge distillation from large models to small ones

### 16. Plugin Marketplace Economics (Future)
- Revenue split with plugin developers
- Plugin review process
- Plugin security sandboxing
- Developer payout system

### 17. Enterprise Compliance Pack (Future)
- SOC 2 Type II certification
- ISO 27001 compliance
- HIPAA compliance for healthcare
- FedRAMP for government

---

## DECISION MATRIX: What to Decide NOW

| # | Decision | Options | Recommendation | Impact |
|---|----------|---------|----------------|--------|
| 1 | **License** | MIT / Apache 2.0 / BSL / AGPL | Apache 2.0 core + proprietary add-ons | HIGH |
| 2 | **Payment processor** | Stripe / LemonSqueezy / Paddle | LemonSqueezy | HIGH |
| 3 | **Encryption** | SQLCipher / plain SQLite / file-level | SQLCipher for sensitive data | MEDIUM |
| 4 | **UI components** | shadcn/ui / custom / Chakra / MUI | shadcn/ui | HIGH |
| 5 | **Telemetry** | None / opt-in / required | None default, opt-in | MEDIUM |
| 6 | **CPU-only support** | Yes / No / API-only fallback | Yes + MiMo API fallback | HIGH |
| 7 | **Auth for Team** | Magic link / password / SSO | Magic link + SSO for Enterprise | MEDIUM |
| 8 | **Docs framework** | VitePress / Docusaurus / Starlight | VitePress (fast, Vue-based) | LOW |

---

## SUGGESTED NEXT STEPS

1. **You decide:** License, payment processor, telemetry policy (3 decisions)
2. **I design:** UX/UI design system with shadcn/ui (I can build this)
3. **I plan:** CI/CD pipeline, testing strategy, error handling (I can plan these)
4. **Then we BUILD**: Phase 1 starts immediately after decisions

**Total remaining planning: ~2-3 hours for items 6-13, then we're ready.**

The 3 blocking decisions above are the only things stopping us from writing code right now.
