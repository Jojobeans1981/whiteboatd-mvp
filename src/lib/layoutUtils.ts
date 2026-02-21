import { BoardObject } from '../types';

interface PositionUpdate {
  id: string;
  x: number;
  y: number;
}

function getObjectSize(obj: BoardObject): { w: number; h: number } {
  if (obj.type === 'circle') {
    const d = (obj.radius || 60) * 2;
    return { w: d, h: d };
  }
  return {
    w: obj.width || 150,
    h: obj.height || 100,
  };
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

    results.push({ id: obj.id, x: currentX, y: currentY });
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
      results.push({ id: obj.id, x: columnX, y: rowY });
      rowY += size.h + rowGap;
      maxWidth = Math.max(maxWidth, size.w);
    }

    columnX += maxWidth + columnGap;
  }

  return results;
}
