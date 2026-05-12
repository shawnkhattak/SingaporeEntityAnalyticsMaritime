from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.evidence import EvidenceRead
from app.services.evidence import EvidenceService

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.get("/{observation_id}", response_model=EvidenceRead)
async def get_evidence(
    session: Annotated[AsyncSession, Depends(get_session)],
    observation_id: int,
) -> EvidenceRead:
    observation = await EvidenceService(session).get(observation_id)
    if observation is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return EvidenceRead.model_validate(observation)
