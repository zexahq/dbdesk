import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const connectionProfiles = sqliteTable('connection_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  optionsJson: text('options_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  lastConnectedAt: integer('last_connected_at'),
})

export const workspaces = sqliteTable('workspaces', {
  connectionId: text('connection_id')
    .primaryKey()
    .references(() => connectionProfiles.id, { onDelete: 'cascade' }),
  tabsJson: text('tabs_json').notNull(),
  activeTabId: text('active_tab_id'),
  lastUpdated: integer('last_updated').notNull(),
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
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.connectionId, table.id] })],
)

export const authKv = sqliteTable('auth_kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
