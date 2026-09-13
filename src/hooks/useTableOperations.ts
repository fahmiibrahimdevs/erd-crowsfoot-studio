import { useCallback } from 'react';
import { Connection } from '@xyflow/react';
import {
  TableData,
  RelationshipData,
  ColumnData,
  ErdGroup,
  SqlDialect,
  TABLE_COLOR_PRESETS,
} from '../types/schema';
import { showToast, promptDialog } from '../utils/alert';
import { generateSqlFromSchema } from '../utils/sqlGenerator';
import {
  sortColumns,
  sortTablesColumns,
  isTableColumnsSorted,
} from '../utils/columnSorter';
import { autoColorTablesByDomain } from '../utils/autoColoring';

interface UseTableOperationsProps {
  tables: TableData[];
  tablesRef: React.MutableRefObject<TableData[]>;
  relations: RelationshipData[];
  groups?: ErdGroup[];
  dialect: SqlDialect;
  historyPositions?: Record<string, { x: number; y: number }>;
  getNodePositions: () => Record<string, { x: number; y: number }>;
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
  updateSchema: (
    newTables: any,
    newRelations?: any,
    newPositions?: Record<string, { x: number; y: number }>
  ) => void;
}

const mapPkTypeToFkType = (pkType: string): string => {
  const upper = pkType.trim().toUpperCase();
  if (upper.startsWith('SERIAL') || upper === 'SERIAL') return 'INT';
  if (upper.startsWith('BIGSERIAL') || upper === 'BIGSERIAL') return 'BIGINT';
  if (upper.startsWith('SMALLSERIAL') || upper === 'SMALLSERIAL') return 'SMALLINT';
  return pkType;
};

