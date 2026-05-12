from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SourceObservation(Base):
    __tablename__ = "source_observations"
    __table_args__ = (
        UniqueConstraint("source", "observation_type", "payload_hash", name="uq_source_observations_payload"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source: Mapped[str] = mapped_column(String(80), index=True)
    observation_type: Mapped[str] = mapped_column(String(80), index=True)
    source_record_id: Mapped[Optional[str]] = mapped_column(String(255))
    observed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payload_hash: Mapped[str] = mapped_column(String(64))
    raw_payload: Mapped[dict] = mapped_column(JSONB)
