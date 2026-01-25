// Database data types
export const POSTGRES_DATA_TYPES = [
  // Numeric types
  { label: 'smallint', value: 'smallint' },
  { label: 'integer', value: 'integer' },
  { label: 'bigint', value: 'bigint' },
  { label: 'serial', value: 'serial' },
  { label: 'bigserial', value: 'bigserial' },
  { label: 'integer identity', value: 'integer identity' },
  { label: 'bigint identity', value: 'bigint identity' },
  { label: 'decimal', value: 'decimal' },
  { label: 'decimal(10,2)', value: 'decimal(10,2)' },
  { label: 'decimal(18,2)', value: 'decimal(18,2)' },
  { label: 'numeric', value: 'numeric' },
  { label: 'real', value: 'real' },
  { label: 'float', value: 'float' },
  { label: 'double precision', value: 'double precision' },

  // String types
  { label: 'varchar(255)', value: 'varchar(255)' },
  { label: 'varchar(100)', value: 'varchar(100)' },
  { label: 'varchar(50)', value: 'varchar(50)' },
  { label: 'character', value: 'character' },
  { label: 'character varying', value: 'character varying' },
  { label: 'text', value: 'text' },
  { label: 'char(10)', value: 'char(10)' },

  // Binary types
  { label: 'bytea', value: 'bytea' },
  { label: 'blob', value: 'blob' },

  // Boolean
  { label: 'boolean', value: 'boolean' },

  // Date/Time types
  { label: 'date', value: 'date' },
  { label: 'time', value: 'time' },
  // Support only timestamp types with/without time zone
  { label: 'timestamp with time zone', value: 'timestamp with time zone' },
  { label: 'timestamp without time zone', value: 'timestamp without time zone' },
  { label: 'datetime', value: 'datetime' },
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

  // Array types
  { label: 'integer[]', value: 'integer[]' },
  { label: 'text[]', value: 'text[]' },
  { label: 'boolean[]', value: 'boolean[]' }
] as const
