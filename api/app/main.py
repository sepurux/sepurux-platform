from fastapi import FastAPI

from app.routes.attempts import router as attempts_router
from app.routes.campaigns import router as campaigns_router
from app.routes.runs import router as runs_router
from app.routes.traces import router as traces_router

app = FastAPI(title="Crash Lab API")

app.include_router(attempts_router)
app.include_router(campaigns_router)
app.include_router(runs_router)
app.include_router(traces_router)


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
