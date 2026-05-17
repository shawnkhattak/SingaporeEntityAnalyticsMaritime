# Demo Data

The demo bootstrap path is `POST /api/dev/ingestion/refresh-live`.

Refresh-live calls current OCEANS-X positions, selected particulars, selected movements, due-arrive/due-depart port activity, OCEANS-X geo layers, configured RSS feeds, and risk recompute. It does not spend OpenSanctions quota automatically; use the sanctions CSV import or run the confirmed OpenSanctions maritime API action separately.

For a fuller demo dataset, run **Map vessel particulars** from `/operations` after a positions snapshot. It fetches particulars for every current map vessel with an IMO, waits briefly between OCEANS-X calls, and saves observations, vessel fields, entities, and relationships to the database.

The map reads the latest successful positions snapshot through `/api/map/vessels?scope=latest-snapshot`. The accumulated vessel table can be larger than the live map count.