export function useTableOperations({
  tables,
  tablesRef,
  relations,
  groups = [],
  dialect,
  historyPositions,
  getNodePositions,
  setSelectedTableId,
  setSelectedTableIds,
  setSelectedRelationId,
  updateSchema,
}: UseTableOperationsProps) {
  const handleAddTable = useCallback(
    (position?: { x: number; y: number }) => {
      const currentTables = tablesRef.current;
      let idx = currentTables.length + 1;
      while (currentTables.some((t) => t.name.toLowerCase() === `new_table_${idx}`)) {
        idx++;
      }
      const color = TABLE_COLOR_PRESETS[(idx - 1) % TABLE_COLOR_PRESETS.length].value;
      const newTable: TableData = {
        id: `tbl-${Date.now().toString(36)}`,
        name: `new_table_${idx}`,
        colorTag: color,
        columns: [
          {
            id: `col-id-${Date.now().toString(36)}`,
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
            isNullable: false,
            isUnique: true,
            isAutoIncrement: true,
          },
          {
            id: `col-created-${Date.now().toString(36)}`,
            name: 'created_at',
            type: 'TIMESTAMPTZ',
            isPrimary: false,
            isNullable: false,
            isUnique: false,
            isAutoIncrement: false,
            defaultValue: 'NOW()',
          },
        ],
      };

      const currentPositions = getNodePositions();
      const defaultPos = position || {
        x: (currentTables.length % 3) * 340 + 60,
        y: Math.floor(currentTables.length / 3) * 360 + 60,
      };
      const newPositions = {
        ...currentPositions,
        [newTable.id]: defaultPos,
      };

      updateSchema((prev: TableData[]) => [...prev, newTable], undefined, newPositions);
      setSelectedTableId(newTable.id);
      setSelectedTableIds([newTable.id]);
      setSelectedRelationId(null);
      showToast(`Table "${newTable.name}" created!`);
    },
    [getNodePositions, setSelectedRelationId, setSelectedTableId, setSelectedTableIds, tablesRef, updateSchema]
  );

  const handleAddQuickTable = useCallback(
    (templateName: string) => {
      const currentTables = tablesRef.current;
      let counter = 1;
      let candidateName = templateName;
      while (currentTables.some((t) => t.name.toLowerCase() === candidateName.toLowerCase())) {
        counter++;
        candidateName = `${templateName}_${counter}`;
      }
      const finalTableName = candidateName;

      const id = `tbl-${finalTableName}-${Math.random().toString(36).substring(2, 6)}`;
      let columns = [
        { id: `col-1`, name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
      ];

      if (templateName === 'users') {
        columns = [
          { id: `col-1`, name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: `col-2`, name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: `col-3`, name: 'password_hash', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-4`, name: 'role', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: "'member'" },
          { id: `col-5`, name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      } else if (templateName === 'orders') {
        columns = [
          { id: `col-1`, name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: `col-2`, name: 'user_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-3`, name: 'order_number', type: 'VARCHAR(64)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: `col-4`, name: 'total_amount', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      } else if (templateName === 'audit_logs') {
        columns = [
          { id: `col-1`, name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: `col-2`, name: 'user_id', type: 'UUID', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-3`, name: 'action', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: `col-4`, name: 'ip_address', type: 'VARCHAR(45)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: `col-5`, name: 'timestamp', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ];
      }

      const color = TABLE_COLOR_PRESETS[tables.length % TABLE_COLOR_PRESETS.length].value;
      const newTable: TableData = {
        id,
        name: finalTableName,
        colorTag: color,
        columns,
      };

      updateSchema((prev: TableData[]) => [...prev, newTable]);
      setSelectedTableId(newTable.id);
      setSelectedTableIds([newTable.id]);
    },
    [tables.length, tablesRef, setSelectedTableId, setSelectedTableIds, updateSchema]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      updateSchema(
        (prev: TableData[]) => prev.filter((t) => t.id !== tableId),
        (prev: RelationshipData[]) =>
          prev.filter((r) => r.sourceTableId !== tableId && r.targetTableId !== tableId)
      );
      setSelectedTableId((current) => (current === tableId ? null : current));
      setSelectedTableIds((prev) => prev.filter((id) => id !== tableId));
    },
    [setSelectedTableId, setSelectedTableIds, updateSchema]
  );

  const handleBatchDeleteTables = useCallback(
    (tableIds: string[]) => {
      if (tableIds.length === 0) return;
      const idSet = new Set(tableIds);
      updateSchema(
        (prev: TableData[]) => prev.filter((t) => !idSet.has(t.id)),
        (prev: RelationshipData[]) =>
          prev.filter((r) => !idSet.has(r.sourceTableId) && !idSet.has(r.targetTableId))
      );
      setSelectedTableId(null);
      setSelectedTableIds([]);
      showToast(`${tableIds.length} tables deleted`, 'info');
    },
    [setSelectedTableId, setSelectedTableIds, updateSchema]
  );

  const handleBatchUpdateColor = useCallback(
    (tableIds: string[], colorTag: string) => {
      if (tableIds.length === 0) return;
      const idSet = new Set(tableIds);
      updateSchema((prev: TableData[]) =>
        prev.map((t) => (idSet.has(t.id) ? { ...t, colorTag } : t))
      );
      showToast(`Color updated for ${tableIds.length} tables`, 'success');
    },
    [updateSchema]
  );

  const handleRenameTable = useCallback(
    async (tableId: string, newName?: string) => {
      const currentTables = tablesRef.current;
      const target = currentTables.find((t) => t.id === tableId);
      if (!target) return;

      let finalName = newName;

      if (finalName === undefined) {
        const inputName = await promptDialog({
          title: 'Rename Table',
          text: `Enter a new name for table "${target.name}":`,
          inputValue: target.name,
          inputPlaceholder: 'Example: users, orders, order_items...',
          confirmText: 'Yes, Rename',
          cancelText: 'Cancel',
          validate: (val) => {
            const cleanVal = val.trim().toLowerCase().replace(/\s+/g, '_');
            if (!cleanVal) return 'Table name cannot be empty!';
            const exists = currentTables.some(
              (t) => t.id !== tableId && t.name.toLowerCase() === cleanVal
            );
            if (exists) {
              return `Table name "${cleanVal}" is already in use by another table! Please use a different name.`;
            }
            return null;
          },
        });

        if (!inputName) {
          return;
        }
        finalName = inputName;
      }

      const clean = finalName.trim().toLowerCase().replace(/\s+/g, '_');
      if (!clean) return;
      if (clean === target.name) return;

      const isDuplicate = currentTables.some(
        (t) => t.id !== tableId && t.name.toLowerCase() === clean
      );
      if (isDuplicate) {
        showToast(
          `Table name "${clean}" is already in use by another table! Please use a different name.`,
          'error'
        );
        return;
      }

      updateSchema(
        (prev: TableData[]) => prev.map((t) => (t.id === tableId ? { ...t, name: clean } : t)),
        (prev: any) => prev
      );
      showToast(`Table renamed to "${clean}"`, 'success');
    },
    [tablesRef, updateSchema]
  );

  const handleDuplicateTables = useCallback(
    (tableIds: string[]) => {
      const currentTables = tablesRef.current;
      const targets = currentTables.filter((t) => tableIds.includes(t.id));
      if (targets.length === 0) return;

      const currentPositions = getNodePositions();
      const newPositions = { ...currentPositions };
      const duplicatedTables: TableData[] = [];

      targets.forEach((tbl) => {
        const newId = `tbl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        let counter = 1;
        let candidateName = `${tbl.name}_copy`;
        while (
          currentTables.some((t) => t.name.toLowerCase() === candidateName.toLowerCase()) ||
          duplicatedTables.some((t) => t.name.toLowerCase() === candidateName.toLowerCase())
        ) {
          counter++;
          candidateName = `${tbl.name}_copy_${counter}`;
        }
        const newName = candidateName;
        const oldPos = currentPositions[tbl.id] || historyPositions?.[tbl.id] || { x: 80, y: 80 };
        newPositions[newId] = { x: oldPos.x + 40, y: oldPos.y + 40 };

        const newCols = tbl.columns.map((col) => {
          const newColId = `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          return { ...col, id: newColId };
        });

        duplicatedTables.push({
          ...tbl,
          id: newId,
          name: newName,
          columns: newCols,
        });
      });

      updateSchema(
        (prev: TableData[]) => [...prev, ...duplicatedTables],
        (prev: any) => prev,
        newPositions
      );

      const dupIds = duplicatedTables.map((t) => t.id);
      setSelectedTableIds(dupIds);
      if (dupIds.length === 1) {
        setSelectedTableId(dupIds[0]);
      }
      showToast(`Successfully duplicated ${duplicatedTables.length} tables`, 'success');
    },
    [getNodePositions, historyPositions, setSelectedTableId, setSelectedTableIds, tablesRef, updateSchema]
  );

  const handleAddColumnToTable = useCallback(
    (tableId: string) => {
      const targetTable = tables.find((t) => t.id === tableId);
      const colCount = (targetTable?.columns.length || 0) + 1;
      const newCol = {
        id: `col-${Math.random().toString(36).substring(2, 7)}`,
        name: `field_${colCount}`,
        type: 'VARCHAR(255)',
        isPrimary: false,
        isNullable: true,
        isUnique: false,
        isAutoIncrement: false,
      };

      updateSchema((prev: TableData[]) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          return { ...t, columns: [...t.columns, newCol] };
        })
      );
      setSelectedTableId(tableId);
      setSelectedTableIds([tableId]);
      showToast('New column added');
    },
    [setSelectedTableId, setSelectedTableIds, tables, updateSchema]
  );

  const handleReorderColumns = useCallback(
    (tableId: string, newColumns: ColumnData[]) => {
      updateSchema((prev: TableData[]) =>
        prev.map((t) => (t.id === tableId ? { ...t, columns: newColumns } : t))
      );
    },
    [updateSchema]
  );

  const handleSortTableColumns = useCallback(
    (tableId: string) => {
      const currentTables = tablesRef.current;
      const targetTable = currentTables.find((t) => t.id === tableId);
      if (!targetTable) return;

      if (isTableColumnsSorted(targetTable.columns, targetTable.id, relations)) {
        showToast(`Columns of table "${targetTable.name}" are already sorted!`, 'info');
        return;
      }

      const sorted = sortColumns(targetTable.columns, targetTable.id, relations);
      updateSchema((prev: TableData[]) =>
        prev.map((t) => (t.id === tableId ? { ...t, columns: sorted } : t))
      );
      showToast(`Columns in table "${targetTable.name}" sorted successfully!`, 'success');
    },
    [relations, tablesRef, updateSchema]
  );

  const handleSortMultipleTablesColumns = useCallback(
    (targetTableIds?: string[]) => {
      const currentTables = tablesRef.current;
      const { updatedTables, modifiedCount } = sortTablesColumns(
        currentTables,
        relations,
        targetTableIds
      );

      if (modifiedCount === 0) {
        showToast(
          targetTableIds && targetTableIds.length === 1
            ? 'Columns in this table are already sorted!'
            : 'All selected tables columns are already sorted!',
          'info'
        );
        return;
      }

      updateSchema(() => updatedTables);
      showToast(`Successfully sorted columns on ${modifiedCount} tables!`, 'success');
    },
    [relations, tablesRef, updateSchema]
  );

  const handleAutoColorDomains = useCallback(
    (targetTableIds?: string[]) => {
      const currentTables = tablesRef.current;
      const { updatedTables, changedCount, domainStats } = autoColorTablesByDomain(
        currentTables,
        relations,
        groups,
        targetTableIds
      );

      if (domainStats.length === 0) {
        showToast(
          'No shared module prefixes or domains found across tables.',
          'info'
        );
        return;
      }

      if (changedCount === 0) {
        showToast(
          targetTableIds && targetTableIds.length === 1
            ? 'This table color is already aligned with its domain/prefix!'
            : 'Tables with shared domains already have aligned colors!',
          'info'
        );
        return;
      }

      updateSchema(() => updatedTables);
      const domainNamesStr = domainStats.map((d) => d.domain).slice(0, 4).join(', ');
      const moreStr = domainStats.length > 4 ? ` and ${domainStats.length - 4} more` : '';
      showToast(
        `Successfully colored ${changedCount} tables across ${domainStats.length} domains (${domainNamesStr}${moreStr})!`,
        'success'
      );
    },
    [groups, relations, tablesRef, updateSchema]
  );

  const handleCopySql = useCallback(
    (tableId: string) => {
      const tbl = tables.find((t) => t.id === tableId);
      if (!tbl) return;
      const rels = relations.filter(
        (r) => r.sourceTableId === tableId || r.targetTableId === tableId
      );
      const sql = generateSqlFromSchema([tbl], rels, dialect);
      navigator.clipboard.writeText(sql).then(() => {
        showToast(`SQL CREATE for "${tbl.name}" copied to clipboard`, 'success');
      });
    },
    [dialect, relations, tables]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      ) {
        return;
      }

      const sourceColId = connection.sourceHandle.replace('-right', '').replace('-left', '');
      const targetColId = connection.targetHandle.replace('-right', '').replace('-left', '');

      if (connection.source === connection.target && sourceColId === targetColId) {
        showToast('Cannot connect a column to itself', 'warning');
        return;
      }

      const sourceTable = tables.find((t) => t.id === connection.source);
      const targetTable = tables.find((t) => t.id === connection.target);
      if (!sourceTable || !targetTable) return;

      const sourceCol = sourceTable.columns.find((c) => c.id === sourceColId);
      const targetCol = targetTable.columns.find((c) => c.id === targetColId);
      if (!sourceCol || !targetCol) return;

      const existingRel = relations.find(
        (r) =>
          (r.sourceTableId === connection.source &&
            r.targetTableId === connection.target &&
            r.sourceColumnId === sourceColId &&
            r.targetColumnId === targetColId) ||
          (r.sourceTableId === connection.target &&
            r.targetTableId === connection.source &&
            r.sourceColumnId === targetColId &&
            r.targetColumnId === sourceColId)
      );

      if (existingRel) {
        setSelectedRelationId(existingRel.id);
        setSelectedTableId(null);
        showToast('Relationship between these columns already exists!', 'warning');
        return;
      }

      const sourceSide = connection.sourceHandle.endsWith('-left') ? 'left' : 'right';
      const targetSide = connection.targetHandle.endsWith('-left') ? 'left' : 'right';

      // CASE A: Both columns are Primary Keys
      if (sourceCol.isPrimary && targetCol.isPrimary && connection.source !== connection.target) {
        let baseColName = `${sourceTable.name.toLowerCase().replace(/s$/, '')}_id`;
        if (sourceTable.name.toLowerCase().startsWith('new_table_')) {
          baseColName = `${sourceTable.name.toLowerCase()}_id`;
        }

        let newColName = baseColName;
        let counter = 1;
        while (targetTable.columns.some((c) => c.name.toLowerCase() === newColName.toLowerCase())) {
          newColName = `${baseColName}_${counter++}`;
        }

        const newFkCol: ColumnData = {
          id: `col-fk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          name: newColName,
          type: mapPkTypeToFkType(sourceCol.type),
          isPrimary: false,
          isNullable: false,
          isUnique: false,
          isAutoIncrement: false,
        };

        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: targetTable.id,
          sourceColumnId: newFkCol.id,
          targetTableId: sourceTable.id,
          targetColumnId: sourceCol.id,
          sourceHandle: `${newFkCol.id}-${targetSide}`,
          targetHandle: `${sourceCol.id}-${sourceSide}`,
          cardinality: '1:N',
          sourceMarker: 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev: TableData[]) =>
            prev.map((tbl) =>
              tbl.id === targetTable.id
                ? { ...tbl, columns: [...tbl.columns, newFkCol] }
                : tbl
            ),
          (prev: RelationshipData[]) => [...prev, newRelation]
        );

        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `Foreign Key column "${newColName}" automatically added to "${targetTable.name}"!`,
          'success'
        );
        return;
      }

      // CASE B: One column is PK and the other is Non-PK
      if (sourceCol.isPrimary && !targetCol.isPrimary) {
        const isOneToOne = targetCol.isUnique;
        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: targetTable.id,
          sourceColumnId: targetCol.id,
          targetTableId: sourceTable.id,
          targetColumnId: sourceCol.id,
          sourceHandle: connection.targetHandle,
          targetHandle: connection.sourceHandle,
          cardinality: isOneToOne ? '1:1' : '1:N',
          sourceMarker: isOneToOne ? 'one-mandatory' : targetCol.isNullable ? 'many-optional' : 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev: TableData[]) => prev,
          (prev: RelationshipData[]) => [...prev, newRelation]
        );
        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `${isOneToOne ? 'One-to-One' : 'One-to-Many'} relation (${sourceTable.name}.${sourceCol.name} → ${targetTable.name}.${targetCol.name}) connected successfully!`,
          'success'
        );
        return;
      }

      if (!sourceCol.isPrimary && targetCol.isPrimary) {
        const isOneToOne = sourceCol.isUnique;
        const newRelation: RelationshipData = {
          id: `rel-${Math.random().toString(36).substring(2, 8)}`,
          sourceTableId: sourceTable.id,
          sourceColumnId: sourceCol.id,
          targetTableId: targetTable.id,
          targetColumnId: targetCol.id,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          cardinality: isOneToOne ? '1:1' : '1:N',
          sourceMarker: isOneToOne ? 'one-mandatory' : sourceCol.isNullable ? 'many-optional' : 'many-mandatory',
          targetMarker: 'one-mandatory',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        };

        updateSchema(
          (prev: TableData[]) => prev,
          (prev: RelationshipData[]) => [...prev, newRelation]
        );
        setSelectedRelationId(newRelation.id);
        setSelectedTableId(null);
        showToast(
          `${isOneToOne ? 'One-to-One' : 'One-to-Many'} relation (${targetTable.name}.${targetCol.name} → ${sourceTable.name}.${sourceCol.name}) connected successfully!`,
          'success'
        );
        return;
      }

      // CASE C: Both columns are Non-PK
      const isOneToOne = sourceCol.isUnique;
      const newRelation: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: sourceTable.id,
        sourceColumnId: sourceCol.id,
        targetTableId: targetTable.id,
        targetColumnId: targetCol.id,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        cardinality: isOneToOne ? '1:1' : '1:N',
        sourceMarker: isOneToOne ? 'one-mandatory' : sourceCol.isNullable ? 'many-optional' : 'many-mandatory',
        targetMarker: 'one-mandatory',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      updateSchema(
        (prev: TableData[]) =>
          prev.map((tbl) =>
            tbl.id === targetTable.id
              ? {
                  ...tbl,
                  columns: tbl.columns.map((c) =>
                    c.id === targetCol.id ? { ...c, isPrimary: true } : c
                  ),
                }
              : tbl
          ),
        (prev: RelationshipData[]) => [...prev, newRelation]
      );

      setSelectedRelationId(newRelation.id);
      setSelectedTableId(null);
      showToast(
        `Column "${targetTable.name}.${targetCol.name}" automatically set as Primary Key (PK) & relation connected!`,
        'success'
      );
    },
    [relations, setSelectedRelationId, setSelectedTableId, tables, updateSchema]
  );

  const handleGenerateJunctionTable = useCallback(
    (sourceTableId: string, targetTableId: string, relationId: string) => {
      const source = tables.find((t) => t.id === sourceTableId);
      const target = tables.find((t) => t.id === targetTableId);
      if (!source || !target) return;

      const sourcePk = source.columns.find((c) => c.isPrimary) || source.columns[0];
      const targetPk = target.columns.find((c) => c.isPrimary) || target.columns[0];
      if (!sourcePk || !targetPk) {
        showToast('Both tables must have Primary Keys to generate a junction table', 'warning');
        return;
      }

      const sName = source.name.toLowerCase().replace(/s$/, '');
      const tName = target.name.toLowerCase().replace(/s$/, '');
      const junctionName = `${sName}_${tName}`;

      const sColName = `${sName}_id`;
      const tColName = `${tName}_id`;

      const junctionCol1: ColumnData = {
        id: `col-${Date.now().toString(36)}-1`,
        name: sColName,
        type: mapPkTypeToFkType(sourcePk.type),
        isPrimary: true,
        isNullable: false,
        isUnique: false,
        isAutoIncrement: false,
      };

      const junctionCol2: ColumnData = {
        id: `col-${Date.now().toString(36)}-2`,
        name: tColName,
        type: mapPkTypeToFkType(targetPk.type),
        isPrimary: true,
        isNullable: false,
        isUnique: false,
        isAutoIncrement: false,
      };

      const junctionColCreatedAt: ColumnData = {
        id: `col-${Date.now().toString(36)}-3`,
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        isPrimary: false,
        isNullable: false,
        isUnique: false,
        isAutoIncrement: false,
        defaultValue: 'NOW()',
      };

      const junctionTable: TableData = {
        id: `tbl-${Date.now().toString(36)}`,
        name: junctionName,
        colorTag: '#38bdf8',
        columns: [junctionCol1, junctionCol2, junctionColCreatedAt],
      };

      const currentPosMap = getNodePositions();
      const sPos = currentPosMap[source.id] || { x: 100, y: 100 };
      const tPos = currentPosMap[target.id] || { x: 500, y: 100 };
      const junctionPos = {
        x: Math.round((sPos.x + tPos.x) / 2),
        y: Math.round((sPos.y + tPos.y) / 2) + 120,
      };

      const newPosMap = {
        ...currentPosMap,
        [junctionTable.id]: junctionPos,
      };

      const rel1: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: junctionTable.id,
        sourceColumnId: junctionCol1.id,
        targetTableId: source.id,
        targetColumnId: sourcePk.id,
        sourceHandle: `${junctionCol1.id}-left`,
        targetHandle: `${sourcePk.id}-right`,
        cardinality: '1:N',
        sourceMarker: 'many-mandatory',
        targetMarker: 'one-mandatory',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      const rel2: RelationshipData = {
        id: `rel-${Math.random().toString(36).substring(2, 8)}`,
        sourceTableId: junctionTable.id,
        sourceColumnId: junctionCol2.id,
        targetTableId: target.id,
        targetColumnId: targetPk.id,
        sourceHandle: `${junctionCol2.id}-right`,
        targetHandle: `${targetPk.id}-left`,
        cardinality: '1:N',
        sourceMarker: 'many-mandatory',
        targetMarker: 'one-mandatory',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      updateSchema(
        (prev: TableData[]) => [...prev, junctionTable],
        (prev: RelationshipData[]) => [...prev.filter((r) => r.id !== relationId), rel1, rel2],
        newPosMap
      );

      setSelectedTableId(junctionTable.id);
      setSelectedTableIds([junctionTable.id]);
      setSelectedRelationId(null);
      showToast(
        `Junction table "${junctionName}" generated to replace Many-to-Many relationship!`,
        'success'
      );
    },
    [getNodePositions, setSelectedRelationId, setSelectedTableId, setSelectedTableIds, tables, updateSchema]
  );

  return {
    handleAddTable,
    handleAddQuickTable,
    handleDeleteTable,
    handleBatchDeleteTables,
    handleBatchUpdateColor,
    handleRenameTable,
    handleDuplicateTables,
    handleAddColumnToTable,
    handleReorderColumns,
    handleSortTableColumns,
    handleSortMultipleTablesColumns,
    handleAutoColorDomains,
    handleCopySql,
    handleConnect,
    handleGenerateJunctionTable,
  };
}
