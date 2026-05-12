#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

pass() {
  printf 'ok - %s\n' "$1"
}

fail() {
  printf 'not ok - %s\n' "$1" >&2
  exit 1
}

contains() {
  haystack="$1"
  needle="$2"
  label="$3"
  printf '%s' "$haystack" | grep -F "$needle" >/dev/null || fail "$label"
  pass "$label"
}

printf 'SEAM V2 stage smoke test\n'
printf 'Backend:  %s\n' "$BACKEND_URL"
printf 'Frontend: %s\n\n' "$FRONTEND_URL"

test -f docs/charter-v2.md || fail "stage 1 charter exists"
contains "$(cat docs/charter-v2.md)" "No AI features" "stage 1 AI guardrail documented"
contains "$(cat docs/charter-v2.md)" "No TimescaleDB" "stage 1 Timescale guardrail documented"
contains "$(cat docs/charter-v2.md)" "Keep write actions under \`/api/dev/*\`" "stage 1 dev route guardrail documented"

test -f docker-compose.yml || fail "stage 2 docker compose exists"
test -f backend/app/main.py || fail "stage 2 backend app exists"
test -f frontend/src/main.tsx || fail "stage 2 frontend app exists"
pass "stage 2 monorepo shell files exist"

docker compose ps --services --filter status=running | grep -Fx db >/dev/null || fail "stage 2 db service running"
docker compose ps --services --filter status=running | grep -Fx backend >/dev/null || fail "stage 2 backend service running"
docker compose ps --services --filter status=running | grep -Fx frontend >/dev/null || fail "stage 2 frontend service running"
pass "stage 2 three runtime services are running"

docker compose exec -T backend alembic current | grep -F "0003_sanctions_records_vessel_id" >/dev/null || fail "stage 3 alembic current revision"
pass "stage 3 migration revision is current"

schema_tables="$(docker compose exec -T db psql -U seam -d seam -Atc "select tablename from pg_tables where schemaname = 'public' order by tablename")"
for table in vessels vessel_positions_latest port_events entities relationships risk_flags sanctions_records news_articles news_links reference_data ingestion_jobs ingestion_logs source_health source_observations; do
  printf '%s\n' "$schema_tables" | grep -Fx "$table" >/dev/null || fail "stage 3 table exists: $table"
done
pass "stage 3 core schema tables exist"

health_response="$(curl -fsS "$BACKEND_URL/api/health")"
contains "$health_response" '"status":"ok"' "stage 2 backend health endpoint"
contains "$health_response" '"feature_ai":false' "stage 1 AI feature remains disabled"

job_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/test")"
contains "$job_response" '"job_type":"internal.test"' "stage 4 dummy ingestion job starts"
contains "$job_response" '"status":"succeeded"' "stage 4 dummy ingestion job succeeds"

jobs_response="$(curl -fsS "$BACKEND_URL/api/dev/ingestion/jobs")"
contains "$jobs_response" '"internal.test"' "stage 4 ingestion jobs are listed"

logs_response="$(curl -fsS "$BACKEND_URL/api/dev/ingestion/logs")"
contains "$logs_response" 'Completed internal ingestion framework test.' "stage 4 ingestion logs are listed"

source_health_response="$(curl -fsS "$BACKEND_URL/api/dev/source-health")"
contains "$source_health_response" '"source":"internal-test"' "stage 4 source health is listed"
contains "$source_health_response" '"status":"healthy"' "stage 4 source health is healthy"

fixture_status="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/dev/ingestion/positions-snapshot?mode=fixture")"
test "$fixture_status" = "422" || fail "live-only ingestion rejects fixture mode"
pass "live-only ingestion rejects fixture mode"

positions_job_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/positions-snapshot?mode=live")"
contains "$positions_job_response" '"job_type":"oceansx.positions_snapshot"' "stage 5 positions snapshot ingestion starts"
contains "$positions_job_response" '"status":"succeeded"' "stage 5 positions snapshot ingestion succeeds"
contains "$positions_job_response" '"observations_inserted":' "stage 5 positions snapshot returns ingestion counts"

