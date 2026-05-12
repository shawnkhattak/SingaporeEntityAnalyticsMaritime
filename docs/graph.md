# Graph

`/graph` uses backend graph APIs only:

- `GET /api/graph/vessels/{vessel_id}`
- `GET /api/graph/entities/{entity_id}`

Edges include evidence IDs where available. Evidence resolves through `GET /api/evidence/{observation_id}`.
