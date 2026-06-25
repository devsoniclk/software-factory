"""Multi-provider LLM client: Ollama / MiMo / OpenAI / DeepSeek."""
import json
import logging
import httpx
from typing import Optional, List, AsyncIterator, Any
from backend.config.settings import settings, PROVIDERS

logger = logging.getLogger(__name__)

_REPAIR_PROMPT = (
    "Your previous response was not valid JSON.\n"
    "Parse error: {error}\n\n"
    "Your response was:\n{response}\n\n"
    "Fix it and return ONLY valid JSON. No markdown, no explanation."
)

# Persistent connection pool — reused across all requests (no per-call overhead)
_HTTP_LIMITS = httpx.Limits(max_connections=10, max_keepalive_connections=5)
_http_pool: Optional[httpx.AsyncClient] = None


def _get_pool() -> httpx.AsyncClient:
    global _http_pool
    if _http_pool is None or _http_pool.is_closed:
        _http_pool = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            limits=_HTTP_LIMITS,
        )
    return _http_pool


class LLMClient:
    """Unified LLM client that works across providers via OpenAI-compatible API."""

    def __init__(self):
        self._provider = settings.active_provider
        self._model = settings.active_model

    @property
    def provider(self) -> str:
        return self._provider

    @property
    def model(self) -> str:
        return self._model

    def set_provider(self, provider: str, model: str = "", api_key: str = ""):
        if provider not in PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}. Available: {list(PROVIDERS.keys())}")
        self._provider = provider
        self._model = model or PROVIDERS[provider]["models"][0]["name"]
        settings.active_provider = provider
        settings.active_model = self._model
        if api_key:
            settings._api_keys[provider] = api_key

    def _headers(self) -> dict:
        api_key = settings.get_api_key(self._provider)
        h = {"Content-Type": "application/json"}
        if api_key:
            h["Authorization"] = f"Bearer {api_key}"
        return h

    def _base_url(self) -> str:
        return settings.get_base_url(self._provider)

    async def _http_post(self, payload: dict) -> dict:
        """Raw HTTP post — no token tracking, called by the engine."""
        client = _get_pool()
        resp = await client.post(
            f"{self._base_url()}/chat/completions",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def _post(
        self,
        payload: dict,
        *,
        agent_type: str = "default",
        session_id: str = "global",
    ) -> dict:
        """Post through the token engine (cache, budget, tracking)."""
        from backend.services.token_engine import token_engine
        return await token_engine.call(
            payload,
            provider=self._provider,
            model=self._model,
            agent_type=agent_type,
            session_id=session_id,
            http_post=self._http_post,
        )

    async def chat(
        self,
        messages: List[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
        tools: Optional[List[dict]] = None,
        agent_type: str = "default",
        session_id: str = "global",
    ) -> dict:
        """Raw chat completion — returns the full response dict."""
        payload: dict = {
            "model": model or self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.temperature,
            "max_tokens": max_tokens or settings.max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        return await self._post(payload, agent_type=agent_type, session_id=session_id)

    async def chat_text(
        self,
        messages: List[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
        agent_type: str = "default",
        session_id: str = "global",
    ) -> str:
        """Chat and return assistant text content."""
        data = await self.chat(
            messages, temperature=temperature, max_tokens=max_tokens, model=model,
            agent_type=agent_type, session_id=session_id,
        )
        return data["choices"][0]["message"]["content"] or ""

    async def chat_json(
        self,
        messages: List[dict],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
        max_retries: int = 3,
        agent_type: str = "default",
        session_id: str = "global",
    ) -> Any:
        """Chat expecting JSON. Retries with repair prompt on parse failure."""
        sys_msg = {
            "role": "system",
            "content": "You MUST respond with valid JSON only. No markdown fences, no explanation — raw JSON only.",
        }
        msgs = [sys_msg] + list(messages)
        last_raw = ""
        last_error = ""

        for attempt in range(max_retries):
            if attempt > 0:
                msgs.append({"role": "assistant", "content": last_raw})
                msgs.append({
                    "role": "user",
                    "content": _REPAIR_PROMPT.format(error=last_error, response=last_raw[:800]),
                })

            raw = await self.chat_text(
                msgs, temperature=temperature, max_tokens=max_tokens, model=model,
                agent_type=agent_type, session_id=session_id,
            )
            last_raw = raw

            text = raw.strip()
            if text.startswith("```"):
                lines = text.splitlines()
                text = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()

            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                last_error = str(e)
                logger.warning("JSON parse failed (attempt %d/%d): %s", attempt + 1, max_retries, e)

        raise ValueError(
            f"LLM returned invalid JSON after {max_retries} attempts. "
            f"Last error: {last_error}. Raw (first 400 chars): {last_raw[:400]}"
        )

    async def run_agent(
        self,
        messages: List[dict],
        tools: List[dict],
        tool_executor: Any,
        max_iterations: int = 12,
        temperature: float = 0.2,
        agent_type: str = "default",
        session_id: str = "global",
    ) -> str:
        """
        Agent loop: iterates tool calls until the model returns a stop signal
        or max_iterations is reached. Returns final assistant text content.
        """
        msgs = list(messages)

        for iteration in range(max_iterations):
            data = await self.chat(
                msgs, tools=tools, temperature=temperature,
                agent_type=agent_type, session_id=session_id,
            )
            choice = data["choices"][0]
            message = choice["message"]
            msgs.append(message)

            finish_reason = choice.get("finish_reason", "")
            tool_calls = message.get("tool_calls") or []

            if not tool_calls or finish_reason == "stop":
                return message.get("content") or ""

            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"] or "{}")
                except json.JSONDecodeError:
                    fn_args = {}

                try:
                    result = await tool_executor(fn_name, fn_args)
                    result_str = json.dumps(result) if not isinstance(result, str) else result
                except Exception as exc:
                    result_str = json.dumps({"error": str(exc)})

                msgs.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result_str,
                })

            logger.debug("Agent iteration %d/%d complete", iteration + 1, max_iterations)

        logger.warning("Agent hit max_iterations=%d without finishing", max_iterations)
        return msgs[-1].get("content") or ""

    async def stream(
        self,
        messages: List[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model or self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.temperature,
            "max_tokens": max_tokens or settings.max_tokens,
            "stream": True,
        }
        client = _get_pool()
        async with client.stream(
            "POST",
            f"{self._base_url()}/chat/completions",
            headers=self._headers(),
            json=payload,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        content = data["choices"][0].get("delta", {}).get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def close(self) -> None:
        global _http_pool
        if _http_pool and not _http_pool.is_closed:
            await _http_pool.aclose()
            _http_pool = None


llm_client = LLMClient()
