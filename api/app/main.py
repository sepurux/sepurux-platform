from fastapi import FastAPI

from app.routes.campaigns import router as campaigns_router
from app.routes.traces import router as traces_router

app = FastAPI(title="Crash Lab API")

app.include_router(campaigns_router)
app.include_router(traces_router)


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
