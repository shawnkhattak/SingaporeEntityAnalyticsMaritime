from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import CreatedAtMixin, UpdatedAtMixin


class Vessel(CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "vessels"
    __table_args__ = (
        CheckConstraint("imo IS NOT NULL OR mmsi IS NOT NULL OR call_sign IS NOT NULL", name="ck_vessels_identity_present"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    imo: Mapped[Optional[str]] = mapped_column(String(16), unique=True, index=True)
    mmsi: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    call_sign: Mapped[Optional[str]] = mapped_column(String(32))
    flag_country_code: Mapped[Optional[str]] = mapped_column(String(8))
    vessel_type_code: Mapped[Optional[str]] = mapped_column(String(64))
    year_built: Mapped[Optional[int]] = mapped_column(Integer)
    deadweight: Mapped[Optional[int]] = mapped_column(Integer)
    gross_tonnage: Mapped[Optional[int]] = mapped_column(Integer)
    net_tonnage: Mapped[Optional[int]] = mapped_column(Integer)
    length_meters: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2))
    breadth_meters: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2))
    depth_meters: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2))
    current_port_code: Mapped[Optional[str]] = mapped_column(String(128))
    current_port_name: Mapped[Optional[str]] = mapped_column(String(255))
    current_port_distance_m: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 1))
    current_port_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    source_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class VesselPositionLatest(UpdatedAtMixin, Base):
    __tablename__ = "vessel_positions_latest"

    vessel_id: Mapped[int] = mapped_column(ForeignKey("vessels.id", ondelete="CASCADE"), primary_key=True)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    position: Mapped[Optional[str]] = mapped_column(Text)
    speed_knots: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    course_degrees: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    heading_degrees: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    navigational_status: Mapped[Optional[str]] = mapped_column(String(128))
    position_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))
    snapshot_job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ingestion_jobs.id", ondelete="SET NULL"), index=True)


class PortEvent(CreatedAtMixin, Base):
    __tablename__ = "port_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vessel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vessels.id", ondelete="SET NULL"), index=True)
    port_code: Mapped[Optional[str]] = mapped_column(String(64))
    port_name: Mapped[Optional[str]] = mapped_column(String(255))
    event_type: Mapped[str] = mapped_column(String(64))
    event_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    distance_meters: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 1))
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))


class Entity(CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "entities"
    __table_args__ = (UniqueConstraint("entity_type", "name", "country_code", name="uq_entities_type_name_country"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255), index=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(8))
    external_id: Mapped[Optional[str]] = mapped_column(String(128))


class Relationship(CreatedAtMixin, Base):
    __tablename__ = "relationships"
    __table_args__ = (
        CheckConstraint("vessel_id IS NOT NULL OR from_entity_id IS NOT NULL", name="ck_relationships_subject_present"),
        CheckConstraint("to_entity_id IS NOT NULL OR vessel_id IS NOT NULL", name="ck_relationships_target_present"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    from_entity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    to_entity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    vessel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vessels.id", ondelete="CASCADE"), index=True)
    relationship_type: Mapped[str] = mapped_column(String(80))
    evidence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("source_observations.id", ondelete="SET NULL"))
    evidence_summary: Mapped[Optional[str]] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(32), default="observed")
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
