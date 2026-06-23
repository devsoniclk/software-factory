.PHONY: dev test install backend frontend

install:
	pip install -r requirements.txt

dev:
	cd frontend && npm run dev &
	uvicorn backend.api.app:app --reload --host 127.0.0.1 --port 8099

backend:
	uvicorn backend.api.app:app --reload --host 127.0.0.1 --port 8099

frontend:
	cd frontend && npm run dev

test:
	pytest backend/tests/ -v