source_health_response="$(curl -fsS "$BACKEND_URL/api/dev/source-health")"
contains "$source_health_response" '"source":"OCEANS-X"' "stage 5 OCEANS-X source health is listed"
contains "$source_health_response" '"status":"healthy"' "stage 5 OCEANS-X source health is healthy"

vessel_count="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from vessels")"
test "$vessel_count" -gt 0 || fail "stage 5 vessels were upserted"
pass "stage 5 vessels were upserted"

observation_count="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from source_observations where source = 'OCEANS-X' and observation_type = 'vessel_position'")"
test "$observation_count" -gt 0 || fail "stage 5 source observations were inserted"
pass "stage 5 source observations were inserted"

latest_position_count="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from vessel_positions_latest")"
test "$latest_position_count" -gt 0 || fail "stage 5 latest vessel positions were upserted"
pass "stage 5 latest vessel positions were upserted"

curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/positions-snapshot?mode=live" >/dev/null
latest_position_count_after_second_run="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from vessel_positions_latest")"
test "$latest_position_count_after_second_run" -ge "$latest_position_count" || fail "stage 5 latest positions remain valid after repeated live ingestion"
pass "stage 5 latest positions remain valid after repeated live ingestion"

map_response="$(curl -fsS "$BACKEND_URL/api/map/vessels")"
case "$map_response" in
  \[*\]) pass "stage 5 map vessel read model returns a JSON array" ;;
  *) fail "stage 5 map vessel read model returns a JSON array" ;;
esac
contains "$map_response" '"latitude":' "stage 5 map vessel read model includes coordinates"

first_vessel_id="$(docker compose exec -T db psql -U seam -d seam -Atc "select id from vessels where imo is not null order by source_updated_at desc nulls last, id desc limit 1")"
first_vessel_imo="$(docker compose exec -T db psql -U seam -d seam -Atc "select imo from vessels where id = $first_vessel_id")"
first_vessel_name="$(docker compose exec -T db psql -U seam -d seam -Atc "select name from vessels where id = $first_vessel_id")"

search_response="$(curl -fsS "$BACKEND_URL/api/vessels/search?q=$first_vessel_imo&limit=5")"
contains "$search_response" "\"imo\":\"$first_vessel_imo\"" "stage 7 vessel search finds a live vessel by IMO"

test -n "$first_vessel_id" || fail "stage 7 live vessel id is available"
pass "stage 7 live vessel id is available"

vessel_detail_response="$(curl -fsS "$BACKEND_URL/api/vessels/$first_vessel_id")"
contains "$vessel_detail_response" "\"name\":\"$first_vessel_name\"" "stage 7 vessel detail returns canonical vessel"
contains "$vessel_detail_response" '"latest_position":' "stage 7 vessel detail returns latest position"

vessel_observations_response="$(curl -fsS "$BACKEND_URL/api/vessels/$first_vessel_id/observations")"
contains "$vessel_observations_response" '"observation_type":"vessel_position"' "stage 7 vessel observations expose source evidence"

particulars_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/vessel-particulars/$first_vessel_id?mode=live")"
contains "$particulars_response" '"job_type":"oceansx.vessel_particulars"' "stage 8 particulars ingestion starts"
contains "$particulars_response" '"status":"succeeded"' "stage 8 particulars ingestion succeeds"
contains "$particulars_response" '"relationships_inserted":' "stage 8 particulars ingestion returns relationship counts"

relationship_count="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from relationships where vessel_id = $first_vessel_id")"
test "$relationship_count" -ge 0 || fail "stage 8 particulars relationship count is readable"
pass "stage 8 particulars relationship count is readable"

curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/vessel-particulars/$first_vessel_id?mode=live" >/dev/null
relationship_count_after_second_run="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from relationships where vessel_id = $first_vessel_id")"
test "$relationship_count_after_second_run" -ge "$relationship_count" || fail "stage 8 particulars relationships remain valid after repeated live ingestion"
pass "stage 8 particulars relationships remain valid after repeated live ingestion"

reference_response="$(curl -fsS "$BACKEND_URL/api/reference/flag_country")"
contains "$reference_response" '"label":"Panama"' "stage 9 curated reference labels are available"

