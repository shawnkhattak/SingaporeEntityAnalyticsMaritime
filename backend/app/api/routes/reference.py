from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.reference import ReferenceDataRead
from app.services.reference import ReferenceService

router = APIRouter(prefix="/api", tags=["reference"])


@router.get("/reference/{domain}", response_model=list[ReferenceDataRead])
async def list_reference_domain(
    session: Annotated[AsyncSession, Depends(get_session)],
    domain: str,
) -> list[ReferenceDataRead]:
    return [ReferenceDataRead.model_validate(row) for row in await ReferenceService(session).list_domain(domain)]


@router.get("/dev/reference/summary", response_model=dict[str, int])
async def reference_summary(session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, int]:
    return await ReferenceService(session).summary()
