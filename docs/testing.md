# Testing

Release gate:

```sh
scripts/test-stages.sh
cd frontend && npm run build
cd backend && ../.venv312/bin/python -m compileall app
cd backend && PYTHONPATH=. ../.venv312/bin/python -m unittest app.tests.test_positions_ingestion
```

Smoke tests use live source calls. They require `OCEANSX_API_KEY` and network access, and they intentionally fail clearly when a live source is unavailable.
