import { toPng, toSvg, toJpeg, toBlob } from 'html-to-image';
import { Node, Edge } from '@xyflow/react';
import { TableData, RelationshipData, ErdGroup } from '../types/schema';

export interface ImageExportOptions {
  format: 'png' | 'svg' | 'jpeg';
  scale: 1 | 2 | 3 | 4;
  backgroundMode: 'current' | 'dark' | 'light' | 'transparent';
  pattern: 'dot-grid' | 'solid';
  cropMode: 'all' | 'viewport';
  showGroups?: boolean;
  includeShadow?: boolean;
  padding?: number;
  filename?: string;
}

export interface DiagramBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates accurate bounding box encompassing all tables, groups, and edge waypoints.
 */
export const calculateDiagramBounds = (
  nodes: Node[],
  edges: Edge[],
  tables: TableData[],
  groups: ErdGroup[] = [],
  showGroups = true
): DiagramBounds => {
  if (nodes.length === 0 && tables.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800, width: 1200, height: 800 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // 1. Calculate from Nodes
  nodes.forEach((node) => {
    if (!showGroups && node.type === 'groupNode') return;

    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;

    let w = 280;
    let h = 160;

    if (node.type === 'tableNode') {
      const tbl = (node.data?.table as TableData) || tables.find((t) => t.id === node.id);
      const colCount = tbl?.columns?.length ?? 4;
      w = 280;
      h = Math.max(120, 52 + colCount * 32);
    } else if (node.type === 'groupNode') {
      w = (node.data?.width as number) || 340;
      h = (node.data?.height as number) || 180;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });

  // 2. Include all relationship routing waypoints
  edges.forEach((edge) => {
    const precomputed = edge.data?.precomputedWaypoints as Array<{ x: number; y: number }> | undefined;
    const custom = (edge.data?.relation as RelationshipData)?.customPath?.waypoints;
    const pts = custom || precomputed;

    if (pts && Array.isArray(pts)) {
      pts.forEach((pt) => {
        if (typeof pt.x === 'number' && typeof pt.y === 'number') {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      });
    }
  });

  // Fallback if no valid points found
  if (minX === Infinity || maxX === -Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1200;
    maxY = 800;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(200, maxX - minX),
    height: Math.max(150, maxY - minY),
  };
};

/**
 * Resolves appropriate background color for image capture
 */
export const resolveBackgroundColor = (
  mode: 'current' | 'dark' | 'light' | 'transparent',
  format: 'png' | 'svg' | 'jpeg'
): string | undefined => {
  if (format === 'jpeg' && mode === 'transparent') {
    return '#020617'; // JPEG does not support transparency
  }

  if (mode === 'transparent') {
    return undefined;
  }

  if (mode === 'dark') {
    return '#020617';
  }

  if (mode === 'light') {
    return '#ffffff';
  }

  // Current theme
  const isLight = document.documentElement.classList.contains('light');
  return isLight ? '#ffffff' : '#020617';
};

/**
 * Exports the diagram to high-resolution image data URL or Blob
 */
export const generateDiagramImage = async (
  options: ImageExportOptions,
  nodes: Node[],
  edges: Edge[],
  tables: TableData[],
  groups: ErdGroup[] = []
): Promise<{ dataUrl: string; width: number; height: number; filename: string }> => {
  const viewportElem = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewportElem) {
    throw new Error('Gagal menemukan elemen kanvas diagram (.react-flow__viewport)');
  }

  const {
    format = 'png',
    scale = 3,
    backgroundMode = 'current',
    cropMode = 'all',
    showGroups = true,
    includeShadow = false,
    padding = 80,
    filename: customFilename,
  } = options;

  const bounds = calculateDiagramBounds(nodes, edges, tables, groups, showGroups);
  const bgColor = resolveBackgroundColor(backgroundMode, format);

  const finalWidth = cropMode === 'all' ? Math.ceil(bounds.width + padding * 2) : viewportElem.offsetWidth;
  const finalHeight = cropMode === 'all' ? Math.ceil(bounds.height + padding * 2) : viewportElem.offsetHeight;

  const originalTransform = viewportElem.style.transform;
  const originalTransformOrigin = viewportElem.style.transformOrigin;

  // Activate clean export class on DOM
  document.body.classList.add('export-clean-mode');
  if (!showGroups) {
    document.body.classList.add('hide-groups');
  }
  if (!includeShadow || backgroundMode === 'transparent') {
    document.body.classList.add('export-no-shadow');
  }
  if (backgroundMode === 'transparent') {
    document.body.classList.add('export-transparent-mode');
  }

  // Filter elements that shouldn't appear in clean exported images
  const filterNode = (node: HTMLElement) => {
    if (!node || !node.classList) return true;
    const cl = node.classList;
    if (
      cl.contains('export-hide') ||
      cl.contains('react-flow__controls') ||
      cl.contains('react-flow__minimap') ||
      cl.contains('react-flow__panel') ||
      cl.contains('react-flow__attribution') ||
      cl.contains('react-flow__handle') ||
      cl.contains('table-handle') ||
      cl.contains('nodrag-tools')
    ) {
      return false;
    }
    if (!showGroups && (cl.contains('group-node-container') || node.getAttribute('data-type') === 'groupNode')) {
      return false;
    }
    return true;
  };

  const htmlToImageOptions = {
    backgroundColor: bgColor,
    pixelRatio: scale,
    width: finalWidth,
    height: finalHeight,
    filter: filterNode as any,
    style:
      cropMode === 'all'
        ? {
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            transform: `translate(${-bounds.minX + padding}px, ${-bounds.minY + padding}px) scale(1)`,
            transformOrigin: 'top left',
          }
        : undefined,
  };

  try {
    let dataUrl: string;
    if (format === 'svg') {
      dataUrl = await toSvg(viewportElem, htmlToImageOptions);
    } else if (format === 'jpeg') {
      dataUrl = await toJpeg(viewportElem, { ...htmlToImageOptions, quality: 0.95 });
    } else {
      dataUrl = await toPng(viewportElem, { ...htmlToImageOptions, quality: 1.0 });
    }

    const safeName = (customFilename || 'er-diagram').toLowerCase().replace(/\s+/g, '_');
    const filename = `${safeName}_${scale}x.${format}`;

    return {
      dataUrl,
      width: finalWidth * scale,
      height: finalHeight * scale,
      filename,
    };
  } finally {
    // Restore original styles & classes
    document.body.classList.remove('export-clean-mode');
    document.body.classList.remove('hide-groups');
    document.body.classList.remove('export-no-shadow');
    document.body.classList.remove('export-transparent-mode');
    viewportElem.style.transform = originalTransform;
    viewportElem.style.transformOrigin = originalTransformOrigin;
  }
};

/**
 * Copies high-definition diagram image directly to the user's OS clipboard
 */
export const copyDiagramImageToClipboard = async (
  options: Omit<ImageExportOptions, 'format'>,
  nodes: Node[],
  edges: Edge[],
  tables: TableData[],
  groups: ErdGroup[] = []
): Promise<void> => {
  const viewportElem = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewportElem) {
    throw new Error('Gagal menemukan elemen kanvas diagram');
  }

  const {
    scale = 2,
    backgroundMode = 'current',
    cropMode = 'all',
    showGroups = true,
    includeShadow = false,
    padding = 80,
  } = options;

  const bounds = calculateDiagramBounds(nodes, edges, tables, groups, showGroups);
  const bgColor = resolveBackgroundColor(backgroundMode, 'png');

  const finalWidth = cropMode === 'all' ? Math.ceil(bounds.width + padding * 2) : viewportElem.offsetWidth;
  const finalHeight = cropMode === 'all' ? Math.ceil(bounds.height + padding * 2) : viewportElem.offsetHeight;

  const originalTransform = viewportElem.style.transform;
  const originalTransformOrigin = viewportElem.style.transformOrigin;

  document.body.classList.add('export-clean-mode');
  if (!showGroups) {
    document.body.classList.add('hide-groups');
  }
  if (!includeShadow || backgroundMode === 'transparent') {
    document.body.classList.add('export-no-shadow');
  }
  if (backgroundMode === 'transparent') {
    document.body.classList.add('export-transparent-mode');
  }

  try {
    const blob = await toBlob(viewportElem, {
      backgroundColor: bgColor,
      pixelRatio: scale,
      width: finalWidth,
      height: finalHeight,
      filter: (node: HTMLElement) => {
        if (!node || !node.classList) return true;
        const cl = node.classList;
        if (
          cl.contains('export-hide') ||
          cl.contains('react-flow__controls') ||
          cl.contains('react-flow__minimap') ||
          cl.contains('react-flow__panel') ||
          cl.contains('react-flow__attribution') ||
          cl.contains('react-flow__handle') ||
          cl.contains('table-handle')
        ) {
          return false;
        }
        if (!showGroups && (cl.contains('group-node-container') || node.getAttribute('data-type') === 'groupNode')) {
          return false;
        }
        return true;
      },
      style:
        cropMode === 'all'
          ? {
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              transform: `translate(${-bounds.minX + padding}px, ${-bounds.minY + padding}px) scale(1)`,
              transformOrigin: 'top left',
            }
          : undefined,
    });

    if (!blob) {
      throw new Error('Gagal merender blob gambar');
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } finally {
    document.body.classList.remove('export-clean-mode');
    document.body.classList.remove('hide-groups');
    document.body.classList.remove('export-no-shadow');
    document.body.classList.remove('export-transparent-mode');
    viewportElem.style.transform = originalTransform;
    viewportElem.style.transformOrigin = originalTransformOrigin;
  }
};
