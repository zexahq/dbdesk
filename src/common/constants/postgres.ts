// PostgreSQL data types
// Reference: https://www.postgresql.org/docs/current/datatype.html

export const POSTGRES_DATA_TYPES = [
  // Numeric types
  { label: 'smallint', value: 'smallint' },
  { label: 'integer', value: 'integer' },
  { label: 'bigint', value: 'bigint' },
  { label: 'decimal', value: 'decimal' },
  { label: 'numeric', value: 'numeric' },
  { label: 'real', value: 'real' },
  { label: 'double precision', value: 'double precision' },

  // String types
  { label: 'character', value: 'character' },
  { label: 'character varying', value: 'character varying' },
  { label: 'text', value: 'text' },

  // Binary types
  { label: 'bytea', value: 'bytea' },

  // Boolean
  { label: 'boolean', value: 'boolean' },

  // Date/Time types
  { label: 'timestamp', value: 'timestamp' },
  { label: 'timestamp with time zone', value: 'timestamp with time zone' },
  { label: 'date', value: 'date' },
  { label: 'time', value: 'time' },
  { label: 'time with time zone', value: 'time with time zone' },
  { label: 'interval', value: 'interval' },

  // UUID
  { label: 'uuid', value: 'uuid' },

  // JSON
  { label: 'json', value: 'json' },
  { label: 'jsonb', value: 'jsonb' },

  // Range types
  { label: 'int4range', value: 'int4range' },
  { label: 'int8range', value: 'int8range' },
  { label: 'numrange', value: 'numrange' },
  { label: 'tsrange', value: 'tsrange' },
  { label: 'tstzrange', value: 'tstzrange' },
  { label: 'daterange', value: 'daterange' },

  // Arrays
  { label: 'integer[]', value: 'integer[]' },
  { label: 'text[]', value: 'text[]' },
  { label: 'boolean[]', value: 'boolean[]' }
] as const
