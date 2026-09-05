# dashboard.yaml reference

Declarative dashboard file for `dbdesk dashboard apply -f dashboard.yaml`.
Round-trips with `dbdesk dashboard export <id>`.

```yaml
version: 1
dashboard:
  name: Sales Overview # required; matched per connection on apply
  description: Q2 revenue tracking # optional
  connection: prod # required: connection name or ID
  layout: # optional (defaults shown)
    columns: 12
    rowHeight: 48
    margin: [8, 8]
widgets:
  - type: kpi
    title: Total Revenue
    query: SELECT sum(amount) AS value FROM orders
    position: [0, 0, 6, 4] # optional: [x, y, w, h]
    settings: # optional key/values (see below)
      valueField: value
      formatType: currency

  - type: barChart
    title: Monthly Revenue
    query: SELECT date_trunc('month', created_at) AS month, sum(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 1
    settings:
      xAxisField: month
      yAxisField: revenue

  - type: table
    title: Recent Orders
    query: SELECT * FROM orders ORDER BY created_at DESC LIMIT 20

  - type: notes
    title: About
    settings:
      content: Targets and definitions for this dashboard.
```

## Rules

- `query` must be read-only (`SELECT`/`SHOW`) or apply fails. Reference a saved query with `queryId` instead of `query` — the referenced query must exist on the same connection and be read-only.
- `position` accepts `[x, y, w, h]`, `"x,y,w,h"`, or `{x, y, w, h}`. Omit for the default `0,0,6,4`.
- `apply` without `--dashboard` matches by `(connection, name)`: existing dashboards get their name/description/layout updated and **widgets replaced**; otherwise a new dashboard is created. Pass `--dashboard <id>` to target by ID.
- Always run `dbdesk dashboard validate -f dashboard.yaml` first; `--dry-run` previews the plan.

## Widget types and settings

| Type           | Required                          | Recommended settings                                                                    |
| -------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `kpi`          | query, `valueField`               | `labelField`, `prefix`, `suffix`, `formatType` (number/currency/percentage), `decimals` |
| `table`        | query                             | `columns`, `pageSize`, `sortable`, `filterable`                                         |
| `barChart`     | query, `xAxisField`, `yAxisField` | `colorField`, `showLegend`, `showGrid`, `orientation` (vertical/horizontal)             |
| `lineChart`    | query, `xAxisField`, `yAxisField` | `colorField`, `showLegend`, `showGrid`                                                  |
| `pieChart`     | query, `labelField`, `valueField` | `showLegend`, `showTable`                                                               |
| `scatterChart` | query, `xAxisField`, `yAxisField` | `labelField`, `showGrid`                                                                |
| `notes`        | `settings.content`                | —                                                                                       |
| `savedQueries` | `queryId` or `settings.content`   | —                                                                                       |

Missing recommended settings produce warnings, not errors. Unknown types and missing queries are errors.
