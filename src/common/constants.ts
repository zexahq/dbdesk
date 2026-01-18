// Database data types
export const DATA_TYPES = [
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

// Timezone options for datetime pickers
export const COMMON_TIMEZONES = [
  // Global
  { value: "UTC", label: "UTC" },

  // North America
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "America/Mexico_City", label: "Mexico City" },

  // South America
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Santiago", label: "Santiago" },
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Lima", label: "Lima" },

  // Europe
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Dublin" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Zurich", label: "Zurich" },
  { value: "Europe/Stockholm", label: "Stockholm" },
  { value: "Europe/Warsaw", label: "Warsaw" },
  { value: "Europe/Athens", label: "Athens" },
  { value: "Europe/Istanbul", label: "Istanbul" },
  { value: "Europe/Moscow", label: "Moscow" },

  // Middle East
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Riyadh", label: "Riyadh" },
  { value: "Asia/Jerusalem", label: "Jerusalem" },
  { value: "Asia/Tehran", label: "Tehran" },

  // South Asia
  { value: "Asia/Kolkata", label: "India Standard Time" },
  { value: "Asia/Karachi", label: "Karachi" },
  { value: "Asia/Dhaka", label: "Dhaka" },
  { value: "Asia/Colombo", label: "Colombo" },
  { value: "Asia/Kathmandu", label: "Kathmandu" },

  // East Asia
  { value: "Asia/Shanghai", label: "China Standard Time" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Taipei", label: "Taipei" },
  { value: "Asia/Tokyo", label: "Japan Standard Time" },
  { value: "Asia/Seoul", label: "Korea Standard Time" },

  // Southeast Asia
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Bangkok", label: "Bangkok" },
  { value: "Asia/Jakarta", label: "Jakarta" },
  { value: "Asia/Manila", label: "Manila" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur" },

  // Africa
  { value: "Africa/Cairo", label: "Cairo" },
  { value: "Africa/Johannesburg", label: "Johannesburg" },
  { value: "Africa/Lagos", label: "Lagos" },
  { value: "Africa/Nairobi", label: "Nairobi" },
  { value: "Africa/Casablanca", label: "Casablanca" },

  // Australia & Oceania
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Australia/Brisbane", label: "Brisbane" },
  { value: "Australia/Perth", label: "Perth" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "Pacific/Fiji", label: "Fiji" },
] as const;

