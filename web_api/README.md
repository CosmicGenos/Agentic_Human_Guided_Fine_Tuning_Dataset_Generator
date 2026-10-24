# web_api

FastAPI service. Independent uv project (own `.venv`, web-only deps: no torch / Marker).

> Run every command from the **repo root** unless a step says otherwise, so `web_api.*` imports resolve.
> Commands are PowerShell. Windows PowerShell 5.1 has no `&&`, so steps are chained with `;`.

## Containers needed
PostgreSQL · Redis · Qdrant · Silo (S3 storage). From the repo root:
```powershell
docker compose up -d
docker compose ps          # wait until all show (healthy)
```

## First-time setup
```powershell
copy .env.example .env     # then fill in the secrets (generation commands are in the file)

uv sync --project web_api

# schema for the main and the test database (runs as synth_owner)
cd web_api ; uv run alembic upgrade head ; uv run alembic -x db=test upgrade head ; cd ..

# LangGraph checkpoint tables + the first admin
uv run --project web_api python -m web_api.scripts.setup_checkpointer
uv run --project web_api python -m web_api.scripts.create_admin --email you@example.com --username admin
```

## Run
```powershell
uv run --project web_api uvicorn web_api.main:app --reload --port 8000 --loop asyncio:SelectorEventLoop
```
- Open http://localhost:8000/docs. Startup takes about 30 seconds (imports and LiteLLM's model catalog).
- `--loop asyncio:SelectorEventLoop` is required on Windows (psycopg async can't use the Proactor loop).
- On startup the API creates the storage bucket (`MINIO_BUCKET`) if it doesn't exist.

## Test
```powershell
uv run --project web_api pytest web_api/tests     # uses synthetic_data_test; email, storage, Celery and model calls are faked
```

## After changing `db/models/`
```powershell
cd web_api
uv run alembic revision --autogenerate -m "describe the change"   # then REVIEW the new file in alembic/versions/
uv run alembic upgrade head ; uv run alembic -x db=test upgrade head
cd ..
```

## Layout
- `db/models/`: SQLAlchemy tables. `alembic/versions/`: migrations (autogenerate, then review)
- `data_models/`: Pydantic request/response schemas
- `services/`: business logic (take an `AsyncSession`). `routers/`: HTTP layer
- `deps/`: auth (`CurrentUser`, `AdminUser`), project access, internal-token guard

## Env (shared root `.env`, see `.env.example`)
`DATABASE_URL` (synth_app), `MIGRATION_DATABASE_URL` (synth_owner), the two `TEST_*` URLs, `JWT_SECRET_KEY`,
`ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `MINIO_*` (Silo storage; the names are kept from MinIO, which Silo is a fork of),
`RESEND_API_KEY` + `FROM_EMAIL` (optional: without them invite links are printed in the API log).

Per-provider LLM keys are **not** env vars. Admins add them in the Credentials API
(Fernet-encrypted in Postgres) and projects attach them per stage.

Worker-only routes (`/internal/*`, `/webhooks/*`) require the `X-Internal-Token` header.
