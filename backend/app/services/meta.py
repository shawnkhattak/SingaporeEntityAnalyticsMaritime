from app.db.base import Base
from app.schemas.meta import SchemaEdge, SchemaGraph, SchemaNode

DOMAIN_BY_TABLE_PREFIX = {
    "vessel": "vessel",
    "port": "port",
    "entit": "entity",
    "relationship": "entity",
    "source": "evidence",
    "risk": "risk",
    "sanctions": "risk",
    "news": "news",
    "ingestion": "ingestion",
    "reference": "reference",
}


class MetaService:
    def schema_graph(self) -> SchemaGraph:
        nodes: list[SchemaNode] = []
        edges: list[SchemaEdge] = []
        for table in sorted(Base.metadata.tables.values(), key=lambda item: item.name):
            nodes.append(
                SchemaNode(
                    id=table.name,
                    label=table.name.replace("_", " ").title(),
                    domain=self._domain_for_table(table.name),
                    columns=[column.name for column in table.columns],
                )
            )
            for foreign_key in table.foreign_keys:
                edges.append(
                    SchemaEdge(
                        source=table.name,
                        target=foreign_key.column.table.name,
                        label=f"{foreign_key.parent.name} -> {foreign_key.column.name}",
                    )
                )
        return SchemaGraph(nodes=nodes, edges=edges)

    @staticmethod
    def _domain_for_table(table_name: str) -> str:
        for prefix, domain in DOMAIN_BY_TABLE_PREFIX.items():
            if table_name.startswith(prefix):
                return domain
        return "core"
