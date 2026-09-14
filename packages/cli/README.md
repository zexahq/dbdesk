# dbdesk CLI

[![npm version](https://badge.fury.io/js/dbdesk.svg)](https://www.npmjs.com/package/dbdesk)

Manage DBDesk Postgres connections, inspect schemas, run read-only queries, and build dashboards
from the terminal. Designed for both humans and AI coding agents.

## Install

### From npm

```bash
npm install -g dbdesk
dbdesk doctor
```

The npm package requires Node.js 20+ and works without the DBDesk desktop app.

### With the DBDesk desktop app

Desktop releases bundle the same CLI and run it with Electron's built-in Node runtime, so a
separate Node.js installation is not required. Enable it from **Settings → Command Line**.

The Windows installer and Linux `.deb` package also add the command to `PATH`. Linux AppImage
users should use the npm installation instead.

Both installation methods use the same local DBDesk data file.

## Quick start

```bash
# Add connection metadata (credentials are handled separately)
dbdesk connection add --name prod --host localhost --database mydb --user app
dbdesk connection test prod

# Inspect the database before writing queries
dbdesk schema tree --connection prod
dbdesk schema info --connection prod --schema public --table users

# Run read-only SQL
dbdesk query "SELECT status, count(*) FROM orders GROUP BY status" --connection prod

# Apply a dashboard from JSON
dbdesk dashboard apply --file dashboard.json
```

Set `DBDESK_CONNECTION=prod` to omit `--connection prod` from later commands.

## Commands

- `dbdesk` — show version and connection status.
- `dbdesk doctor` — check the executable, data file, schema version, and connections.
- `dbdesk connection list|show|add|remove|test` — manage Postgres connections.
- `dbdesk schema list|tables|info|tree` — inspect schemas, tables, columns, keys, and indexes.
- `dbdesk table rows` — page through table data with `--limit` and `--offset`.
- `dbdesk query [sql]` — run read-only SQL from an argument, file, or saved query.
- `dbdesk saved-query list|show|save|run|remove` — manage reusable queries.
- `dbdesk dashboard list|show|create|delete` — manage dashboards.
- `dbdesk dashboard export|validate|apply` — manage declarative dashboard JSON.
- `dbdesk dashboard add-widget|update-widget|remove-widget` — edit individual widgets.
- `dbdesk skill print|status|install` — install or inspect the bundled agent guide.
- `dbdesk init` — add a DBDesk section to a project's `AGENTS.md`.
- `dbdesk open` — open the DBDesk desktop app.

Run `dbdesk <command> --help` for all options.

## JSON output

Pass `--format json` for a stable machine-readable envelope. Data goes to stdout and diagnostics
go to stderr.

Success:

```json
{
  "ok": true,
  "data": [
    {
      "name": "prod",
      "type": "postgres"
    }
  ],
  "meta": {
    "command": "list",
    "version": "<installed-version>",
    "duration_ms": 12
  }
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "not-found",
    "message": "Connection \"missing\" not found.",
    "hint": "Use \"dbdesk connection list\" to see available connections."
  },
  "meta": {
    "command": "show",
    "version": "<installed-version>",
    "duration_ms": 8
  }
}
```

Document commands output raw text by default: `skill print` and `dashboard export`. Both accept
`--format json` when an envelope is needed.

Exit codes:

- `0` — success
- `2` — usage or validation error
- `3` — connection failed
- `4` — resource not found
- `5` — database error

## Dashboards as JSON

Dashboard files use JSON (`.json`), not YAML.

```bash
dbdesk dashboard export <dashboard-id> > dashboard.json
dbdesk dashboard validate --file dashboard.json
dbdesk dashboard apply --file dashboard.json
dbdesk dashboard apply --file dashboard.json --dry-run
```

```json
{
  "version": 1,
  "dashboard": {
    "name": "Sales Overview",
    "connection": "prod"
  },
  "widgets": [
    {
      "type": "barChart",
      "title": "Orders by status",
      "query": "SELECT status, count(*) AS orders FROM orders GROUP BY status",
      "position": [0, 0, 6, 4],
      "settings": {
        "xAxisField": "status",
        "yAxisField": "orders"
      }
    }
  ]
}
```

Supported widgets: `kpi`, `table`, `barChart`, `lineChart`, `pieChart`, `scatterChart`, `notes`,
and `savedQueries`.

Run `dbdesk skill print` for the complete dashboard JSON reference and agent workflow.

## AI agents

```bash
dbdesk skill install
dbdesk skill print
```

Agents should pass `--format json`, check `ok`, and inspect the schema before generating SQL.

## Credentials and safety

- Database queries are read-only. `INSERT`, `UPDATE`, `DELETE`, and DDL are rejected, including
  saved queries and dashboard widgets.
- `connection add` never accepts or prints a password. Add the password in the desktop app, or use
  a PostgreSQL password file for standalone npm usage.
- The CLI and desktop app share one SQLite file and migrate it forward automatically. Older CLI
  versions refuse to open a newer schema.

Example `~/.pgpass` entry:

```text
localhost:5432:mydb:app:your-password
```

On macOS and Linux, run `chmod 600 ~/.pgpass` after creating the file.

## Links

- [DBDesk desktop app](https://github.com/zexahq/dbdesk)
- [npm package](https://www.npmjs.com/package/dbdesk)
- [Issues](https://github.com/zexahq/dbdesk/issues)
- [Releases](https://github.com/zexahq/dbdesk/releases)
