import polygonClipping from 'polygon-clipping';
import { BoardObject } from '../types';

type Ring = [number, number][];
type Polygon = Ring[];

function shapeToPolygon(obj: BoardObject): Polygon | null {
  if (obj.type === 'rectangle' || obj.type === 'sticky' || obj.type === 'frame') {
    const w = obj.width || 150;
    const h = obj.height || 100;
    const ring: Ring = [
      [obj.x, obj.y],
      [obj.x + w, obj.y],
      [obj.x + w, obj.y + h],
      [obj.x, obj.y + h],
      [obj.x, obj.y],
    ];
    return [ring];
  }

  if (obj.type === 'circle') {
    const cx = obj.x;
    const cy = obj.y;
    const r = obj.radius || 60;
    const ring: Ring = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (2 * Math.PI * i) / 32;
      ring.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return [ring];
  }

  if (obj.type === 'triangle') {
    const cx = obj.x;
    const cy = obj.y;
    const r = obj.radius || 60;
    const ring: Ring = [];
    for (let i = 0; i <= 3; i++) {
      const angle = (2 * Math.PI * i) / 3 - Math.PI / 2;
      ring.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return [ring];
  }

  if (obj.type === 'hexagon') {
    const cx = obj.x;
    const cy = obj.y;
    const r = obj.radius || 60;
    const ring: Ring = [];
    for (let i = 0; i <= 6; i++) {
      const angle = (2 * Math.PI * i) / 6 - Math.PI / 2;
      ring.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return [ring];
  }

  if (obj.type === 'star') {
    const cx = obj.x;
    const cy = obj.y;
    const outer = obj.radius || 60;
    const inner = outer * 0.4;
    const ring: Ring = [];
    for (let i = 0; i <= 10; i++) {
      const angle = (2 * Math.PI * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      ring.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return [ring];
  }

  if (obj.type === 'diamond') {
    const w = obj.width || 100;
    const h = obj.height || 140;
    const ring: Ring = [
      [obj.x + w / 2, obj.y],
      [obj.x + w, obj.y + h / 2],
      [obj.x + w / 2, obj.y + h],
      [obj.x, obj.y + h / 2],
      [obj.x + w / 2, obj.y],
    ];
    return [ring];
  }

  return null;
}

export function computeBoolean(
  a: BoardObject,
  b: BoardObject,
  operation: 'union' | 'subtract' | 'intersect'
): number[] | null {
  const polyA = shapeToPolygon(a);
  const polyB = shapeToPolygon(b);
  if (!polyA || !polyB) return null;

  let result: polygonClipping.MultiPolygon;
  if (operation === 'union') {
    result = polygonClipping.union([polyA], [polyB]);
  } else if (operation === 'subtract') {
    result = polygonClipping.difference([polyA], [polyB]);
  } else {
    result = polygonClipping.intersection([polyA], [polyB]);
  }

  if (!result || result.length === 0 || result[0].length === 0) return null;

  // Take the first polygon's exterior ring and flatten to [x0,y0,x1,y1,...]
  const ring = result[0][0];
  const flat: number[] = [];
  for (const [x, y] of ring) {
    flat.push(x, y);
  }
  return flat;
}
