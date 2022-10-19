const getQBezierValue = (t: number, p1: number, p2: number, p3: number) => {
  const iT = 1 - t
  return iT * iT * p1 + 2 * iT * t * p2 + t * t * p3
}

export const getQuadraticCurvePoint = (startX: number, startY: number, cpX: number, cpY: number, endX: number, endY: number, position: number) => {
  return {
    x: getQBezierValue(position, startX, cpX, endX),
    y: getQBezierValue(position, startY, cpY, endY)
  }
}

export const quadraticBezierLength = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
) => {
  const p0 = { x: x1, y: y1 }
  const p1 = { x: x2, y: y2 }
  const p2 = { x: x3, y: y3 }

  const ax = p0.x - 2 * p1.x + p2.x
  const ay = p0.y - 2 * p1.y + p2.y
  const bx = 2 * p1.x - 2 * p0.x
  const by = 2 * p1.y - 2 * p0.y
  const A = 4 * (ax * ax + ay * ay)
  const B = 4 * (ax * bx + ay * by)
  const C = bx * bx + by * by

  const Sabc = 2 * Math.sqrt(A + B + C)
  const A_2 = Math.sqrt(A)
  const A_32 = 2 * A * A_2
  const C_2 = 2 * Math.sqrt(C)
  const BA = B / A_2

  return (A_32 * Sabc + A_2 * B * (Sabc - C_2) + (4 * C * A - B * B) * Math.log((2 * A_2 + BA + Sabc) / (BA + C_2))) / (4 * A_32)
}

export const quadraticBezierLengthByRatio = (
  x1: number,
  y1: number, // P_0
  x2: number,
  y2: number, // P_1
  x3: number,
  y3: number, // P_2
  t: number
) => {
  // a_x = P_0.x - 2 P_1.x + P_2.x
  // b = 2P_1 - 2 P_0
  const ax = x1 - 2 * x2 + x3
  const ay = y1 - 2 * y2 + y3
  const bx = 2 * x2 - 2 * x1
  const by = 2 * y2 - 2 * y1
  const A = 4 * (ax * ax + ay * ay)
  // B=4(a_x b_x + a_y b_y)
  const B = 4 * (ax * bx + ay * by)
  // C=b_x^2+b_y^2
  const C = bx * bx + by * by
  const b = B / (2 * A)
  const u = t + b
  const c = C / A
  const k = c - b * b
  const L = Math.sqrt(A) * (u * Math.sqrt(u * u + k) - b * Math.sqrt(b * b + k) + k * Math.log((u + Math.sqrt(u * u + k)) / (b + Math.sqrt(b * b + k)))) / 2
  return L
}
