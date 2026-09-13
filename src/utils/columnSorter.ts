import { ColumnData, RelationshipData, TableData } from '../types/schema';

// List of common audit/timestamp/metadata column patterns
const AUDIT_COLUMN_PATTERNS = [
  /^(created?_?at|creation_?time|created?_?on|create_?time|created?_?date)$/i,
  /^(updated?_?at|last_?update|modification_?time|updated?_?on|update_?time|updated?_?date)$/i,
  /^(deleted?_?at|deletion_?time|deleted?_?on|delete_?time|deleted?_?date)$/i,
  /^(is_active|is_deleted|is_archived|is_enabled|is_verified|is_published|is_locked)$/i,
  /^(status|state)$/i,
  /^(created?_?by|creator_?id|created_by_id)$/i,
  /^(updated?_?by|updater_?id|updated_by_id|modified_by)$/i,
  /^(deleted?_?by|deleter_?id|deleted_by_id)$/i,
  /^(version|row_version|opt_lock|sync_status)$/i,
];

/**
 * Check if a column matches audit / timestamp / metadata patterns
 */
export function isAuditColumn(col: ColumnData): boolean {
  if (col.isPrimary) return false;
  const name = col.name.trim().toLowerCase();
  return AUDIT_COLUMN_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Check if a column is a Foreign Key
 */
export function isForeignKeyColumn(
  col: ColumnData,
  tableId: string,
  relations: RelationshipData[]
): boolean {
  if (col.isPrimary) return false;

  // Check if actively part of a relationship
  const hasRelation = relations.some(
    (r) => r.sourceTableId === tableId && r.sourceColumnId === col.id
  );
  if (hasRelation) return true;

  // Check naming convention heuristics (e.g. user_id, order_uuid, parent_fk)
  const name = col.name.trim().toLowerCase();
  return (
    name.endsWith('_id') ||
    (name.endsWith('id') && name.length > 2 && name !== 'valid' && name !== 'paid') ||
    name.endsWith('_uuid') ||
    name.endsWith('_fk')
  );
}

/**
 * Sort columns of a single table based on standard database engineering conventions:
 * 1. Primary Keys (PK) at the top
 * 2. Foreign Keys (FK) right under PKs
 * 3. Regular data attributes in the middle
 * 4. Audit / Timestamp / Soft Delete columns at the very bottom
 */
export function sortColumns(
  columns: ColumnData[],
  tableId: string,
  relations: RelationshipData[] = []
): ColumnData[] {
  if (!columns || columns.length <= 1) return columns ? [...columns] : [];

  const primaryKeys: ColumnData[] = [];
  const foreignKeys: ColumnData[] = [];
  const regularColumns: ColumnData[] = [];
  const auditColumns: ColumnData[] = [];

  for (const col of columns) {
    if (col.isPrimary) {
      primaryKeys.push(col);
    } else if (isForeignKeyColumn(col, tableId, relations)) {
      foreignKeys.push(col);
    } else if (isAuditColumn(col)) {
      auditColumns.push(col);
    } else {
      regularColumns.push(col);
    }
  }

  // Sort Primary Keys: if column named 'id' exists, prioritize it first
  primaryKeys.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    if (aName === 'id') return -1;
    if (bName === 'id') return 1;
    return 0;
  });

  // Sort Audit Columns by typical lifecycle order (status -> created -> updated -> deleted -> audit user/version)
  const getAuditScore = (col: ColumnData): number => {
    const name = col.name.trim().toLowerCase();
    if (/^(status|state)$/i.test(name)) return 10;
    if (/^(is_active|is_enabled|is_verified|is_published)$/i.test(name)) return 20;
    if (/^(created?_?at|creation_?time|created?_?on|create_?time|created?_?date)$/i.test(name)) return 30;
    if (/^(created?_?by|creator_?id|created_by_id)$/i.test(name)) return 35;
    if (/^(updated?_?at|last_?update|modification_?time|updated?_?on|update_?time|updated?_?date)$/i.test(name)) return 40;
    if (/^(updated?_?by|updater_?id|updated_by_id|modified_by)$/i.test(name)) return 45;
    if (/^(is_deleted|is_archived)$/i.test(name)) return 50;
    if (/^(deleted?_?at|deletion_?time|deleted?_?on|delete_?time|deleted?_?date)$/i.test(name)) return 60;
    if (/^(deleted?_?by|deleter_?id|deleted_by_id)$/i.test(name)) return 65;
    if (/^(version|row_version|opt_lock|sync_status)$/i.test(name)) return 70;
    return 80;
  };

  auditColumns.sort((a, b) => getAuditScore(a) - getAuditScore(b));

  return [...primaryKeys, ...foreignKeys, ...regularColumns, ...auditColumns];
}

/**
 * Check if the column order of a table is already sorted according to the standard convention
 */
export function isTableColumnsSorted(
  columns: ColumnData[],
  tableId: string,
  relations: RelationshipData[] = []
): boolean {
  const sorted = sortColumns(columns, tableId, relations);
  if (sorted.length !== columns.length) return false;
  return sorted.every((col, idx) => col.id === columns[idx].id);
}

/**
 * Sort columns across specified or all tables in the schema
 */
export function sortTablesColumns(
  tables: TableData[],
  relations: RelationshipData[],
  targetTableIds?: string[]
): { updatedTables: TableData[]; modifiedCount: number } {
  let modifiedCount = 0;

  const updatedTables = tables.map((tbl) => {
    if (targetTableIds && targetTableIds.length > 0 && !targetTableIds.includes(tbl.id)) {
      return tbl;
    }

    const sortedCols = sortColumns(tbl.columns, tbl.id, relations);
    const hasChanged = sortedCols.some((c, idx) => c.id !== tbl.columns[idx]?.id);

    if (hasChanged) {
      modifiedCount++;
      return {
        ...tbl,
        columns: sortedCols,
      };
    }

    return tbl;
  });

  return { updatedTables, modifiedCount };
}
