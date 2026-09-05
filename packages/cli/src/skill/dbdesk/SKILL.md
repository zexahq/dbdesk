---
name: dbdesk
description: Manage Postgres connections, run read-only SQL, and build DBDesk dashboards from the terminal. Use when asked to add a database to DBDesk, explore a schema, query data, or create dashboards and chart widgets.
---

# DBDesk CLI

`dbdesk` manages the same local databases as the DBDesk desktop app: saved Postgres connections, schema exploration, read-only queries, and dashboards.

## Setup

```bash
npm i -g dbdesk        # or: npx dbdesk <command>
dbdesk doctor          # verify install, data file, and environment
```

If no connection exists yet, add one (password via env to avoid shell history):

```bash
export DBDESK_PASSWORD=...
dbdesk connection add --name prod --host localhost --database mydb --user app --format json
dbdesk connection test prod
```

Tip: `export DBDESK_CONNECTION=prod` once to skip `--connection` on every command.

## Output contract

Always pass `--format json`. Every command returns the same envelope:

```json
{ "ok": true, "data": ..., "meta": { "command": "...", "version": "...", "duration_ms": 12 } }
// or
{ "ok": false, "error": { "code": "...", "message": "...", "hint": "..." }, "meta": {...} }
```

Check `ok` first. Exit codes: 0 ok, 2 usage/validation, 3 connection failed, 4 not found, 5 db error.
`doctor` prints the full check list even when unhealthy and exits 1 if any check fails — `data.healthy` mirrors the exit code.

## Commands

### Connections

```bash
dbdesk connection list --format json
dbdesk connection show prod --format json        # passwords never shown
dbdesk connection test prod --format json
```

### Schema

```bash
dbdesk schema tree --connection prod --format json        # schemas -> tables (start here)
dbdesk schema info --connection prod --schema public --table users --format json
dbdesk table rows --connection prod --schema public --table users --limit 20 --format json
```

### Queries (read-only)

```bash
dbdesk query "SELECT status, count(*) FROM orders GROUP BY status" --connection prod --format json
dbdesk query --file analysis.sql --connection prod --format csv > results.csv
dbdesk saved-query save --connection prod --name weekly-revenue --query "SELECT ..."
dbdesk saved-query run weekly-revenue --connection prod --format json
```

Only `SELECT`/`SHOW` are accepted. Page with `--limit` (default 100, `0` = no limit) and `--offset`.

### Dashboards

Prefer the declarative file flow (one call instead of many):

```bash
dbdesk dashboard export <id> > dashboard.yaml   # read current state
dbdesk dashboard validate -f dashboard.yaml     # check before applying
dbdesk dashboard apply -f dashboard.yaml --format json
```

File format reference: `references/dashboard-yaml.md`.

Granular commands still exist: `dashboard list|show|create|delete`, `dashboard add-widget|update-widget|remove-widget`.

## Workflows

### Explore a new database

```bash
dbdesk connection list --format json
dbdesk schema tree --connection prod --format json
dbdesk schema info --connection prod --schema public --table users --format json
```

### Build a dashboard from scratch

```bash
# 1. Inspect the data first
dbdesk query "SELECT date_trunc('month', created_at) AS month, sum(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 1" --connection prod --format json

# 2. Write dashboard.yaml (see references/dashboard-yaml.md), then:
dbdesk dashboard validate -f dashboard.yaml
dbdesk dashboard apply -f dashboard.yaml --format json
```

### Add this project to DBDesk

```bash
dbdesk connection add --name <project> --host <host> --database <db> --user <user> --format json
dbdesk connection test <project> --format json
dbdesk schema tree --connection <project> --format json
```

## Safety

- CLI is read-only for user data: `INSERT/UPDATE/DELETE/DDL` are rejected. Writes go through the desktop app.
- Connection passwords are never printed. Pass them via `DBDESK_PASSWORD` env or `--password-stdin`.
- The CLI and desktop app share one local SQLite file; both run migrations forward automatically. If `doctor` reports a schema mismatch, update dbdesk.
