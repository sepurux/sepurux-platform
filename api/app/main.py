import os
import secrets

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import TenantAuthContext, authenticate_api_key_value
from app.routes.analytics import router as analytics_router
from app.routes.api_keys import router as api_keys_router
from app.routes.attempts import router as attempts_router
from app.routes.audit_events import router as audit_events_router
from app.routes.campaigns import router as campaigns_router
from app.routes.ci import router as ci_router
from app.routes.counterfactuals import router as counterfactuals_router
from app.routes.demo import router as demo_router
from app.routes.mutation_packs import router as mutation_packs_router
from app.routes.policy_packs import router as policy_packs_router
from app.routes.projects import router as projects_router
from app.routes.runs import router as runs_router
from app.routes.templates import router as templates_router
from app.routes.tools import router as tools_router
from app.routes.traces import router as traces_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI(title="Sepurux API")


def _parse_cors_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


cors_origins = _parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS"))
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if "*" in cors_origins else cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def api_key_auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    if request.url.path.startswith("/v1/ci"):
        return await call_next(request)
    if not request.url.path.startswith("/v1"):
        return await call_next(request)

    api_key_value = request.headers.get("X-API-Key")
    if not api_key_value:
        return JSONResponse(status_code=401, content={"detail": "X-API-Key header is required"})

    try:
        auth_ctx = authenticate_api_key_value(request, api_key_value)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    if not isinstance(auth_ctx, TenantAuthContext):
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})

    request.state.tenant_id = auth_ctx.tenant_id
    request.state.tenant_auth = auth_ctx
    return await call_next(request)


@app.middleware("http")
async def ci_token_auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    if not request.url.path.startswith("/v1/ci"):
        return await call_next(request)

    expected_token = os.getenv("CI_TOKEN")
    if not expected_token:
        return await call_next(request)

    provided_token = request.headers.get("X-Sepurux-Token")
    if not provided_token or not secrets.compare_digest(provided_token, expected_token):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing X-Sepurux-Token header"},
        )

    return await call_next(request)


app.include_router(api_keys_router)
app.include_router(analytics_router)
app.include_router(audit_events_router)
app.include_router(attempts_router)
app.include_router(campaigns_router)
app.include_router(ci_router)
app.include_router(counterfactuals_router)
app.include_router(mutation_packs_router)
app.include_router(policy_packs_router)
app.include_router(projects_router)
app.include_router(runs_router)
app.include_router(templates_router)
app.include_router(tools_router)
app.include_router(traces_router)
app.include_router(webhooks_router)
app.include_router(demo_router)


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
