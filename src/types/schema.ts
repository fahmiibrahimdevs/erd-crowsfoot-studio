export type SqlDialect = 'postgres' | 'mysql' | 'sqlite' | 'prisma' | 'mssql';

export type Cardinality = '1:1' | '1:N' | 'N:M';

export type CrowsFootMarker =
  | 'one-simple'        // One ( | )
  | 'one-mandatory'     // One Mandatory ( || )
  | 'one-optional'      // One Opsional ( |o )
  | 'many-simple'       // Many ( < )
  | 'many-mandatory'    // Many Mandatory ( |< )
  | 'many-optional';    // Many Opsional ( O< )

export type EndpointMarkerType = CrowsFootMarker | 'auto';

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export type EdgeRoutingStyle = 'smoothstep' | 'bezier' | 'straight';

export interface ColumnData {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableIndex {
  id: string;
  name: string;
  columns: string[];
  isUnique: boolean;
  type: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
}

export interface TableData {
  id: string;
  name: string;
  schema?: string;
  comment?: string;
  colorTag?: string;
  columns: ColumnData[];
  indexes?: TableIndex[];
}

export interface CustomPathData {
  bendX?: number;
  bendY?: number;
  bendX2?: number;
  waypoints?: { x: number; y: number }[];
}

export interface RelationshipData {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  sourceHandle?: string; // e.g. `${sourceColumnId}-left` or `${sourceColumnId}-right`
  targetHandle?: string; // e.g. `${targetColumnId}-left` or `${targetColumnId}-right`
  name?: string;
  cardinality: Cardinality;
  sourceMarker?: CrowsFootMarker;
  targetMarker?: CrowsFootMarker;
  customPath?: CustomPathData;
  customOffset?: number;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface ErdGroup {
  id: string;
  name: string;
  colorTag?: string;
  tableIds: string[];
}

export interface ProjectData {
  id: string;
  name: string;
  dialect: SqlDialect;
  tables: TableData[];
  relations: RelationshipData[];
  groups?: ErdGroup[];
  updatedAt: string;
}

export interface ErdFileItem {
  id: string;
  name: string; // e.g. "ecommerce_db.erd"
  type: 'file';
  parentId: string | null; // null if in root directory
  dialect: SqlDialect;
  tables: TableData[];
  relations: RelationshipData[];
  groups?: ErdGroup[];
  positions: Record<string, { x: number; y: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface ErdFolderItem {
  id: string;
  name: string; // e.g. "Microservices"
  type: 'folder';
  parentId: string | null;
  isOpen?: boolean; // accordion open state
  createdAt: string;
}

export type ErdTreeItem = ErdFileItem | ErdFolderItem;

export interface WorkspaceState {
  items: ErdTreeItem[];
  activeFileId: string | null;
}

export const COMMON_DATA_TYPES = [
  // Numeric & Integer
  { label: 'SERIAL (Auto Increment INT)', value: 'SERIAL', category: 'Numeric' },
  { label: 'BIGSERIAL (Auto Increment BIGINT)', value: 'BIGSERIAL', category: 'Numeric' },
  { label: 'SMALLSERIAL', value: 'SMALLSERIAL', category: 'Numeric' },
  { label: 'INTEGER / INT', value: 'INT', category: 'Numeric' },
  { label: 'BIGINT', value: 'BIGINT', category: 'Numeric' },
  { label: 'SMALLINT', value: 'SMALLINT', category: 'Numeric' },
  { label: 'TINYINT', value: 'TINYINT', category: 'Numeric' },
  { label: 'MEDIUMINT', value: 'MEDIUMINT', category: 'Numeric' },
  { label: 'DECIMAL(10,2)', value: 'DECIMAL(10,2)', category: 'Numeric' },
  { label: 'DECIMAL(12,4)', value: 'DECIMAL(12,4)', category: 'Numeric' },
  { label: 'NUMERIC(10,2)', value: 'NUMERIC(10,2)', category: 'Numeric' },
  { label: 'FLOAT', value: 'FLOAT', category: 'Numeric' },
  { label: 'DOUBLE PRECISION', value: 'DOUBLE PRECISION', category: 'Numeric' },
  { label: 'REAL', value: 'REAL', category: 'Numeric' },
  { label: 'MONEY', value: 'MONEY', category: 'Numeric' },

  // Enums & Sets
  { label: 'ENUM (Custom Options)', value: "ENUM('active', 'inactive', 'pending')", category: 'Enum & Choice' },
  { label: 'ENUM', value: 'ENUM', category: 'Enum & Choice' },
  { label: 'SET', value: "SET('read', 'write', 'admin')", category: 'Enum & Choice' },

  // Text & Strings
  { label: 'VARCHAR(255)', value: 'VARCHAR(255)', category: 'Text & String' },
  { label: 'VARCHAR(100)', value: 'VARCHAR(100)', category: 'Text & String' },
  { label: 'VARCHAR(50)', value: 'VARCHAR(50)', category: 'Text & String' },
  { label: 'VARCHAR(32)', value: 'VARCHAR(32)', category: 'Text & String' },
  { label: 'VARCHAR(500)', value: 'VARCHAR(500)', category: 'Text & String' },
  { label: 'TEXT', value: 'TEXT', category: 'Text & String' },
  { label: 'MEDIUMTEXT', value: 'MEDIUMTEXT', category: 'Text & String' },
  { label: 'LONGTEXT', value: 'LONGTEXT', category: 'Text & String' },
  { label: 'TINYTEXT', value: 'TINYTEXT', category: 'Text & String' },
  { label: 'CHAR(1)', value: 'CHAR(1)', category: 'Text & String' },
  { label: 'CHAR(10)', value: 'CHAR(10)', category: 'Text & String' },
  { label: 'CHAR(36)', value: 'CHAR(36)', category: 'Text & String' },
  { label: 'CITEXT (Case-insensitive)', value: 'CITEXT', category: 'Text & String' },

  // Identifiers & Logic
  { label: 'UUID', value: 'UUID', category: 'Special & ID' },
  { label: 'ULID', value: 'VARCHAR(26)', category: 'Special & ID' },
  { label: 'CUID / NANOID', value: 'VARCHAR(32)', category: 'Special & ID' },
  { label: 'BOOLEAN / BOOL', value: 'BOOLEAN', category: 'Special & ID' },
  { label: 'JSONB (Binary JSON)', value: 'JSONB', category: 'Special & ID' },
  { label: 'JSON', value: 'JSON', category: 'Special & ID' },
  { label: 'XML', value: 'XML', category: 'Special & ID' },

  // DateTime
  { label: 'TIMESTAMPTZ (with Timezone)', value: 'TIMESTAMPTZ', category: 'DateTime' },
  { label: 'TIMESTAMP (without Timezone)', value: 'TIMESTAMP', category: 'DateTime' },
  { label: 'DATETIME', value: 'DATETIME', category: 'DateTime' },
  { label: 'DATE', value: 'DATE', category: 'DateTime' },
  { label: 'TIME', value: 'TIME', category: 'DateTime' },
  { label: 'TIMETZ', value: 'TIMETZ', category: 'DateTime' },
  { label: 'INTERVAL', value: 'INTERVAL', category: 'DateTime' },
  { label: 'YEAR', value: 'YEAR', category: 'DateTime' },

  // Binary & Blobs
  { label: 'BYTEA (Postgres Binary)', value: 'BYTEA', category: 'Binary & Blob' },
  { label: 'BLOB', value: 'BLOB', category: 'Binary & Blob' },
  { label: 'LONGBLOB', value: 'LONGBLOB', category: 'Binary & Blob' },
  { label: 'MEDIUMBLOB', value: 'MEDIUMBLOB', category: 'Binary & Blob' },
  { label: 'VARBINARY(255)', value: 'VARBINARY(255)', category: 'Binary & Blob' },

  // Spatial & PostGIS
  { label: 'POINT', value: 'POINT', category: 'Spatial & GIS' },
  { label: 'POLYGON', value: 'POLYGON', category: 'Spatial & GIS' },
  { label: 'GEOMETRY', value: 'GEOMETRY', category: 'Spatial & GIS' },
  { label: 'GEOGRAPHY', value: 'GEOGRAPHY', category: 'Spatial & GIS' },
  { label: 'LINESTRING', value: 'LINESTRING', category: 'Spatial & GIS' },

  // Network & IP
  { label: 'INET (IPv4 / IPv6)', value: 'INET', category: 'Network' },
  { label: 'CIDR (IP Range)', value: 'CIDR', category: 'Network' },
  { label: 'MACADDR (MAC Address)', value: 'MACADDR', category: 'Network' },

  // AI Vector & Search
  { label: 'VECTOR(1536) (pgvector / OpenAI)', value: 'VECTOR(1536)', category: 'AI Vector & Search' },
  { label: 'VECTOR(768) (Gemini / BERT)', value: 'VECTOR(768)', category: 'AI Vector & Search' },
  { label: 'TSVECTOR (Full-text Search)', value: 'TSVECTOR', category: 'AI Vector & Search' },
  { label: 'BIT(1)', value: 'BIT(1)', category: 'AI Vector & Search' },
  { label: 'BIT VARYING', value: 'BIT VARYING', category: 'AI Vector & Search' },

  // Arrays (Postgres)
  { label: 'TEXT[] (Array of Text)', value: 'TEXT[]', category: 'Array Types' },
  { label: 'INT[] (Array of Integer)', value: 'INT[]', category: 'Array Types' },
  { label: 'UUID[] (Array of UUID)', value: 'UUID[]', category: 'Array Types' },
];

export const TABLE_COLOR_PRESETS = [
  { name: 'Sky', value: '#38bdf8', border: 'border-sky-500/50', badge: 'bg-sky-500/20 text-sky-400' },
  { name: 'Emerald', value: '#10b981', border: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-400' },
  { name: 'Indigo', value: '#6366f1', border: 'border-indigo-500/50', badge: 'bg-indigo-500/20 text-indigo-400' },
  { name: 'Amber', value: '#f59e0b', border: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-400' },
  { name: 'Rose', value: '#f43f5e', border: 'border-rose-500/50', badge: 'bg-rose-500/20 text-rose-400' },
  { name: 'Purple', value: '#a855f7', border: 'border-purple-500/50', badge: 'bg-purple-500/20 text-purple-400' },
  { name: 'Slate', value: '#64748b', border: 'border-slate-500/50', badge: 'bg-slate-500/20 text-slate-400' },
];
