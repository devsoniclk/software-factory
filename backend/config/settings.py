"""1024 Studio configuration — auto-detects environment."""
from pathlib import Path
import os, json

# Data directory: ~/1024Studio/
DATA_DIR = Path.home() / "1024Studio"
DATA_DIR.mkdir(exist_ok=True)
(DATA_DIR / "exports").mkdir(exist_ok=True)
(DATA_DIR / "backups").mkdir(exist_ok=True)

# LLM Provider configs
PROVIDERS = {
    "ollama": {
        "name": "Ollama (Local)",
        "base_url": "http://127.0.0.1:11434/v1",
        "api_key": "ollama",
        "models_endpoint": "http://127.0.0.1:11434/api/tags",
        "requires_key": False,
        "offline": True,
        "models": [
            {"name": "qwen2.5:7b", "size": "4.4GB", "desc": "Best 7B coding model", "tags": ["coding", "fast"]},
            {"name": "qwen2.5:14b", "size": "9.0GB", "desc": "Strong 14B model", "tags": ["coding", "quality"]},
            {"name": "llama3.1:8b", "size": "4.7GB", "desc": "Meta's latest 8B", "tags": ["general", "fast"]},
            {"name": "deepseek-coder-v2:16b", "size": "8.9GB", "desc": "Top coding model", "tags": ["coding"]},
            {"name": "mistral:7b", "size": "4.1GB", "desc": "Fast general purpose", "tags": ["general", "fast"]},
            {"name": "phi3:mini", "size": "2.3GB", "desc": "Tiny but capable", "tags": ["fast", "small"]},
            {"name": "gemma2:9b", "size": "5.4GB", "desc": "Google's 9B model", "tags": ["general"]},
            {"name": "codellama:7b", "size": "3.8GB", "desc": "Code-focused Llama", "tags": ["coding", "fast"]},
        ],
    },
    "mimo": {
        "name": "Xiaomi MiMo (Free)",
        "base_url": "https://token-plan-sgp.xiaomimimo.com/v1",
        "api_key_env": "XIAOMI_API_KEY",
        "requires_key": True,
        "offline": False,
        "models": [
            {"name": "mimo-v2.5-pro", "size": "Cloud", "desc": "Flagship — reasoning + tool calling", "tags": ["coding", "reasoning", "best"]},
            {"name": "mimo-v2.5", "size": "Cloud", "desc": "Multimodal (text/image/audio/video)", "tags": ["multimodal"]},
            {"name": "mimo-v2-pro", "size": "Cloud", "desc": "Older pro model", "tags": ["general"]},
        ],
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "api_key_env": "OPENAI_API_KEY",
        "requires_key": True,
        "offline": False,
        "models": [
            {"name": "gpt-4o", "size": "Cloud", "desc": "GPT-4o flagship", "tags": ["coding", "reasoning"]},
            {"name": "gpt-4o-mini", "size": "Cloud", "desc": "Fast + cheap", "tags": ["fast"]},
        ],
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "api_key_env": "DEEPSEEK_API_KEY",
        "requires_key": True,
        "offline": False,
        "models": [
            {"name": "deepseek-chat", "size": "Cloud", "desc": "DeepSeek V3", "tags": ["coding", "reasoning"]},
            {"name": "deepseek-reasoner", "size": "Cloud", "desc": "DeepSeek R1 reasoning", "tags": ["reasoning"]},
        ],
    },
}

class Settings:
    """Global settings container."""
    def __init__(self):
        self.db_path = str(DATA_DIR / "data.db")
        self.data_dir = DATA_DIR
        self.active_provider = "ollama"
        self.active_model = "qwen2.5:7b"
        self.temperature = 0.3
        self.max_tokens = 4096
        self.cors_origins = ["http://localhost:5173", "http://localhost:8099"]
        self._api_keys = {}
        self._load_env_keys()

    def _load_env_keys(self):
        """Load API keys from environment."""
        for provider_id, cfg in PROVIDERS.items():
            env_key = cfg.get("api_key_env")
            if env_key and os.environ.get(env_key):
                self._api_keys[provider_id] = os.environ[env_key]
        # Also try loading from ~/.hermes/.env
        env_file = Path.home() / ".hermes" / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip("\"").strip("\'")
                    os.environ.setdefault(k, v)
            for provider_id, cfg in PROVIDERS.items():
                env_key = cfg.get("api_key_env")
                if env_key and os.environ.get(env_key):
                    self._api_keys[provider_id] = os.environ[env_key]

    def get_api_key(self, provider: str) -> str:
        cfg = PROVIDERS.get(provider, {})
        return self._api_keys.get(provider) or cfg.get("api_key", "")

    def get_base_url(self, provider: str) -> str:
        return PROVIDERS.get(provider, {}).get("base_url", "")

    @property
    def model(self) -> str:
        return self.active_model

settings = Settings()
