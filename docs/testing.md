# Testing

Use these checks before a demo or release-style commit.

## Backend

```sh
.venv312/bin/pytest backend/app/tests/test_project_contracts.py
```

Optional compile check:

```sh
cd backend
PYTHONPATH=. ../.venv312/bin/python -m compileall app
```

## Frontend

```sh
cd frontend
npm run build
```

Production preview:

```sh
cd frontend
npm run preview
```

## Full Smoke

```sh
scripts/test-stages.sh
```

Smoke tests can require live source credentials and network access. They should fail clearly when a source is unavailable rather than silently using fake data.

## Manual Demo Routes

Check:

- `/map`
- `/risk`
- `/operations`
- `/vessels`
- `/entities`
- `/ports`
- `/news`
- `/evidence/:id` for a real evidence ID
- `/roadmap`
- an invalid route such as `/nonexistent-page`
