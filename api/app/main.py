from fastapi import FastAPI

app = FastAPI(title="Crash Lab API")


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
