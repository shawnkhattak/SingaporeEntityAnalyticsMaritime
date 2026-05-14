from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maritime import PortEvent, Vessel
from app.schemas.vessels import VesselEventRead, VesselSummary


class PortService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def activity(self, kind: str | None = None, limit: int = 50, activity_date: date | None = None) -> list[VesselEventRead]:
        statement = (
            select(PortEvent, Vessel)
            .outerjoin(Vessel, Vessel.id == PortEvent.vessel_id)
            .order_by(desc(PortEvent.event_time), desc(PortEvent.created_at))
            .limit(limit)
        )
        filters = []
        if kind:
            event_types = {
                "due-arrive": ["due-arrive", "due_arrive"],
                "due-depart": ["due-depart", "due_depart"],
                "movement": ["movement", "arrival", "departure"],
            }.get(kind, [kind])
            filters.append(PortEvent.event_type.in_(event_types))
        if activity_date is not None:
            start = datetime.combine(activity_date, time.min, tzinfo=UTC)
            end = start + timedelta(days=1)
            filters.extend([PortEvent.event_time >= start, PortEvent.event_time < end])
        if filters:
            statement = statement.where(*filters)
        rows = await self.session.execute(statement)
        return [
            VesselEventRead(
                **VesselEventRead.model_validate(event).model_dump(exclude={"vessel"}),
                vessel=VesselSummary.model_validate(vessel) if vessel is not None else None,
            )
            for event, vessel in rows
        ]
