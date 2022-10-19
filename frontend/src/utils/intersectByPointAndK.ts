export const intersect = (k1: number, screenPoint1: ScreenPoint, k2: number, screenPoint2: ScreenPoint) => {
  // 点斜式 y-y1=kx - kx1
  // kx-y+(y1-kx1)=0
  const a1 = k1
  const b1 = 1
  const c1 = screenPoint1.y - k1 * screenPoint1.x
  const previousLine = { a: a1, b: b1, c: c1 }

  const a2 = k2
  const b2 = 1
  const c2 = screenPoint2.y - k2 * screenPoint2.x
  const currentLine = { a: a2, b: b2, c: c2 }
  const D = previousLine.a * currentLine.b - currentLine.a * previousLine.b
  const intersection = {
    x: (previousLine.b * currentLine.c - currentLine.b * previousLine.c) / D,
    y: -(currentLine.a * previousLine.c - previousLine.a * currentLine.c) / D
  } as ScreenPoint
  return intersection
}
