from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.auth import TenantAuthContext, authenticate_api_key_value
from app.routes.analytics import router as analytics_router
from app.routes.api_keys import router as api_keys_router
from app.routes.attempts import router as attempts_router
from app.routes.campaigns import router as campaigns_router
from app.routes.counterfactuals import router as counterfactuals_router
from app.routes.projects import router as projects_router
from app.routes.runs import router as runs_router
from app.routes.traces import router as traces_router

app = FastAPI(title="Crash Lab API")


@app.middleware("http")
async def api_key_auth_middleware(request: Request, call_next):
    if not request.url.path.startswith("/v1"):
        return await call_next(request)

    api_key_value = request.headers.get("X-API-Key")
    if not api_key_value:
        return JSONResponse(status_code=401, content={"detail": "X-API-Key header is required"})

    auth_ctx = authenticate_api_key_value(request, api_key_value)
    if not isinstance(auth_ctx, TenantAuthContext):
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})

    request.state.tenant_auth = auth_ctx
    return await call_next(request)


app.include_router(api_keys_router)
app.include_router(analytics_router)
app.include_router(attempts_router)
app.include_router(campaigns_router)
app.include_router(counterfactuals_router)
app.include_router(projects_router)
app.include_router(runs_router)
app.include_router(traces_router)


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
