import { clamp, degreesToRadians, radiansToDegrees, roundNumber } from "../../utils/common.js";

// -----------------------------------------------------------------------------
// BLOQUE 1. Geometria del plano
// Esta parte hace el trabajo de matematicas. Aqui se decide si una estancia
// contiene un punto, cuanto mide un muro o como se dibuja una puerta.
// -----------------------------------------------------------------------------

export function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getPolygonArea(points) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

export function getRoomArea(points) {
  return Math.abs(getPolygonArea(points)) / 10000;
}

export function getPolygonCentroid(points) {
  const area = getPolygonArea(points) || 1;
  let x = 0;
  let y = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const factor = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * factor;
    y += (current.y + next.y) * factor;
  }

  return {
    x: x / (6 * area),
    y: y / (6 * area),
  };
}

export function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function getWallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) / 100;
}

export function projectPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (!lengthSq) {
    return {
      x: x1,
      y: y1,
      distance: Math.hypot(px - x1, py - y1),
    };
  }

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  const x = x1 + t * dx;
  const y = y1 + t * dy;

  return {
    x,
    y,
    distance: Math.hypot(px - x, py - y),
  };
}

export function getNearestWall(point, walls) {
  let best = null;

  walls.forEach((wall) => {
    const projection = projectPointToSegment(point.x, point.y, wall.x1, wall.y1, wall.x2, wall.y2);
    if (!best || projection.distance < best.distance) {
      best = {
        wall,
        point: { x: roundNumber(projection.x), y: roundNumber(projection.y) },
        distance: projection.distance,
        angle: roundNumber(radiansToDegrees(Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1))),
      };
    }
  });

  return best;
}

export function getOpeningVector(angle, length) {
  const radians = degreesToRadians(angle);
  return {
    x: roundNumber(Math.cos(radians) * length),
    y: roundNumber(Math.sin(radians) * length),
  };
}

export function getDoorGeometry(opening) {
  const half = opening.width / 2;
  const wallVector = getOpeningVector(opening.angle, half);
  const normalAngle = opening.angle + 90 * (opening.swing || 1);
  const normalVector = getOpeningVector(normalAngle, opening.width);
  const start = { x: opening.x - wallVector.x, y: opening.y - wallVector.y };
  const end = { x: opening.x + wallVector.x, y: opening.y + wallVector.y };
  const hinge = Number(opening.swing || 1) === -1 ? end : start;
  const closedLeafEnd = Number(opening.swing || 1) === -1 ? start : end;
  const leaf = { x: hinge.x + normalVector.x, y: hinge.y + normalVector.y };
  const sweep = Number(opening.swing || 1) === 1 ? 1 : 0;

  return {
    hinge,
    leaf,
    arc: `M ${roundNumber(closedLeafEnd.x)} ${roundNumber(closedLeafEnd.y)} A ${opening.width} ${opening.width} 0 0 ${sweep} ${roundNumber(leaf.x)} ${roundNumber(leaf.y)}`,
  };
}

export function getOrthogonalPoint(start, point) {
  const dx = point.x - start.x;
  const dy = point.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: point.x,
      y: start.y,
    };
  }

  return {
    x: start.x,
    y: point.y,
  };
}
