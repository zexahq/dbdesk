// Database data types
export const MYSQL_DATA_TYPES = [
  // Numeric types
  { label: 'tinyint', value: 'tinyint' },
  { label: 'smallint', value: 'smallint' },
  { label: 'mediumint', value: 'mediumint' },
  { label: 'int', value: 'int' },
  { label: 'integer', value: 'integer' },
  { label: 'bigint', value: 'bigint' },
  { label: 'decimal', value: 'decimal' },
  { label: 'decimal(10,2)', value: 'decimal(10,2)' },
  { label: 'decimal(18,2)', value: 'decimal(18,2)' },
  { label: 'numeric', value: 'numeric' },
  { label: 'float', value: 'float' },
  { label: 'double', value: 'double' },
  { label: 'real', value: 'real' },

  // String types
  { label: 'char(10)', value: 'char(10)' },
  { label: 'varchar(255)', value: 'varchar(255)' },
  { label: 'varchar(100)', value: 'varchar(100)' },
  { label: 'varchar(50)', value: 'varchar(50)' },
  { label: 'text', value: 'text' },
  { label: 'tinytext', value: 'tinytext' },
  { label: 'mediumtext', value: 'mediumtext' },
  { label: 'longtext', value: 'longtext' },

  // Binary types
  { label: 'binary(10)', value: 'binary(10)' },
  { label: 'varbinary(255)', value: 'varbinary(255)' },
  { label: 'blob', value: 'blob' },
  { label: 'tinyblob', value: 'tinyblob' },
  { label: 'mediumblob', value: 'mediumblob' },
  { label: 'longblob', value: 'longblob' },

  // Boolean
  { label: 'boolean', value: 'boolean' },
  { label: 'bool', value: 'bool' },

  // Date/Time types
  { label: 'date', value: 'date' },
  { label: 'time', value: 'time' },
  { label: 'datetime', value: 'datetime' },
  { label: 'timestamp', value: 'timestamp' },
  { label: 'year', value: 'year' },

  // JSON
  { label: 'json', value: 'json' }
] as const
