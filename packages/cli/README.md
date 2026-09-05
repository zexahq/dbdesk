# dbdesk CLI

[![npm version](https://badge.fury.io/js/dbdesk.svg)](https://www.npmjs.com/package/dbdesk)

Manage your [DBDesk](https://github.com/zexahq/dbdesk) databases from the terminal — connections, schema exploration, read-only queries, saved queries, and dashboards. Built for humans and AI coding agents alike.

```bash
npm i -g dbdesk
dbdesk doctor
```

Requires Node.js 20+. No DBDesk desktop app required — the CLI works standalone against the same local data.

## Quickstart

```bash
# Add a database (password via env so it stays out of shell history)
export DBDESK_PASSWORD=...
dbdesk connection add --name prod --host localhost --database mydb --user app
dbdesk connection test prod

# Explore
dbdesk schema tree --connection prod
dbdesk schema info --connection prod --schema public --table users

# Query (SELECT/SHOW only)
dbdesk query "SELECT status, count(*) FROM orders GROUP BY status" --connection prod

# Build a dashboard from a file
dbdesk dashboard apply -f dashboard.yaml
```

Tip: `export DBDESK_CONNECTION=prod` once to skip `--connection` on every command.

## Commands

| Command                                              | What it does                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `doctor`                                             | Health check: binary, data file, schema version, connections (exits 1 when a check fails) |
| `connection list\|show\|add\|remove\|test`           | Manage saved Postgres connections                                                         |
| `schema list\|tables\|info\|tree`                    | Explore schemas, tables, columns, keys, indexes                                           |
| `table rows --schema --table`                        | Page through table data (`--limit`, `--offset`)                                           |
| `query [sql]`                                        | Run read-only SQL (`--file`, `--saved`, `--format table\|json\|csv`)                      |
| `saved-query list\|show\|save\|run\|remove`          | Reusable named queries                                                                    |
| `dashboard list\|show\|create\|delete`               | Manage dashboards                                                                         |
| `dashboard export\|validate\|apply -f file.yaml`     | Declarative dashboards as code                                                            |
| `dashboard add-widget\|update-widget\|remove-widget` | Granular widget edits                                                                     |
| `skill print\|status\|install`                       | Agent guide (see below)                                                                   |
| `init`                                               | Write an `AGENTS.md` snippet for the current project                                      |
| `open`                                               | Open the DBDesk desktop app                                                               |
| `status` (bare `dbdesk`)                             | Version, data path, connection summary                                                    |

Run any command with `--help` for flags. `dbdesk <cmd> --format json` returns a stable envelope:

```json
{ "ok": true, "data": ..., "meta": { "command": "...", "version": "...", "duration_ms": 12 } }
{ "ok": false, "error": { "code": "...", "message": "...", "hint": "..." }, "meta": {...} }
```

Exit codes: `0` ok · `2` usage/validation · `3` connection failed · `4` not found · `5` db error.

## Dashboards as code

```bash
dbdesk dashboard export <id> > dashboard.yaml   # read current state
dbdesk dashboard validate -f dashboard.yaml     # check before applying
dbdesk dashboard apply -f dashboard.yaml        # create or update (add --dry-run to preview)
```

```yaml
version: 1
dashboard:
  name: Sales Overview
  connection: prod
widgets:
  - type: barChart
    title: Monthly Revenue
    query: SELECT date_trunc('month', created_at) AS month, sum(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 1
    settings:
      xAxisField: month
      yAxisField: revenue
```

Widget types: `kpi`, `table`, `barChart`, `lineChart`, `pieChart`, `scatterChart`, `notes`, `savedQueries`. See `skill/dbdesk/references/dashboard-yaml.md` for the full reference.

## For AI agents

```bash
dbdesk skill install    # link the agent guide into Claude Code / Codex / Cursor / OpenCode
dbdesk skill print      # print the full guide (also bundled in the package under skill/)
```

Agents: always pass `--format json`, check `ok` first, and start from `schema tree` — never guess the schema. Only `SELECT`/`SHOW` run through the CLI.

## Safety

- The CLI is read-only for your data: `INSERT`/`UPDATE`/`DELETE`/DDL are rejected everywhere, including saved queries and dashboard widgets. Writes happen in the desktop app.
- Connection passwords are never printed. Prefer `DBDESK_PASSWORD` env or `--password-stdin` over `--password`.
- CLI and desktop share one local SQLite file and migrate it forward automatically.

## Links

- [DBDesk desktop app](https://github.com/zexahq/dbdesk)
- [Issues](https://github.com/zexahq/dbdesk/issues)
- [Releases](https://github.com/zexahq/dbdesk/releases)
