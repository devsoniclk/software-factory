"""
App simulator: crawl a live web app, extract routes, take screenshots if Playwright available.
Falls back to httpx + BeautifulSoup for link extraction when Playwright is not installed.
"""
import asyncio
import base64
import json
import logging
import re
from typing import Optional, List, Set
from urllib.parse import urljoin, urlparse

log = logging.getLogger(__name__)

# ── Playwright detection ──────────────────────────────────────────────────────

def _playwright_available() -> bool:
    try:
        import playwright  # noqa
        return True
    except ImportError:
        return False


async def _screenshot_page_playwright(url: str) -> Optional[str]:
    """Take a screenshot and return base64 PNG."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 1280, "height": 800})
            await page.goto(url, timeout=10000, wait_until="networkidle")
            data = await page.screenshot(type="png", full_page=False)
            await browser.close()
            return base64.b64encode(data).decode()
    except Exception as e:
        log.debug("Screenshot failed for %s: %s", url, e)
        return None


def _placeholder_svg(route: str, title: str) -> str:
    """Generate a placeholder SVG card for a route when no screenshot is available."""
    label = (title or route)[:40]
    color = "#" + format(abs(hash(route)) % 0xFFFFFF, "06x")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <rect width="320" height="200" rx="8" fill="{color}22" stroke="{color}66" stroke-width="1.5"/>
  <rect x="0" y="0" width="320" height="32" rx="8" fill="{color}44"/>
  <text x="12" y="22" font-family="monospace" font-size="13" fill="{color}dd">{route[:40]}</text>
  <text x="12" y="60" font-family="sans-serif" font-size="11" fill="#555">{label}</text>
  <circle cx="24" cy="120" r="8" fill="{color}88"/>
  <rect x="40" y="114" width="120" height="12" rx="3" fill="{color}44"/>
  <rect x="40" y="132" width="80" height="10" rx="3" fill="{color}33"/>
  <rect x="12" y="156" width="60" height="24" rx="4" fill="{color}66"/>
  <rect x="80" y="156" width="60" height="24" rx="4" fill="{color}33"/>
</svg>"""


# ── Link extractor (httpx fallback) ──────────────────────────────────────────

async def _extract_links_httpx(url: str, base_url: str) -> tuple:
    """Extract links and title via httpx + regex. Returns (title, links, selector_count)."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "1024-Studio-Simulator/1.0"})
            html = r.text
    except Exception as e:
        log.debug("httpx fetch failed for %s: %s", url, e)
        return "", [], 0

    title_m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    title = title_m.group(1).strip() if title_m else ""

    hrefs = re.findall(r'href=["\']([^"\'#?][^"\']*)["\']', html)
    base_domain = urlparse(base_url).netloc
    links = []
    for h in hrefs:
        full = urljoin(base_url, h)
        parsed = urlparse(full)
        if parsed.netloc == base_domain and parsed.scheme in ("http", "https"):
            path = parsed.path or "/"
            if path not in links:
                links.append(path)

    selector_count = len(re.findall(r'<(?:button|input|select|textarea|a\s)', html, re.IGNORECASE))
    return title, links[:30], selector_count


async def _extract_links_playwright(url: str, base_url: str):
    """Extract links, title, selector count via Playwright. Returns (title, links, selector_count, screenshot_b64)."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 1280, "height": 800})
            await page.goto(url, timeout=12000, wait_until="networkidle")
            title = await page.title()
            all_links = await page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
            base_domain = urlparse(base_url).netloc
            links = []
            for h in (all_links or []):
                if not h or h.startswith("#") or h.startswith("mailto:"):
                    continue
                full = urljoin(base_url, h)
                parsed = urlparse(full)
                if parsed.netloc == base_domain:
                    path = parsed.path or "/"
                    if path not in links:
                        links.append(path)
            selector_count = await page.locator("button, input, select, textarea, a").count()
            screenshot = await page.screenshot(type="png", full_page=False)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            await browser.close()
            return title, links[:30], selector_count, screenshot_b64
    except Exception as e:
        log.debug("Playwright extraction failed for %s: %s", url, e)
        return "", [], 0, None


# ── Main crawler ──────────────────────────────────────────────────────────────

async def run_simulator(run_id: str) -> None:
    """Background task: crawl the target URL and persist screens."""
    from backend.models.engine import AsyncSessionLocal
    from backend.models.database import SimulatorRun, SimulatorScreen, uid, now_iso

    async with AsyncSessionLocal() as db:
        run = await db.get(SimulatorRun, run_id)
        if not run:
            return

        run.status = "running"
        run.started_at = now_iso()
        await db.commit()

        target = run.target_url.rstrip("/")
        base_url = target
        max_depth = run.max_depth or 2
        use_playwright = _playwright_available()

        visited: Set[str] = set()
        queue: List[tuple] = [("/", 0)]  # (path, depth)
        screens_created = 0

        while queue and screens_created < 30:
            path, depth = queue.pop(0)
            if path in visited or depth > max_depth:
                continue
            visited.add(path)

            url = base_url + path

            if use_playwright:
                title, links, sel_count, screenshot_b64 = await _extract_links_playwright(url, base_url)
            else:
                title, links, sel_count = await _extract_links_httpx(url, base_url)
                screenshot_b64 = None

            svg = _placeholder_svg(path, title) if not screenshot_b64 else None

            screen = SimulatorScreen(
                id=uid(), run_id=run_id, route=path, title=title,
                screenshot_b64=screenshot_b64, placeholder_svg=svg,
                selector_count=sel_count, depth=depth,
                links_json=json.dumps(links),
            )
            db.add(screen)
            screens_created += 1

            if depth < max_depth:
                for link in links:
                    if link not in visited:
                        queue.append((link, depth + 1))

            await db.commit()

        run.status = "done"
        run.screen_count = screens_created
        run.completed_at = now_iso()
        await db.commit()
        log.info("Simulator run %s complete: %d screens", run_id, screens_created)
