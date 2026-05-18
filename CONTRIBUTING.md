# Contributing

SEAM is currently a portfolio/demo project. Contributions should preserve the product's core principles: map-first, evidence-first, deterministic, and operationally honest.

## Local Setup

```sh
./start.sh
```

Frontend:

```sh
cd frontend
npm run build
```

Backend:

```sh
.venv312/bin/pytest backend/app/tests/test_project_contracts.py
```

## Engineering Rules

- Keep frontend calls behind SEAM backend APIs; do not call OCEANS-X directly from the browser.
- Keep write actions under `/api/dev/*`.
- Preserve evidence links for generated facts.
- Do not introduce AI-generated risk explanations without a clear product decision.
- Do not add pages that have no real data contract.
- Keep desktop demo readiness ahead of broad responsive/mobile work.

## Documentation

When changing behavior, update the nearest doc under `docs/` and the root `README.md` if the change affects the repo story, setup, or demo path.
