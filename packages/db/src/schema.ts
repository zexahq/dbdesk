import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const connectionProfiles = sqliteTable('connection_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  optionsJson: text('options_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  lastConnectedAt: integer('last_connected_at'),
  tabsJson: text('tabs_json'),
  activeTabId: text('active_tab_id'),
  lastUpdated: integer('last_updated')
})

export const savedQueries = sqliteTable(
  'saved_queries',
  {
    connectionId: text('connection_id')
      .notNull()
      .references(() => connectionProfiles.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    name: text('name').notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [primaryKey({ columns: [table.connectionId, table.id] })]
)

export const authKv = sqliteTable('auth_kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

export const dashboards = sqliteTable('dashboards', {
  dashboardId: text('dashboard_id').primaryKey(),
  connectionId: text('connection_id')
    .notNull()
    .references(() => connectionProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  layoutJson: text('layout_json').notNull(),
  widgetsJson: text('widgets_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})