geo_ingest_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/geo-layers")"
contains "$geo_ingest_response" '"layers_seen":' "stage 11 geo live ingestion runs"
geo_layers_response="$(curl -fsS "$BACKEND_URL/api/geo/layers")"
contains "$geo_layers_response" '"name":"ports_p"' "stage 11 geo layer list includes ports"
geo_layer_status="$(curl -s -o /tmp/seam_geo_layer.json -w "%{http_code}" "$BACKEND_URL/api/geo/layers/ports_p")"
case "$geo_layer_status" in
  200) contains "$(cat /tmp/seam_geo_layer.json)" '"FeatureCollection"' "stage 11 geo layer endpoint returns live GeoJSON" ;;
  404) pass "stage 11 geo layer endpoint reports no live layer when OCEANS-X returns none" ;;
  *) fail "stage 11 geo layer endpoint returns 200 or 404" ;;
esac

first_entity_id="$(docker compose exec -T db psql -U seam -d seam -Atc "select to_entity_id from relationships where vessel_id = $first_vessel_id and to_entity_id is not null limit 1")"
if test -n "$first_entity_id"; then
  pass "stage 15 relationship entity id is available"
  entity_name="$(docker compose exec -T db psql -U seam -d seam -Atc "select name from entities where id = $first_entity_id")"
  entity_query="$(printf '%s' "$entity_name" | sed 's/ /%20/g')"
  entity_search_response="$(curl -fsS "$BACKEND_URL/api/entities/search?q=$entity_query&limit=5")"
  contains "$entity_search_response" "\"id\":$first_entity_id" "stage 15 entity search finds live particulars entity"
  entity_vessels_response="$(curl -fsS "$BACKEND_URL/api/entities/$first_entity_id/vessels")"
  contains "$entity_vessels_response" "\"id\":$first_vessel_id" "stage 15 entity related vessels are returned"
else
  pass "stage 15 entity checks skipped because the live particulars response had no relationship fields"
fi

vessel_risk_response="$(curl -fsS "$BACKEND_URL/api/vessels/$first_vessel_id/risk-flags")"
case "$vessel_risk_response" in
  \[*\]) pass "stage 13 vessel risk flags endpoint returns a JSON array" ;;
  *) fail "stage 13 vessel risk flags endpoint returns a JSON array" ;;
esac

sanctions_status="$(curl -s -o /tmp/seam_sanctions.json -w "%{http_code}" -X POST "$BACKEND_URL/api/dev/ingestion/sanctions")"
case "$sanctions_status" in
  428) pass "stage 14 OpenSanctions API requires explicit quota confirmation" ;;
  *) fail "stage 14 OpenSanctions API is protected by quota confirmation" ;;
esac

sanctions_csv_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/sanctions-csv" -H "Content-Type: text/csv" --data-binary 'type,caption,imo,risk,countries,flag,mmsi,id,url,datasets,aliases
VESSEL,NO CURRENT LOCAL ENTITY SHOULD MATCH,IMO0000000,sanction;mare.shadow,,,,TEST-MARITIME-SANCTION,https://www.opensanctions.org/entities/TEST-MARITIME-SANCTION,maritime,
')"
contains "$sanctions_csv_response" '"mode":"csv"' "stage 14 sanctions CSV ingestion runs without API quota"
contains "$sanctions_csv_response" '"vessel_matches":' "stage 14 sanctions CSV returns maritime match stats"

news_status="$(curl -s -o /tmp/seam_news.json -w "%{http_code}" -X POST "$BACKEND_URL/api/dev/ingestion/news")"
case "$news_status" in
  200) contains "$(cat /tmp/seam_news.json)" '"articles_inserted":' "stage 14 live RSS news ingestion runs" ;;
  503) pass "stage 14 live RSS news ingestion reports source unavailable without fixture fallback" ;;
  *) fail "stage 14 live RSS news ingestion returns 200 or clear 503" ;;
esac

risk_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/risk/recompute?vessel_id=$first_vessel_id")"
contains "$risk_response" '"vessels_seen":' "stage 13 risk recompute runs"

graph_response="$(curl -fsS "$BACKEND_URL/api/graph/vessels/$first_vessel_id")"
contains "$graph_response" '"nodes":' "stage 12 vessel graph returns nodes"
contains "$graph_response" '"edges":' "stage 12 vessel graph returns edges"

