import { TableData, RelationshipData, SqlDialect, ColumnData } from '../types/schema';

export function generateSql(
  tables: TableData[],
  relations: RelationshipData[],
  dialect: SqlDialect = 'postgres'
): string {
  if (tables.length === 0) {
    return '-- No tables defined yet.\n-- Add tables to the canvas or import an existing SQL schema.';
  }

  switch (dialect) {
    case 'postgres':
      return generatePostgresSql(tables, relations);
    case 'mysql':
      return generateMySql(tables, relations);
    case 'sqlite':
      return generateSqlite(tables, relations);
    case 'prisma':
      return generatePrismaSchema(tables, relations);
    case 'mssql':
      return generateMsSql(tables, relations);
    default:
      return generatePostgresSql(tables, relations);
  }
}

export const generateSqlFromSchema = generateSql;

function mapTypeForPostgres(type: string): string {
  if (type.toUpperCase().startsWith('ENUM') || type.toUpperCase().startsWith('SET')) {
    return type;
  }
  const t = type.toUpperCase();
  if (t === 'DATETIME') return 'TIMESTAMP';
  if (t === 'TINYINT') return 'SMALLINT';
  return type;
}

function generatePostgresSql(tables: TableData[], relations: RelationshipData[]): string {
  const lines: string[] = [
    `-- ==========================================================`,
    `-- Generated with ERD Studio (PostgreSQL DDL)`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- ==========================================================\n`,
  ];

  // Create Tables
  for (const table of tables) {
    if (table.comment) {
      lines.push(`-- ${table.comment}`);
    }
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);
    
    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of table.columns) {
      let def = `  "${col.name}" ${mapTypeForPostgres(col.type)}`;
      
      if (!col.isNullable && !col.isPrimary) {
        def += ` NOT NULL`;
      }
      if (col.isUnique && !col.isPrimary) {
        def += ` UNIQUE`;
      }
      if (col.defaultValue && col.defaultValue.trim() !== '') {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.isPrimary) {
        pkCols.push(`"${col.name}"`);
      }
      colDefs.push(def);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`);\n`);
  }

  // Create Foreign Key Constraints
  if (relations.length > 0) {
    lines.push(`-- ==========================================================`);
    lines.push(`-- Foreign Key Constraints`);
    lines.push(`-- ==========================================================\n`);

    for (const rel of relations) {
      const sourceTable = tables.find((t) => t.id === rel.sourceTableId);
      const targetTable = tables.find((t) => t.id === rel.targetTableId);
      if (!sourceTable || !targetTable) continue;

      const sourceCol = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
      const targetCol = targetTable.columns.find((c) => c.id === rel.targetColumnId);
      if (!sourceCol || !targetCol) continue;

      const constraintName = rel.name || `fk_${sourceTable.name}_${sourceCol.name}`;
      
      lines.push(
        `ALTER TABLE "${sourceTable.name}" ` +
        `ADD CONSTRAINT "${constraintName}" ` +
        `FOREIGN KEY ("${sourceCol.name}") ` +
        `REFERENCES "${targetTable.name}" ("${targetCol.name}") ` +
        `ON DELETE ${rel.onDelete} ON UPDATE ${rel.onUpdate};\n`
      );
    }
  }

  return lines.join('\n');
}

function generateMySql(tables: TableData[], relations: RelationshipData[]): string {
  const lines: string[] = [
    `-- ==========================================================`,
    `-- Generated with ERD Studio (MySQL DDL)`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- ==========================================================\n`,
  ];

  for (const table of tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (`);
    
    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of table.columns) {
      let colType = col.type;
      if (colType.toUpperCase() === 'SERIAL') {
        colType = 'INT';
      } else if (colType.toUpperCase() === 'BIGSERIAL') {
        colType = 'BIGINT';
      }

      let def = `  \`${col.name}\` ${colType}`;
      if (col.isAutoIncrement || col.type.toUpperCase().includes('SERIAL')) {
        def += ` AUTO_INCREMENT`;
      }
      if (!col.isNullable && !col.isPrimary) {
        def += ` NOT NULL`;
      }
      if (col.isUnique && !col.isPrimary) {
        def += ` UNIQUE`;
      }
      if (col.defaultValue && col.defaultValue.trim() !== '') {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.isPrimary) {
        pkCols.push(`\`${col.name}\``);
      }
      colDefs.push(def);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    // Add inline foreign keys for MySQL
    const tableRelations = relations.filter((r) => r.sourceTableId === table.id);
    for (const rel of tableRelations) {
      const targetTable = tables.find((t) => t.id === rel.targetTableId);
      const sourceCol = table.columns.find((c) => c.id === rel.sourceColumnId);
      const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);
      if (targetTable && sourceCol && targetCol) {
        const cName = rel.name || `fk_${table.name}_${sourceCol.name}`;
        colDefs.push(
          `  CONSTRAINT \`${cName}\` FOREIGN KEY (\`${sourceCol.name}\`) REFERENCES \`${targetTable.name}\` (\`${targetCol.name}\`) ON DELETE ${rel.onDelete} ON UPDATE ${rel.onUpdate}`
        );
      }
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`);
  }

  return lines.join('\n');
}

function generateSqlite(tables: TableData[], relations: RelationshipData[]): string {
  const lines: string[] = [
    `-- ==========================================================`,
    `-- Generated with ERD Studio (SQLite DDL)`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- ==========================================================\n`,
    `PRAGMA foreign_keys = ON;\n`,
  ];

  for (const table of tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);
    
    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of table.columns) {
      let def = `  "${col.name}" ${col.type}`;
      if (col.isPrimary && col.isAutoIncrement) {
        def += ` PRIMARY KEY AUTOINCREMENT`;
      } else {
        if (!col.isNullable) def += ` NOT NULL`;
        if (col.isUnique) def += ` UNIQUE`;
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        if (col.isPrimary) pkCols.push(`"${col.name}"`);
      }
      colDefs.push(def);
    }

    if (pkCols.length > 0 && !table.columns.some((c) => c.isPrimary && c.isAutoIncrement)) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    const tableRelations = relations.filter((r) => r.sourceTableId === table.id);
    for (const rel of tableRelations) {
      const targetTable = tables.find((t) => t.id === rel.targetTableId);
      const sourceCol = table.columns.find((c) => c.id === rel.sourceColumnId);
      const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);
      if (targetTable && sourceCol && targetCol) {
        colDefs.push(
          `  FOREIGN KEY ("${sourceCol.name}") REFERENCES "${targetTable.name}" ("${targetCol.name}") ON DELETE ${rel.onDelete} ON UPDATE ${rel.onUpdate}`
        );
      }
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`);\n`);
  }

  return lines.join('\n');
}

