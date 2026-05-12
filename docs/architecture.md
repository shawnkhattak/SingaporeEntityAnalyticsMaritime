# Architecture

SEAM V2 uses three runtime services: React frontend, FastAPI backend, and PostgreSQL/PostGIS.

The backend owns source access and persistence. Frontend pages call SEAM read APIs only. `source_observations` is the evidence backbone for positions, events, relationships, sanctions, news, and risk flags.
