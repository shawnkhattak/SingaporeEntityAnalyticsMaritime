# Demo Data

The demo bootstrap path is `POST /api/dev/ingestion/refresh-live`.

Refresh-live calls current OCEANS-X positions, selected particulars, selected movements, due-arrive/due-depart port activity, OCEANS-X geo layers, configured RSS feeds, and risk recompute. It does not spend OpenSanctions quota automatically; use the sanctions CSV import or run the confirmed OpenSanctions maritime API action separately.
