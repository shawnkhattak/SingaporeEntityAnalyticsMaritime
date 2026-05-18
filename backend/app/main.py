from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.dev import router as dev_router
from app.api.routes.entities import router as entities_router
from app.api.routes.evidence import router as evidence_router
from app.api.routes.geo import router as geo_router
from app.api.routes.health import router as health_router
from app.api.routes.map import router as map_router
from app.api.routes.meta import router as meta_router
from app.api.routes.news import router as news_router
from app.api.routes.ports import router as ports_router
from app.api.routes.reference import router as reference_router
from app.api.routes.risk import router as risk_router
from app.api.routes.vessels import router as vessels_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="SEAM V2 API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(dev_router)
    app.include_router(map_router)
    app.include_router(vessels_router)
    app.include_router(entities_router)
    app.include_router(evidence_router)
    app.include_router(geo_router)
    app.include_router(reference_router)
    app.include_router(meta_router)
    app.include_router(ports_router)
    app.include_router(risk_router)
    app.include_router(news_router)
    return app
