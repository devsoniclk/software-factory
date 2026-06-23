"""Multi-provider LLM client — Ollama / MiMo / OpenAI / DeepSeek."""
import json
import httpx
from typing import AsyncIterator, Any
from backend.config.settings import settings, PROVIDERS


class LLMClient:
    """Unified LLM client that works across providers via OpenAI-compatible API."""

    def __init__(self):
        self._provider = settings.active_provider
        self._model = settings.active_model
        self._timeout = 120.0

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
        if model:
            self._model = model
        else:
            self._model = PROVIDERS[provider]["models"][0]["name"]
        settings.active_provider = provider
        settings.active_model = self._model
        if api_key:
            settings._api_keys[provider] = api_key

    def _get_headers(self) -> dict:
        api_key = settings.get_api_key(self._provider)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    def _get_base_url(self) -> str:
        return settings.get_base_url(self._provider)

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
        model: str | None = None,
    ) -> str:
        payload = {
            "model": model or self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.temperature,
            "max_tokens": max_tokens or settings.max_tokens,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                f"{self._get_base_url()}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int | None = None,
        model: str | None = None,
    ) -> Any:
        """Chat expecting JSON response. Parses and returns structured data."""
        sys_msg = {"role": "system", "content": "You MUST respond with valid JSON only. No markdown, no explanation, just raw JSON."}
        full_messages = [sys_msg] + messages
        raw = await self.chat(full_messages, temperature=temperature, max_tokens=max_tokens, model=model)
        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last fence lines
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)

    async def stream(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
        model: str | None = None,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model or self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.temperature,
            "max_tokens": max_tokens or settings.max_tokens,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            async with client.stream(
                "POST",
                f"{self._get_base_url()}/chat/completions",
                headers=self._get_headers(),
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
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError):
                            continue


llm_client = LLMClient()
