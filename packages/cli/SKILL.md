# Using DBDesk CLI with AI Agents

The `dbdesk` CLI lets AI agents (Claude Code, OpenCode, Cursor, etc.) interact with DBDesk databases, dashboards, and schemas via shell commands.

## Setup

The `dbdesk` command is installed with the DBDesk desktop app.

| Platform | Setup |
|---|---|
| macOS | Auto-configured on first app launch, or run `sudo bash /Applications/DBDesk.app/Contents/Resources/setup-cli.sh` |
| Linux (deb) | Auto-configured during installation |
| Linux (AppImage) | Manual: `sudo ln -sf /path/to/DBDesk-*.AppImage /usr/local/bin/dbdesk` |
| Windows | Auto-configured by the installer |

Verify: `dbdesk connection list`

## Key Pattern

Always use `--format json` for machine-readable output. All JSON responses follow:

```json
{ "ok": true, "data": ... }
// or
{ "ok": false, "error": "message" }
```

Check the `ok` field to detect errors.

## Command Reference

### Connections

```bash
# List all saved connections
dbdesk connection list --format json
# → [{ "id": "abc-123", "name": "Production", "type": "postgres", ... }]

# Show connection details (passwords are never shown)
dbdesk connection show prod --format json
```

### Schema Exploration

```bash
# List schemas
dbdesk schema list --connection prod --format json
# → ["public", "analytics"]

# List tables in a schema
dbdesk schema tables --connection prod --schema public --format json
# → ["users", "orders", "products"]

# Full schema tree (schemas → tables → column count)
dbdesk schema tree --connection prod --format json
# → [{ "schema": "public", "tables": ["users", "orders"] }, ...]

# Detailed table info (columns, types, PKs, FKs, indexes)
dbdesk schema info --connection prod --schema public --table users --format json
# → { "columns": [{ "name": "id", "type": "uuid", "isPrimaryKey": true, ... }], ... }
```

### Queries

```bash
# Execute read-only SQL (SELECT/SHOW only — INSERT/UPDATE/DELETE are blocked)
dbdesk query "SELECT * FROM users LIMIT 10" --connection prod --format json
# → { "ok": true, "columns": ["id", "name", ...], "rows": [...], "rowCount": 10 }

# Read SQL from a file
dbdesk query --file analysis.sql --connection prod --format csv > results.csv

# Control row limit
dbdesk query "SELECT * FROM orders" --connection prod --limit 50 --format json
```

### Dashboards

```bash
# List dashboards for a connection
dbdesk dashboard list --connection prod --format json

# Show a dashboard
dbdesk dashboard show <dashboard-id> --format json

# Create an empty dashboard
dbdesk dashboard create --name "Sales KPIs" --connection prod --format json
# → { "dashboardId": "d-456", "name": "Sales KPIs", "widgets": [], ... }

# Add a KPI widget
dbdesk dashboard add-widget \
  --type kpi \
  --title "Total Users" \
  --query "SELECT count(*) as value FROM users" \
  --connection prod \
  --dashboard d-456 \
  --settings valueField=value \
  --format json

# Add a bar chart widget
dbdesk dashboard add-widget \
  --type barChart \
  --title "Monthly Revenue" \
  --query "SELECT date_trunc('month', created_at) as month, sum(amount) as revenue FROM orders GROUP BY 1 ORDER BY 1" \
  --connection prod \
  --dashboard d-456 \
  --settings xAxisField=month yAxisField=revenue \
  --format json

# Add a table widget
dbdesk dashboard add-widget \
  --type table \
  --title "Recent Orders" \
  --query "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20" \
  --connection prod \
  --dashboard d-456 \
  --format json

# Add a notes widget
dbdesk dashboard add-widget \
  --type notes \
  --title "Notes" \
  --connection prod \
  --dashboard d-456 \
  --settings content="Key metrics for Q2" \
  --format json

# Update a widget
dbdesk dashboard update-widget \
  --dashboard d-456 \
  --widget w-789 \
  --title "Updated Title" \
  --query "SELECT count(*) FROM users WHERE active = true" \
  --format json

# Remove a widget
dbdesk dashboard remove-widget --dashboard d-456 --widget w-789

# Delete a dashboard
dbdesk dashboard delete d-456
```

### Widget Types and Settings

| Type | Required Settings | Optional Settings |
|---|---|---|
| `kpi` | `valueField` | `labelField`, `prefix`, `suffix`, `formatType` (number/currency/percentage), `decimals` |
| `table` | — | `columns`, `pageSize`, `sortable` (true/false), `filterable` (true/false) |
| `barChart` | `xAxisField`, `yAxisField` | `colorField`, `showLegend` (true/false), `showGrid` (true/false), `orientation` (vertical/horizontal) |
| `lineChart` | `xAxisField`, `yAxisField` | `colorField`, `showLegend`, `showGrid` |
| `pieChart` | `labelField`, `valueField` | `showLegend`, `showTable` |
| `scatterChart` | `xAxisField`, `yAxisField` | `labelField`, `showGrid` |
| `notes` | `content` | — |
| `savedQueries` | `content` | — |

## Common Agent Workflows

### 1. Explore a new database

```bash
dbdesk connection list --format json
dbdesk schema tree --connection prod --format json
dbdesk schema info --connection prod --schema public --table users --format json
```

### 2. Build a dashboard from scratch

```bash
# Step 1: Create the dashboard
DASH=$(dbdesk dashboard create --name "Sales Overview" --connection prod --format json | jq -r '.data.dashboardId')

# Step 2: Add widgets
dbdesk dashboard add-widget --type kpi --title "Total Revenue" \
  --query "SELECT sum(amount) as value FROM orders" \
  --connection prod --dashboard $DASH --settings valueField=value prefix=$ formatType=currency

dbdesk dashboard add-widget --type barChart --title "Monthly Breakdown" \
  --query "SELECT date_trunc('month', created_at) as month, sum(amount) as revenue FROM orders GROUP BY 1 ORDER BY 1" \
  --connection prod --dashboard $DASH --settings xAxisField=month yAxisField=revenue

# Step 3: Verify
dbdesk dashboard show $DASH
```

### 3. Query data for analysis

```bash
dbdesk query "SELECT status, count(*) FROM orders GROUP BY status" --connection prod --format json
dbdesk query "SELECT * FROM users WHERE created_at > now() - interval '7 days'" --connection prod --format json
```

### 4. Investigate table structure

```bash
dbdesk schema info --connection prod --schema public --table orders --format json | jq '.columns[] | {name, type, isPrimaryKey}'
```

## Safety

- Only `SELECT` and `SHOW` queries are allowed through the CLI
- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `EXPLAIN ANALYZE` and similar are blocked
- Use the DBDesk desktop app for write operations
- Connection passwords are never shown in any output

## Troubleshooting

```bash
# Check if CLI is installed
which dbdesk

# Check DBDesk data path
echo $DBDESK_DB_PATH  # Override with custom path if needed

# Debug: use --format json to get structured error messages
dbdesk connection list --format json
```
