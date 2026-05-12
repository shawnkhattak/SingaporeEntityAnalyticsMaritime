from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference import ReferenceData

CURATED_REFERENCE = {
    "flag_country": {
        "PA": "Panama",
        "LR": "Liberia",
        "SG": "Singapore",
    },
    "vessel_type": {
        "CS": "Container ship",
    },
    "entity_role": {
        "registered_owner": "Registered owner",
        "ship_manager": "Ship manager",
        "operator": "Operator",
        "classification_society": "Classification society",
        "flag_state": "Flag state",
        "vessel_type": "Vessel type",
    },
}


class ReferenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ensure_curated(self) -> None:
        for domain, values in CURATED_REFERENCE.items():
            for code, label in values.items():
                existing = await self.session.scalar(
                    select(ReferenceData).where(ReferenceData.domain == domain, ReferenceData.code == code)
                )
                if existing is None:
                    self.session.add(
                        ReferenceData(
                            domain=domain,
                            code=code,
                            label=label,
                            description=None,
                            source="curated-reference",
                            raw_payload={"code": code, "label": label},
                        )
                    )
        await self.session.commit()

    async def list_domain(self, domain: str) -> list[ReferenceData]:
        await self.ensure_curated()
        rows = await self.session.scalars(
            select(ReferenceData).where(ReferenceData.domain == domain).order_by(ReferenceData.label)
        )
        return list(rows)

    async def summary(self) -> dict[str, int]:
        await self.ensure_curated()
        rows = await self.session.scalars(select(ReferenceData.domain))
        summary: dict[str, int] = {}
        for domain in rows:
            summary[domain] = summary.get(domain, 0) + 1
        return summary
