# dashboard.json reference

Declarative dashboard file for `dbdesk dashboard apply -f dashboard.json`.
Round-trips with `dbdesk dashboard export <id>`.

```json
{
  "version": 1,
  "dashboard": {
    "name": "Sales Overview",
    "description": "Q2 revenue tracking",
    "connection": "prod",
    "layout": { "columns": 12, "rowHeight": 48, "margin": [8, 8] }
  },
  "widgets": [
    {
      "type": "kpi",
      "title": "Total Revenue",
      "query": "SELECT sum(amount) AS value FROM orders",
      "position": [0, 0, 6, 4],
      "settings": { "valueField": "value", "formatType": "currency" }
    },
    {
      "type": "barChart",
      "title": "Monthly Revenue",
      "query": "SELECT date_trunc('month', created_at) AS month, sum(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 1",
      "settings": { "xAxisField": "month", "yAxisField": "revenue" }
    },
    {
      "type": "table",
      "title": "Recent Orders",
      "query": "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20"
    },
    {
      "type": "notes",
      "title": "About",
      "settings": { "content": "Targets and definitions for this dashboard." }
    }
  ]
}
```

Field notes: `dashboard.name` is required and matched per connection on
apply; `dashboard.connection` takes a connection name or ID; `layout` is
optional (defaults shown). `position` is optional (default `0,0,6,4`).

## Rules

- `query` must be read-only (`SELECT`/`SHOW`) or apply fails. Reference a saved query with `queryId` instead of `query` — the referenced query must exist on the same connection and be read-only.
- `position` accepts `[x, y, w, h]`, `"x,y,w,h"`, or `{x, y, w, h}`. Omit for the default `0,0,6,4`.
- `apply` without `--dashboard` matches by `(connection, name)`: existing dashboards get their name/description/layout updated and **widgets replaced**; otherwise a new dashboard is created. Pass `--dashboard <id>` to target by ID.
- Always run `dbdesk dashboard validate -f dashboard.json` first; `--dry-run` previews the plan.

## Widget types and settings

| Type           | Required                          | Recommended settings                                                                    |
| -------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `kpi`          | query, `valueField`               | `labelField`, `prefix`, `suffix`, `formatType` (number/currency/percentage), `decimals` |
| `table`        | query                             | `columns`, `pageSize`, `sortable`, `filterable`                                         |
| `barChart`     | query, `xAxisField`, `yAxisField` | `colorField`, `showLegend`, `showGrid`, `orientation` (vertical/horizontal)             |
| `lineChart`    | query, `xAxisField`, `yAxisField` | `colorField`, `showLegend`, `showGrid`                                                  |
| `pieChart`     | query, `labelField`               | `showLegend`, `showTable`                                                               |
| `scatterChart` | query, `xAxisField`, `yAxisField` | `labelField`, `showGrid`                                                                |
| `notes`        | `settings.content`                | —                                                                                       |
| `savedQueries` | —                                 | —                                                                                       |

Missing required settings, unknown types, and missing queries are errors.
