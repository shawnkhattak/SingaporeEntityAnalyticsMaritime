from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReferenceDataRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    code: str
    label: str
    description: str | None
    source: str
    created_at: datetime
    updated_at: datetime
