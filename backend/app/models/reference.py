from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import BigInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import CreatedAtMixin, UpdatedAtMixin


class ReferenceData(CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "reference_data"
    __table_args__ = (UniqueConstraint("domain", "code", name="uq_reference_data_domain_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    domain: Mapped[str] = mapped_column(String(64))
    code: Mapped[str] = mapped_column(String(128))
    label: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64))
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB)
