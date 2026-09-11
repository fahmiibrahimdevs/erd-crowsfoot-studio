import { TableData, RelationshipData, ColumnData } from '../types/schema';
import { TABLE_COLOR_PRESETS } from '../types/schema';

export function parseSqlDdl(sqlText: string): { tables: TableData[]; relations: RelationshipData[] } {
  const tables: TableData[] = [];
  const relations: RelationshipData[] = [];
  let colorIdx = 0;

  // Clean comments and normalize text
  const cleanSql = sqlText
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Extract CREATE TABLE blocks
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\.)?[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(([\s\S]*?)\)(?:;|\s+ENGINE|\s+GO|$)/gi;

  let match;
  while ((match = createTableRegex.exec(cleanSql)) !== null) {
    const tableName = match[2] || match[1];
    const body = match[3];
    if (!tableName || !body) continue;

    const tableId = `tbl-${tableName.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const columns: ColumnData[] = [];
    const pkNames = new Set<string>();
    const inlineForeignKeys: Array<{ colName: string; targetTable: string; targetCol: string }> = [];

    // Split lines by comma, respecting parentheses
    const statements = splitSqlStatements(body);

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;

      // Check for standalone PRIMARY KEY (col1, col2)
      const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(',').forEach((c) => pkNames.add(cleanIdentifier(c)));
        continue;
      }

      // Check for standalone FOREIGN KEY (col) REFERENCES target(target_col)
      const fkMatch = trimmed.match(/(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        inlineForeignKeys.push({
          colName: cleanIdentifier(fkMatch[1]),
          targetTable: cleanIdentifier(fkMatch[2]),
          targetCol: cleanIdentifier(fkMatch[3]),
        });
        continue;
      }

      // Check for UNIQUE (col) or KEY / INDEX
      if (/^(?:UNIQUE|KEY|INDEX|CONSTRAINT|CHECK)\b/i.test(trimmed)) {
        continue;
      }

      // It is a column definition
      const col = parseColumnDefinition(trimmed);
      if (col) {
        columns.push(col);
      }
    }

    // Apply table-level primary keys
    for (const col of columns) {
      if (pkNames.has(col.name)) {
        col.isPrimary = true;
      }
    }

    const color = TABLE_COLOR_PRESETS[colorIdx % TABLE_COLOR_PRESETS.length].value;
    colorIdx++;

    tables.push({
      id: tableId,
      name: tableName,
      colorTag: color,
      columns: columns.length > 0 ? columns : [
        {
          id: `col-${Math.random().toString(36).substring(2, 7)}`,
          name: 'id',
          type: 'SERIAL',
          isPrimary: true,
          isNullable: false,
          isUnique: true,
          isAutoIncrement: true,
        }
      ],
    });

    // Store inline relations to resolve later
    (tables as any)._pendingFks = (tables as any)._pendingFks || [];
    for (const fk of inlineForeignKeys) {
      (tables as any)._pendingFks.push({
        sourceTableId: tableId,
        sourceTableName: tableName,
        sourceColName: fk.colName,
        targetTableName: fk.targetTable,
        targetColName: fk.targetCol,
      });
    }
  }

  // Extract standalone ALTER TABLE ... ADD FOREIGN KEY / CONSTRAINT
  const alterFkRegex = /ALTER\s+TABLE\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s+ADD\s+(?:CONSTRAINT\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(([^)]+)\)/gi;
  let alterMatch;
  while ((alterMatch = alterFkRegex.exec(cleanSql)) !== null) {
    const srcTable = cleanIdentifier(alterMatch[1]);
    const constraintName = alterMatch[2];
    const srcCol = cleanIdentifier(alterMatch[3]);
    const tgtTable = cleanIdentifier(alterMatch[4]);
    const tgtCol = cleanIdentifier(alterMatch[5]);

    const sourceTableObj = tables.find((t) => t.name.toLowerCase() === srcTable.toLowerCase());
    const targetTableObj = tables.find((t) => t.name.toLowerCase() === tgtTable.toLowerCase());

    if (sourceTableObj && targetTableObj) {
      const sourceColObj = sourceTableObj.columns.find((c) => c.name.toLowerCase() === srcCol.toLowerCase());
      const targetColObj = targetTableObj.columns.find((c) => c.name.toLowerCase() === tgtCol.toLowerCase());

      if (sourceColObj && targetColObj) {
        relations.push({
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          name: constraintName,
          sourceTableId: sourceTableObj.id,
          sourceColumnId: sourceColObj.id,
          targetTableId: targetTableObj.id,
          targetColumnId: targetColObj.id,
          cardinality: '1:N',
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        });
      }
    }
  }

  // Resolve pending inline FKs
  const pending = (tables as any)._pendingFks || [];
  for (const fk of pending) {
    const srcTableObj = tables.find((t) => t.id === fk.sourceTableId);
    const tgtTableObj = tables.find((t) => t.name.toLowerCase() === fk.targetTableName.toLowerCase());

    if (srcTableObj && tgtTableObj) {
      const srcColObj = srcTableObj.columns.find((c) => c.name.toLowerCase() === fk.sourceColName.toLowerCase());
      const tgtColObj = tgtTableObj.columns.find((c) => c.name.toLowerCase() === fk.targetColName.toLowerCase());

      if (srcColObj && tgtColObj) {
        relations.push({
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: srcTableObj.id,
          sourceColumnId: srcColObj.id,
          targetTableId: tgtTableObj.id,
          targetColumnId: tgtColObj.id,
          cardinality: '1:N',
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        });
      }
    }
  }

  delete (tables as any)._pendingFks;

  return { tables, relations };
}

function cleanIdentifier(str: string): string {
  return str.trim().replace(/^[`"\[]|[`"\]]$/g, '').trim();
}

function splitSqlStatements(body: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

function parseColumnDefinition(stmt: string): ColumnData | null {
  const parts = stmt.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const rawName = parts[0];
  const name = cleanIdentifier(rawName);
  const type = parts[1].toUpperCase();

  const isPrimary = /PRIMARY\s+KEY/i.test(stmt);
  const isNullable = !/NOT\s+NULL/i.test(stmt) && !isPrimary;
  const isUnique = /UNIQUE/i.test(stmt);
  const isAutoIncrement = /AUTO_INCREMENT|SERIAL|IDENTITY/i.test(stmt);

  let defaultValue: string | undefined;
  const defaultMatch = stmt.match(/DEFAULT\s+([^,]+)/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].trim();
  }

  return {
    id: `col-${Math.random().toString(36).substring(2, 7)}`,
    name,
    type,
    isPrimary,
    isNullable,
    isUnique,
    isAutoIncrement,
    defaultValue,
  };
}
