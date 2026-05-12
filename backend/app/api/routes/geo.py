from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.geo import GeoService

router = APIRouter(prefix="/api/geo", tags=["geo"])


@router.get("/layers")
async def list_geo_layers(session: Annotated[AsyncSession, Depends(get_session)]) -> list[dict]:
    return await GeoService(session).list_layers()


@router.get("/layers/{layer_name}")
async def get_geo_layer(session: Annotated[AsyncSession, Depends(get_session)], layer_name: str) -> dict:
    layer = await GeoService(session).get_layer(layer_name)
    if layer is None:
        raise HTTPException(status_code=404, detail="Geo layer not found")
    return layer
