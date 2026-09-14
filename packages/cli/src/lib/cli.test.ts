import assert from 'node:assert/strict'
import test from 'node:test'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import { buildWidgets, parseDashboardDoc } from './dashboard-doc'
import { toCsv } from './output'

test('dashboard documents reject values the desktop cannot load', () => {
  assert.throws(() =>
    parseDashboardDoc(
      JSON.stringify({
        version: 1,
        dashboard: { name: 'Broken', connection: 'local', layout: { columns: 'twelve' } },
        widgets: []
      })
    )
  )

  const { errors } = buildWidgets([
    { type: 'kpi', title: 'Revenue', query: 'SELECT 1', settings: {} }
  ])
  assert.match(errors[0] ?? '', /valueField/)
})

test('saved-query browser widgets receive their desktop default settings', () => {
  const { widgets, errors } = buildWidgets([{ type: 'savedQueries', title: 'Queries' }])
  assert.deepEqual(errors, [])
  assert.deepEqual(widgets[0]?.settings, { content: '' })
})

test('CSV uses doubled quotes', () => {
  assert.equal(toCsv([{ name: 'a"b', note: 'line\nbreak' }]), '"name","note"\n"a""b","line\nbreak"')
})

test('read-only query filtering rejects writes and statement chains', () => {
  assert.equal(isReadOnlyQuery('SELECT 1'), true)
  assert.equal(isReadOnlyQuery('SHOW search_path'), true)
  assert.equal(isReadOnlyQuery('INSERT INTO events VALUES (1)'), false)
  assert.equal(isReadOnlyQuery('SELECT 1; DELETE FROM events'), false)
  assert.equal(isReadOnlyQuery('EXPLAIN ANALYZE UPDATE events SET id = 2'), false)
})
