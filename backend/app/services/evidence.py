from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation


class EvidenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, observation_id: int) -> SourceObservation | None:
        return await self.session.get(SourceObservation, observation_id)
