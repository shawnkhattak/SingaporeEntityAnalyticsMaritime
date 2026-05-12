from fastapi import APIRouter

from app.schemas.meta import SchemaGraph
from app.services.meta import MetaService

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/schema-graph", response_model=SchemaGraph)
async def get_schema_graph() -> SchemaGraph:
    return MetaService().schema_graph()
