from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import PortEvent
from app.schemas.vessels import VesselEventRead


class PortService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def activity(self, kind: str | None = None, limit: int = 50) -> list[VesselEventRead]:
        statement = select(PortEvent).order_by(desc(PortEvent.event_time), desc(PortEvent.created_at)).limit(limit)
        if kind:
            event_types = {
                "due-arrive": ["due-arrive", "due_arrive"],
                "due-depart": ["due-depart", "due_depart"],
                "movement": ["movement", "arrival", "departure"],
            }.get(kind, [kind])
            statement = (
                select(PortEvent)
                .where(PortEvent.event_type.in_(event_types))
                .order_by(desc(PortEvent.event_time), desc(PortEvent.created_at))
                .limit(limit)
            )
        rows = await self.session.scalars(statement)
        return [VesselEventRead.model_validate(row) for row in rows]
