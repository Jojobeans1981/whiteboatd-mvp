import { BoardObject } from '../types';

interface PositionUpdate {
  id: string;
  x: number;
  y: number;
}

function getObjectSize(obj: BoardObject): { w: number; h: number } {
  // Radius-based shapes: circle, triangle, hexagon, star
  if (obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'hexagon' || obj.type === 'star') {
    const d = (obj.radius || 60) * 2;
    return { w: d, h: d };
  }
  // Pen strokes: compute bounding box from points
  if (obj.type === 'pen' && obj.points && obj.points.length >= 2) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < obj.points.length; i += 2) {
      minX = Math.min(minX, obj.points[i]);
      maxX = Math.max(maxX, obj.points[i]);
      minY = Math.min(minY, obj.points[i + 1]);
      maxY = Math.max(maxY, obj.points[i + 1]);
    }
    return { w: maxX - minX || 50, h: maxY - minY || 50 };
  }
  // Line: compute from endpoints
  if (obj.type === 'line' && obj.points && obj.points.length >= 4) {
    return {
      w: Math.abs(obj.points[2] - obj.points[0]) || 150,
      h: Math.abs(obj.points[3] - obj.points[1]) || 20,
    };
  }
  return {
    w: obj.width || 150,
    h: obj.height || 100,
  };
}

// Radius-based shapes are centered at (x,y), so we need to offset when positioning
// to keep them aligned with top-left-based shapes in the grid.
function isCenteredShape(type: string): boolean {
  return type === 'circle' || type === 'triangle' || type === 'hexagon' || type === 'star';
}

export function autoGridLayout(objects: BoardObject[]): PositionUpdate[] {
  const placeable = objects
    .filter((o) => o.type !== 'connector')
    .sort((a, b) => a.createdAt - b.createdAt);

  if (placeable.length === 0) return [];

  const cols = Math.min(6, Math.ceil(Math.sqrt(placeable.length)));
  const startX = 100;
  const startY = 100;
  const gap = 30;

  const results: PositionUpdate[] = [];
  let currentX = startX;
  let currentY = startY;
  let colIndex = 0;
  let rowMaxHeight = 0;

  for (const obj of placeable) {
    const size = getObjectSize(obj);

    if (colIndex >= cols) {
      colIndex = 0;
      currentX = startX;
      currentY += rowMaxHeight + gap;
      rowMaxHeight = 0;
    }

    // Centered shapes (circle, triangle, etc.) need offset so their visual top-left aligns with the grid
    const offsetX = isCenteredShape(obj.type) ? size.w / 2 : 0;
    const offsetY = isCenteredShape(obj.type) ? size.h / 2 : 0;
    results.push({ id: obj.id, x: currentX + offsetX, y: currentY + offsetY });
    currentX += size.w + gap;
    rowMaxHeight = Math.max(rowMaxHeight, size.h);
    colIndex++;
  }

  return results;
}

export function groupByColorLayout(objects: BoardObject[]): PositionUpdate[] {
  const placeable = objects.filter((o) => o.type !== 'connector');
  if (placeable.length === 0) return [];

  const groups = new Map<string, BoardObject[]>();
  for (const obj of placeable) {
    const list = groups.get(obj.color) || [];
    list.push(obj);
    groups.set(obj.color, list);
  }

  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const startX = 100;
  const startY = 100;
  const columnGap = 60;
  const rowGap = 30;

  const results: PositionUpdate[] = [];
  let columnX = startX;

  for (const [, group] of sortedGroups) {
    group.sort((a, b) => a.createdAt - b.createdAt);
    let maxWidth = 0;
    let rowY = startY;

    for (const obj of group) {
      const size = getObjectSize(obj);
      const offsetX = isCenteredShape(obj.type) ? size.w / 2 : 0;
      const offsetY = isCenteredShape(obj.type) ? size.h / 2 : 0;
      results.push({ id: obj.id, x: columnX + offsetX, y: rowY + offsetY });
      rowY += size.h + rowGap;
      maxWidth = Math.max(maxWidth, size.w);
    }

    columnX += maxWidth + columnGap;
  }

  return results;
}