first_evidence_id="$(docker compose exec -T db psql -U seam -d seam -Atc "select evidence_id from relationships where vessel_id = $first_vessel_id and evidence_id is not null limit 1")"
if test -n "$first_evidence_id"; then
  pass "stage 12 relationship evidence id is available"
  evidence_response="$(curl -fsS "$BACKEND_URL/api/evidence/$first_evidence_id")"
  contains "$evidence_response" '"observation_type":"vessel_particulars"' "stage 12 evidence endpoint resolves graph evidence"
else
  pass "stage 12 relationship evidence check skipped because live particulars produced no relationships"
fi

movements_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/vessel-movements/$first_vessel_id?mode=live")"
contains "$movements_response" '"job_type":"oceansx.vessel_movements"' "stage 10 vessel movements ingestion starts"
contains "$movements_response" '"status":"succeeded"' "stage 10 vessel movements ingestion succeeds"
contains "$movements_response" '"events_inserted":' "stage 10 vessel movements returns event counts"

port_activity_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/port-activity?kind=due-arrive&mode=live")"
contains "$port_activity_response" '"job_type":"oceansx.port_activity"' "stage 10 port activity ingestion starts"
case "$port_activity_response" in
  *'"status":"succeeded"'*) pass "stage 10 port activity ingestion succeeds" ;;
  *'"status":"failed"'*) pass "stage 10 port activity ingestion reports live source failure without fixture fallback" ;;
  *) fail "stage 10 port activity ingestion returns a terminal status" ;;
esac

vessel_events_response="$(curl -fsS "$BACKEND_URL/api/vessels/$first_vessel_id/events")"
case "$vessel_events_response" in
  \[*\]) pass "stage 10 vessel events endpoint returns a JSON array" ;;
  *) fail "stage 10 vessel events endpoint returns a JSON array" ;;
esac

ports_activity_read_response="$(curl -fsS "$BACKEND_URL/api/ports/activity?kind=due-arrive&limit=10")"
case "$ports_activity_read_response" in
  \[*\]) pass "stage 10 port activity read endpoint returns a JSON array" ;;
  *) fail "stage 10 port activity read endpoint returns a JSON array" ;;
esac

event_count="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from port_events")"
curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/vessel-movements/$first_vessel_id?mode=live" >/dev/null
event_count_after_second_run="$(docker compose exec -T db psql -U seam -d seam -Atc "select count(*) from port_events")"
test "$event_count_after_second_run" -ge "$event_count" || fail "stage 10 movement live ingestion leaves events valid"
pass "stage 10 movement live ingestion leaves events valid"

schema_graph_response="$(curl -fsS "$BACKEND_URL/api/meta/schema-graph")"
contains "$schema_graph_response" '"id":"vessels"' "stage 18 schema graph includes vessels table"
contains "$schema_graph_response" '"target":"vessels"' "stage 18 schema graph includes foreign-key edges"

table_counts_response="$(curl -fsS "$BACKEND_URL/api/dev/table-counts")"
contains "$table_counts_response" '"vessels":' "stage 19 dev table counts are available"
recent_observations_response="$(curl -fsS "$BACKEND_URL/api/dev/observations?limit=5")"
contains "$recent_observations_response" '"raw_payload":' "stage 19 recent observations are available"

refresh_response="$(curl -fsS -X POST "$BACKEND_URL/api/dev/ingestion/refresh-live")"
contains "$refresh_response" '"counts":' "stage 20 full live refresh returns counts"

frontend_response="$(curl -fsS "$FRONTEND_URL")"
contains "$frontend_response" '<title>SEAM V2</title>' "stage 2 frontend shell responds"

(cd frontend && npm run build >/dev/null)
pass "frontend production build passes"

(cd backend && ../.venv312/bin/python -m compileall app >/dev/null)
pass "backend Python compile passes"

(cd backend && PYTHONPATH=. ../.venv312/bin/python -m unittest app.tests.test_positions_ingestion app.tests.test_sanctions_enrichment >/dev/null)
pass "backend ingestion helper tests pass"

printf '\nAll implemented-stage smoke checks passed.\n'
