"""Project templates : pre-built requirements + blueprints for quick starts."""
import json
TEMPLATES = [
    {
        "name": "Web Application",
        "description": "Full-stack web application with user auth, database, and responsive UI.",
        "category": "web",
        "requirements": [
            {"title": "User Authentication", "description": "Implement user registration, login, and logout with secure password hashing and session management.", "priority": 1, "acceptance_criteria": ["Users can register with email/password", "Passwords are hashed with bcrypt", "Sessions expire after 24h of inactivity", "Forgot password flow works via email"]},
            {"title": "Responsive Dashboard", "description": "Main dashboard with responsive layout that works on mobile, tablet, and desktop.", "priority": 1, "acceptance_criteria": ["Layout adapts to screen sizes 320px–2560px", "Dashboard loads in under 2 seconds", "Key metrics are visible above the fold"]},
            {"title": "REST API Layer", "description": "RESTful API with proper HTTP methods, status codes, and JSON responses.", "priority": 1, "acceptance_criteria": ["All endpoints return consistent JSON format", "Proper HTTP status codes (200, 201, 400, 404, 500)", "API versioning via URL prefix", "Pagination for list endpoints"]},
            {"title": "Database Design", "description": "Relational database schema with migrations, indexes, and proper relationships.", "priority": 1, "acceptance_criteria": ["All tables have primary keys and timestamps", "Foreign keys enforce referential integrity", "Indexes on frequently queried columns", "Migration scripts for schema changes"]},
            {"title": "Input Validation", "description": "Server-side and client-side validation for all user inputs.", "priority": 2, "acceptance_criteria": ["All form fields validated on submit", "SQL injection prevention", "XSS prevention via output encoding", "File upload size and type restrictions"]},
            {"title": "Error Handling", "description": "Global error handling with user-friendly error pages and logging.", "priority": 2, "acceptance_criteria": ["Custom 404 and 500 pages", "Errors logged with stack traces", "No raw error messages shown to users", "Retry logic for transient failures"]},
            {"title": "Search Functionality", "description": "Full-text search across main content entities.", "priority": 3, "acceptance_criteria": ["Search returns results in under 500ms", "Results are relevance-ranked", "Search supports partial matching", "Search history is saved"]},
            {"title": "File Upload & Storage", "description": "Support for uploading and serving user files with size limits.", "priority": 3, "acceptance_criteria": ["Files up to 10MB supported", "Images are resized for thumbnails", "Secure file serving with access control", "Virus scanning for uploads"]},
            {"title": "Email Notifications", "description": "Transactional email system for user notifications.", "priority": 4, "acceptance_criteria": ["Welcome email on registration", "Password reset emails", "Notification preferences per user", "Email templates are customizable"]},
            {"title": "Analytics & Monitoring", "description": "Basic analytics tracking and application health monitoring.", "priority": 5, "acceptance_criteria": ["Page view tracking", "Error rate monitoring", "Response time metrics", "Health check endpoint returns system status"]},
        ],
        "blueprint": {
            "name": "Web App Architecture",
            "description": "Modern full-stack architecture with separate frontend and backend, relational database, and REST API layer.",
            "decisions": [
                {"title": "Use SPA frontend", "rationale": "Better UX with client-side routing and state management"},
                {"title": "REST API backend", "rationale": "Clean separation of concerns, easy to test and evolve"},
                {"title": "SQLite for development", "rationale": "Zero-config database, easy migration to PostgreSQL later"},
                {"title": "JWT for auth tokens", "rationale": "Stateless authentication, works with API and SPA"},
            ],
            "components": [
                {"name": "Frontend SPA", "description": "React/Vue single-page application", "technology": "React + Vite"},
                {"name": "API Server", "description": "RESTful backend service", "technology": "FastAPI + Python"},
                {"name": "Database", "description": "Primary data store", "technology": "SQLite (dev) / PostgreSQL (prod)"},
                {"name": "File Storage", "description": "User file uploads", "technology": "Local filesystem / S3"},
                {"name": "Email Service", "description": "Transactional emails", "technology": "SMTP / SendGrid"},
                {"name": "Cache Layer", "description": "Session and query caching", "technology": "Redis / In-memory"},
            ],
            "constraints": [
                "Must support modern browsers (Chrome, Firefox, Safari, Edge)",
                "API response time under 200ms for 95th percentile",
                "Zero-downtime deployments",
                "GDPR compliant data handling",
            ],
        },
    },
    {
        "name": "REST API",
        "description": "Backend REST API service with authentication, rate limiting, and comprehensive documentation.",
        "category": "api",
        "requirements": [
            {"title": "API Authentication", "description": "Implement API key and JWT-based authentication for all endpoints.", "priority": 1, "acceptance_criteria": ["API keys can be generated and revoked", "JWT tokens expire after configurable time", "Refresh token rotation supported", "Rate limiting per API key"]},
            {"title": "CRUD Endpoints", "description": "Full CRUD operations for all resource types.", "priority": 1, "acceptance_criteria": ["POST/GET/PUT/DELETE for each resource", "Proper HTTP status codes", "Consistent error response format", "Bulk operations supported"]},
            {"title": "API Documentation", "description": "Auto-generated API docs with examples.", "priority": 1, "acceptance_criteria": ["OpenAPI 3.0 spec generated automatically", "Interactive docs at /docs", "All endpoints have descriptions and examples", "Schema definitions for all models"]},
            {"title": "Rate Limiting", "description": "Configurable rate limiting to prevent abuse.", "priority": 2, "acceptance_criteria": ["Per-user and per-IP rate limits", "Rate limit headers in responses (X-RateLimit-*)", "429 status code when exceeded", "Different limits for different endpoints"]},
            {"title": "Pagination & Filtering", "description": "Cursor-based pagination with filtering and sorting.", "priority": 2, "acceptance_criteria": ["Cursor and offset pagination supported", "Filter by any field", "Sort by multiple fields", "Total count in response headers"]},
            {"title": "Webhooks", "description": "Webhook system for real-time event notifications.", "priority": 3, "acceptance_criteria": ["Users can register webhook URLs", "Events trigger webhook deliveries", "Retry logic with exponential backoff", "Webhook signature verification"]},
            {"title": "API Versioning", "description": "Version management for backward compatibility.", "priority": 3, "acceptance_criteria": ["URL-based versioning (v1, v2)", "Deprecation headers for old versions", "Changelog for each version", "Minimum 6-month support for old versions"]},
            {"title": "Logging & Monitoring", "description": "Structured logging and request tracing.", "priority": 2, "acceptance_criteria": ["All requests logged with correlation ID", "Error tracking with stack traces", "Performance metrics per endpoint", "Health check endpoint"]},
            {"title": "Data Export", "description": "Export data in multiple formats.", "priority": 4, "acceptance_criteria": ["CSV and JSON export", "Streaming for large datasets", "Background job for large exports", "Download link with expiration"]},
            {"title": "Caching Strategy", "description": "HTTP caching and server-side cache.", "priority": 3, "acceptance_criteria": ["ETags for all GET endpoints", "Cache-Control headers", "Server-side cache for frequent queries", "Cache invalidation on updates"]},
        ],
        "blueprint": {
            "name": "REST API Architecture",
            "description": "Clean REST API architecture with layered design, comprehensive middleware, and production-ready features.",
            "decisions": [
                {"title": "FastAPI framework", "rationale": "Async support, auto docs, type validation, high performance"},
                {"title": "Layered architecture", "rationale": "Clear separation: routes → services → repositories → models"},
                {"title": "JWT authentication", "rationale": "Stateless, works with microservices, supports refresh tokens"},
                {"title": "PostgreSQL for production", "rationale": "Robust, supports JSON columns, excellent full-text search"},
            ],
            "components": [
                {"name": "API Router Layer", "description": "Request routing and validation", "technology": "FastAPI routers"},
                {"name": "Service Layer", "description": "Business logic", "technology": "Python services"},
                {"name": "Data Access Layer", "description": "Database operations", "technology": "SQLAlchemy ORM"},
                {"name": "Auth Middleware", "description": "Authentication and authorization", "technology": "JWT + middleware"},
                {"name": "Cache Layer", "description": "Response caching", "technology": "Redis"},
                {"name": "Job Queue", "description": "Background tasks", "technology": "Celery / Redis"},
            ],
            "constraints": [
                "All endpoints must have OpenAPI documentation",
                "Response time under 100ms for cached endpoints",
                "Backward compatibility for at least 2 API versions",
                "All database queries must use parameterized statements",
            ],
        },
    },
    {
        "name": "Mobile App",
        "description": "Cross-platform mobile application with offline support, push notifications, and native-feel UI.",
        "category": "mobile",
        "requirements": [
            {"title": "Cross-Platform UI", "description": "Shared UI components that look native on both iOS and Android.", "priority": 1, "acceptance_criteria": ["UI follows iOS Human Interface Guidelines on iOS", "UI follows Material Design on Android", "Shared codebase for both platforms", "Smooth 60fps animations"]},
            {"title": "Offline Support", "description": "Core functionality works without internet connection.", "priority": 1, "acceptance_criteria": ["Data cached locally", "Offline actions queued and synced", "Visual indicator for offline state", "Conflict resolution on sync"]},
            {"title": "Push Notifications", "description": "Push notification system for real-time updates.", "priority": 2, "acceptance_criteria": ["Push notifications on iOS and Android", "Notification preferences per category", "Deep linking from notifications", "Notification history in-app"]},
            {"title": "User Onboarding", "description": "Guided onboarding flow for new users.", "priority": 2, "acceptance_criteria": ["3-5 step guided tour", "Skip option available", "Progress indicator", "Contextual tips after onboarding"]},
            {"title": "Biometric Auth", "description": "Fingerprint and face recognition for quick login.", "priority": 3, "acceptance_criteria": ["Face ID on iOS", "Fingerprint on Android", "Fallback to PIN/password", "Secure keychain storage"]},
            {"title": "Performance Optimization", "description": "App startup time, memory usage, and battery optimization.", "priority": 1, "acceptance_criteria": ["Cold start under 3 seconds", "Memory usage under 150MB", "Battery drain less than 5% per hour active use", "Lazy loading for heavy content"]},
            {"title": "Image Handling", "description": "Camera integration, image compression, and gallery access.", "priority": 3, "acceptance_criteria": ["Camera capture with preview", "Gallery multi-select", "Image compression before upload", "EXIF data handling"]},
            {"title": "Accessibility", "description": "Full accessibility support for screen readers and assistive tech.", "priority": 2, "acceptance_criteria": ["VoiceOver/TalkBack compatible", "Minimum touch target 44x44 points", "Color contrast ratio 4.5:1 minimum", "Dynamic font size support"]},
            {"title": "App Analytics", "description": "User behavior tracking and crash reporting.", "priority": 4, "acceptance_criteria": ["Screen view tracking", "Custom event tracking", "Crash reports with symbolication", "Performance monitoring"]},
            {"title": "App Store Preparation", "description": "Store listing assets, screenshots, and submission workflow.", "priority": 5, "acceptance_criteria": ["App icon in all required sizes", "Screenshots for all device sizes", "App description and keywords", "Privacy policy and terms of service"]},
        ],
        "blueprint": {
            "name": "Mobile App Architecture",
            "description": "Cross-platform mobile architecture with shared business logic, platform-specific UI adaptations, and robust offline support.",
            "decisions": [
                {"title": "React Native / Flutter", "rationale": "Cross-platform with near-native performance and shared business logic"},
                {"title": "Offline-first architecture", "rationale": "Better UX in poor connectivity areas, faster perceived performance"},
                {"title": "Firebase for backend services", "rationale": "Push notifications, auth, and analytics in one platform"},
                {"title": "State management with Redux/Bloc", "rationale": "Predictable state, easy debugging, time-travel debugging"},
            ],
            "components": [
                {"name": "UI Layer", "description": "Shared UI components with platform adaptations", "technology": "React Native / Flutter widgets"},
                {"name": "State Management", "description": "Application state handling", "technology": "Redux Toolkit / Riverpod"},
                {"name": "API Client", "description": "Backend communication", "technology": "Axios / Dio with interceptors"},
                {"name": "Local Database", "description": "Offline data storage", "technology": "SQLite / Hive"},
                {"name": "Push Service", "description": "Notification handling", "technology": "Firebase Cloud Messaging"},
                {"name": "Analytics", "description": "User behavior tracking", "technology": "Firebase Analytics / Mixpanel"},
            ],
            "constraints": [
                "Must support iOS 14+ and Android 8+",
                "App bundle size under 50MB",
                "Offline mode must handle 100% of read operations",
                "Push notification delivery within 5 seconds",
            ],
        },
    },
]


async def seed_templates(db):
    """Insert default templates if they don't exist."""
    from sqlalchemy import select
    from backend.models.database import Template

    result = await db.execute(select(Template).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # Already seeded

    for t in TEMPLATES:
        template = Template(
            name=t["name"],
            description=t["description"],
            category=t["category"],
            requirements_json=json.dumps(t["requirements"]),
            blueprint_json=json.dumps(t["blueprint"]),
        )
        db.add(template)
    await db.commit()