function generateMsSql(tables: TableData[], relations: RelationshipData[]): string {
  const lines: string[] = [
    `-- ==========================================================`,
    `-- Generated with ERD Studio (Microsoft SQL Server DDL)`,
    `-- ==========================================================\n`,
  ];

  for (const table of tables) {
    lines.push(`CREATE TABLE [${table.name}] (`);
    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of table.columns) {
      let def = `  [${col.name}] ${col.type}`;
      if (col.isAutoIncrement) def += ` IDENTITY(1,1)`;
      if (!col.isNullable && !col.isPrimary) def += ` NOT NULL`;
      if (col.isUnique) def += ` UNIQUE`;
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.isPrimary) pkCols.push(`[${col.name}]`);
      colDefs.push(def);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`);\nGO\n`);
  }

  for (const rel of relations) {
    const sourceTable = tables.find((t) => t.id === rel.sourceTableId);
    const targetTable = tables.find((t) => t.id === rel.targetTableId);
    if (!sourceTable || !targetTable) continue;

    const sourceCol = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
    const targetCol = targetTable.columns.find((c) => c.id === rel.targetColumnId);
    if (!sourceCol || !targetCol) continue;

    const cName = rel.name || `FK_${sourceTable.name}_${sourceCol.name}`;
    lines.push(
      `ALTER TABLE [${sourceTable.name}] ` +
      `ADD CONSTRAINT [${cName}] ` +
      `FOREIGN KEY ([${sourceCol.name}]) ` +
      `REFERENCES [${targetTable.name}] ([${targetCol.name}]) ` +
      `ON DELETE ${rel.onDelete === 'RESTRICT' ? 'NO ACTION' : rel.onDelete} ` +
      `ON UPDATE ${rel.onUpdate === 'RESTRICT' ? 'NO ACTION' : rel.onUpdate};\nGO\n`
    );
  }

  return lines.join('\n');
}

function mapPrismaType(type: string): string {
  const t = type.toUpperCase();
  if (t.startsWith('ENUM')) return 'String';
  if (t.includes('[]')) return `${mapPrismaType(type.replace('[]', ''))}[]`;
  if (t.includes('INT') || t === 'SERIAL') return 'Int';
  if (t.includes('BIGINT') || t === 'BIGSERIAL') return 'BigInt';
  if (t.includes('VARCHAR') || t === 'TEXT' || t.includes('CHAR') || t === 'CITEXT') return 'String';
  if (t.includes('BOOL')) return 'Boolean';
  if (t.includes('FLOAT') || t.includes('DECIMAL') || t.includes('DOUBLE') || t.includes('NUMERIC') || t === 'REAL' || t === 'MONEY') return 'Float';
  if (t.includes('TIME') || t === 'DATE') return 'DateTime';
  if (t.includes('JSON')) return 'Json';
  if (t.includes('UUID')) return 'String';
  if (t.includes('BYTEA') || t.includes('BLOB')) return 'Bytes';
  return 'String';
}

function generatePrismaSchema(tables: TableData[], relations: RelationshipData[]): string {
  const lines: string[] = [
    `datasource db {`,
    `  provider = "postgresql"`,
    `  url      = env("DATABASE_URL")`,
    `}`,
    ``,
    `generator client {`,
    `  provider = "prisma-client-js"`,
    `}`,
    ``,
  ];

  for (const table of tables) {
    const modelName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
    lines.push(`model ${modelName} {`);

    for (const col of table.columns) {
      let pType = mapPrismaType(col.type);
      if (col.isNullable && !col.isPrimary) {
        pType += '?';
      }

      const attributes: string[] = [];
      if (col.isPrimary) attributes.push('@id');
      if (col.isAutoIncrement || col.type.toUpperCase().includes('SERIAL')) {
        attributes.push('@default(autoincrement())');
      } else if (col.type.toUpperCase().includes('UUID')) {
        attributes.push('@default(uuid())');
      } else if (col.defaultValue) {
        if (col.defaultValue.toUpperCase().includes('NOW')) {
          attributes.push('@default(now())');
        } else {
          attributes.push(`@default(${col.defaultValue})`);
        }
      }
      if (col.isUnique && !col.isPrimary) attributes.push('@unique');

      lines.push(`  ${col.name.padEnd(20)} ${pType.padEnd(12)} ${attributes.join(' ')}`.trimEnd());
    }

    lines.push(`  @@map("${table.name}")`);
    lines.push(`}\n`);
  }

  return lines.join('\n');
}
