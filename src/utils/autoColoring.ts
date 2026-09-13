import { TableData, RelationshipData, ErdGroup } from '../types/schema';

// Extended palette of elegant, clean colors adhering to the design system
export const EXTENDED_DOMAIN_COLORS: string[] = [
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f97316', // Orange
  '#84cc16', // Lime
  '#3b82f6', // Blue
  '#64748b', // Slate
];

/**
 * Normalizes a word by removing common plural suffixes and lowercasing
 */
export function normalizeRootWord(word: string): string {
  let clean = word.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (clean.endsWith('ies') && clean.length > 4) {
    clean = clean.slice(0, -3) + 'y'; // e.g. categories -> category
  } else if (clean.endsWith('ses') && clean.length > 4) {
    clean = clean.slice(0, -2); // e.g. status_histories -> status_history, addresses -> address
  } else if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 3) {
    clean = clean.slice(0, -1); // e.g. orders -> order, users -> user, projects -> project, articles -> article
  }
  return clean;
}

/**
 * Extract candidate prefix keywords from a table name
 */
export function extractCandidatePrefixes(tableName: string): string[] {
  const clean = tableName.toLowerCase().trim();
  const candidates: string[] = [];

  // 1. Snake case prefix (e.g. project_tags, tech_skills, article_categories, auth_users)
  if (clean.includes('_')) {
    const parts = clean.split('_').filter(Boolean);
    if (parts.length > 0) {
      const firstPart = normalizeRootWord(parts[0]);
      if (firstPart.length >= 2) {
        candidates.push(firstPart);
      }
      if (parts.length > 2) {
        // e.g. ecom_order_items -> ecom_order
        candidates.push(`${normalizeRootWord(parts[0])}_${normalizeRootWord(parts[1])}`);
      }
    }
  }

  // 2. CamelCase / PascalCase prefix (e.g. ProjectDetail, TechSkill, ArticleCategory)
  const camelMatch = tableName.match(/^[a-z]+|[A-Z][a-z0-9]*/g);
  if (camelMatch && camelMatch.length > 1) {
    const firstPart = normalizeRootWord(camelMatch[0]);
    if (firstPart.length >= 2) {
      candidates.push(firstPart);
    }
  }

  // 3. Full normalized root word of the table name itself (e.g. projects -> project, articles -> article)
  const rootName = normalizeRootWord(clean);
  if (rootName.length >= 2) {
    candidates.push(rootName);
  }

  return Array.from(new Set(candidates));
}

export interface DomainColorInfo {
  domain: string;
  color: string;
  tableCount: number;
  tableNames: string[];
}

export interface AutoColorResult {
  updatedTables: TableData[];
  changedCount: number;
  domainStats: DomainColorInfo[];
}

/**
 * Automatically assigns distinct, harmonious color tags to tables based strictly on shared prefixes and domains.
 *
 * Key Rules:
 * 1. A domain/prefix MUST be shared by at least 2 tables to qualify for auto-coloring.
 * 2. Each identified domain receives a distinct, unique color from the palette.
 * 3. Standalone tables that do NOT share a prefix with any other table KEEP their original color
 *    and are NOT altered.
 */
export function autoColorTablesByDomain(
  tables: TableData[],
  _relations: RelationshipData[] = [],
  _groups: ErdGroup[] = [],
  targetTableIds?: string[]
): AutoColorResult {
  if (!tables || tables.length === 0) {
    return { updatedTables: [], changedCount: 0, domainStats: [] };
  }

  const targetTables = targetTableIds && targetTableIds.length > 0
    ? tables.filter((t) => targetTableIds.includes(t.id))
    : tables;

  // Step 1: Map all candidate prefixes to tables
  const prefixToTableIds = new Map<string, string[]>();

  targetTables.forEach((table) => {
    const prefixes = extractCandidatePrefixes(table.name);
    prefixes.forEach((pref) => {
      const list = prefixToTableIds.get(pref) || [];
      list.push(table.id);
      prefixToTableIds.set(pref, list);
    });
  });

  // Step 2: Filter prefixes that have at least 2 tables
  // Sort prefixes by table count descending, then by prefix length descending
  const candidateDomains = Array.from(prefixToTableIds.entries())
    .filter(([_, tableIds]) => tableIds.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || b[0].length - a[0].length);

  // Step 3: Assign tables to the best matching domain (greedy longest/largest match)
  const tableToDomain = new Map<string, string>();
  const assignedTableIds = new Set<string>();

  candidateDomains.forEach(([domain, tableIds]) => {
    const availableTableIds = tableIds.filter((id) => !assignedTableIds.has(id));
    if (availableTableIds.length >= 2) {
      availableTableIds.forEach((id) => {
        tableToDomain.set(id, domain);
        assignedTableIds.add(id);
      });
    }
  });

  // Step 4: Group tables by their final assigned domain
  const domainGroups = new Map<string, TableData[]>();
  targetTables.forEach((table) => {
    const domain = tableToDomain.get(table.id);
    if (domain) {
      const list = domainGroups.get(domain) || [];
      list.push(table);
      domainGroups.set(domain, list);
    }
  });

  // Filter out any domains with fewer than 2 tables
  const finalDomains: { domain: string; tables: TableData[] }[] = [];
  domainGroups.forEach((domainTables, domain) => {
    if (domainTables.length >= 2) {
      finalDomains.push({ domain, tables: domainTables });
    }
  });

  // Sort final domains by table count descending
  finalDomains.sort((a, b) => b.tables.length - a.tables.length);

  // Step 5: Assign distinct colors to each domain
  const domainColorMap = new Map<string, string>();
  const availableColors = [...EXTENDED_DOMAIN_COLORS];

  finalDomains.forEach(({ domain }, idx) => {
    const color = availableColors[idx % availableColors.length];
    domainColorMap.set(domain, color);
  });

  // Step 6: Build updated tables list
  let changedCount = 0;
  const updatedTables = tables.map((tbl) => {
    if (targetTableIds && targetTableIds.length > 0 && !targetTableIds.includes(tbl.id)) {
      return tbl;
    }

    const domain = tableToDomain.get(tbl.id);
    if (domain && domainColorMap.has(domain)) {
      const targetColor = domainColorMap.get(domain)!;
      if (tbl.colorTag !== targetColor) {
        changedCount++;
        return {
          ...tbl,
          colorTag: targetColor,
        };
      }
      return tbl;
    }

    // Standalone tables (no shared prefix) KEEP their original color
    return tbl;
  });

  // Step 7: Build descriptive stats
  const domainStats: DomainColorInfo[] = finalDomains.map(({ domain, tables: domTables }) => ({
    domain,
    color: domainColorMap.get(domain) || '#38bdf8',
    tableCount: domTables.length,
    tableNames: domTables.map((t) => t.name),
  }));

  return {
    updatedTables,
    changedCount,
    domainStats,
  };
}
