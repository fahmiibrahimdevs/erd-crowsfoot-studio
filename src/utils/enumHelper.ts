export function parseEnumValues(typeString: string): string[] {
  if (!typeString || !typeString.toUpperCase().startsWith('ENUM')) {
    return [];
  }

  const match = typeString.match(/ENUM\s*\(([\s\S]*?)\)/i);
  if (!match || !match[1].trim()) {
    return ['active', 'inactive', 'pending'];
  }

  const inner = match[1];
  const values: string[] = [];
  
  // Match single or double quoted strings, or comma-separated tokens
  const regex = /'([^']*)'|"([^"]*)"|([^,\s]+)/g;
  let token;
  while ((token = regex.exec(inner)) !== null) {
    const val = token[1] ?? token[2] ?? token[3];
    if (val && val.trim() !== '') {
      values.push(val.trim());
    }
  }

  return values.length > 0 ? values : ['active', 'inactive', 'pending'];
}

export function buildEnumType(values: string[]): string {
  const cleanValues = values
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

  if (cleanValues.length === 0) {
    return `ENUM('active', 'inactive')`;
  }

  return `ENUM(${cleanValues.map((v) => `'${v}'`).join(', ')})`;
}

export function formatColumnTypeDisplay(type: string): { display: string; fullTooltip?: string; isEnum: boolean } {
  if (!type) return { display: '', isEnum: false };

  const upper = type.toUpperCase().trim();
  if (upper.startsWith('ENUM')) {
    const vals = parseEnumValues(type);
    return {
      display: `enum (${vals.length})`,
      fullTooltip: `ENUM: [ ${vals.join(', ')} ]`,
      isEnum: true,
    };
  }

  if (upper.startsWith('SET')) {
    return {
      display: 'set',
      fullTooltip: type,
      isEnum: true,
    };
  }

  return {
    display: type.toLowerCase(),
    fullTooltip: type,
    isEnum: false,
  };
}
