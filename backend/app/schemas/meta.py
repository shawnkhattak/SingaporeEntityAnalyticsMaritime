from pydantic import BaseModel, Field


class SchemaNode(BaseModel):
    id: str
    label: str
    domain: str
    columns: list[str] = Field(default_factory=list)


class SchemaEdge(BaseModel):
    source: str
    target: str
    label: str


class SchemaGraph(BaseModel):
    nodes: list[SchemaNode] = Field(default_factory=list)
    edges: list[SchemaEdge] = Field(default_factory=list)
