import { intersect } from './intersectByPointAndK'
const dist = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
}

interface ControlPoint {
  x: number, y: number, dist: number, dx: number, dy: number
}

export const generatePath = (curveParameters: CurveParameter[], node: ScreenNode, r: number, screenNodeIndex: {[nid: string]: ScreenNode}) => {
  const extension = 0.55
  // const startPoint = curveParameters[0]
  // console.log(curveParameters)
  const controlPointsWithDist: ControlPoint[] = new Array(curveParameters.length).fill(0).map(v => ({ x: 0, y: 0, dist: -1, dx: 0, dy: 0 }))
  const curveStyles: string[] = []
  let str = ''
  curveParameters.forEach((currentPoint, i) => {
    if (i === 0) {
      curveStyles.push('M')
      // str = str + `M ${currentPoint.x} ${currentPoint.y} `
    } else if (i % 2 === 1) { // 用直线
      curveStyles.push('L')
      // str = str + `L ${currentPoint.x} ${currentPoint.y} `
    } else { // 用光滑曲线
      // 表征直线方程
      const previousPoint = curveParameters[i - 1]
      const intersection = intersect(previousPoint.k, previousPoint, currentPoint.k, currentPoint)

      // 判断两根线的交点在不在圆里
      const Q = dist(intersection.x, intersection.y, node.x, node.y) < (r * 0.98)
      const dist3 = dist(intersection.x, intersection.y, previousPoint.x, previousPoint.y)
      const dist4 = dist(intersection.x, intersection.y, currentPoint.x, currentPoint.y)

      if (Q && dist4 < extension * r && dist3 < extension * r) { // 交点在圆里
        // 用Q x1 y1, x y // 大写是绝对坐标，小写是相对坐标
        updateControlPoints(curveParameters, i, controlPointsWithDist, intersection, intersection, dist3, dist4)
        curveStyles.push('Q')
      } else {
        // const neighborNodeOfPreviousPoint = screenNodeIndex[previousPoint.nnid]
        // const dx1Sign = neighborNodeOfPreviousPoint.x > node.x ? -1 : 1
        // const dy1Sign = neighborNodeOfPreviousPoint.y > node.y ? -1 : 1
        const dy1Sign = Math.floor(previousPoint.angle / 180) % 2 === 0 ? -1 : 1
        const dx1Sign = (Math.floor((previousPoint.angle + 90) / 180)) % 2 === 0 ? -1 : 1
        // const angle1 = Math.atan(previousPoint.k)
        const angle1 = previousPoint.angle * Math.PI / 180
        const dx1 = Math.abs(Math.cos(angle1)) * extension * r * dx1Sign
        const dy1 = Math.abs(Math.sin(angle1)) * extension * r * dy1Sign
        const controlPoint1 = { x: dx1 + previousPoint.x, y: dy1 + previousPoint.y }

        // controlPoint2 is extended from current point
        // const neighborNodeOfCurrentPoint = screenNodeIndex[currentPoint.nnid]
        const dy2Sign = Math.floor(currentPoint.angle / 180) % 2 === 0 ? -1 : 1
        const dx2Sign = (Math.floor((currentPoint.angle + 90) / 180)) % 2 === 0 ? -1 : 1
        // const dy2Sign = neighborNodeOfCurrentPoint.y > node.y ? -1 : 1
        // const dx2Sign = neighborNodeOfCurrentPoint.x > node.x ? -1 : 1
        const angle2 = currentPoint.angle * Math.PI / 180
        // const angle2 = Math.atan(currentPoint.k)
        const dx2 = Math.abs(Math.cos(angle2)) * extension * r * dx2Sign
        const dy2 = Math.abs(Math.sin(angle2)) * extension * r * dy2Sign
        const controlPoint2 = { x: dx2 + currentPoint.x, y: dy2 + currentPoint.y }

        const dist1 = dist(controlPoint1.x, controlPoint1.y, previousPoint.x, previousPoint.y)
        const dist2 = dist(controlPoint2.x, controlPoint2.y, currentPoint.x, currentPoint.y)
        // controlPointsWithDist[i] = { ...controlPoint2, dist: dist2 }
        // controlPointsWithDist[i - 1] = { ...controlPoint1, dist: dist1 }

        updateControlPoints(curveParameters, i, controlPointsWithDist, controlPoint1, controlPoint2, dist1, dist2)
        curveStyles.push('C')
      }
    }
  })

  const l = controlPointsWithDist.length
  if (controlPointsWithDist[1].dist < controlPointsWithDist[l - 1].dist) {
    controlPointsWithDist[l - 1] = {
      x: curveParameters[l - 1].x + controlPointsWithDist[1].dx,
      y: curveParameters[l - 1].y + controlPointsWithDist[1].dy,
      dist: controlPointsWithDist[1].dist,
      dx: controlPointsWithDist[1].dx,
      dy: controlPointsWithDist[1].dy
    }
  } else {
    controlPointsWithDist[1] = {
      x: curveParameters[1].x + controlPointsWithDist[l - 1].dx,
      y: curveParameters[1].y + controlPointsWithDist[l - 1].dy,
      dist: controlPointsWithDist[l - 1].dist,
      dx: controlPointsWithDist[l - 1].dx,
      dy: controlPointsWithDist[l - 1].dy
    }
  }

  curveParameters.forEach((currentPoint, i) => {
    if (curveStyles[i] === 'C') {
      str = str + `C ${controlPointsWithDist[i - 1].x} ${controlPointsWithDist[i - 1].y}, ${controlPointsWithDist[i].x} ${controlPointsWithDist[i].y}, ${currentPoint.x} ${currentPoint.y} `
    } else if (curveStyles[i] === 'Q') {
      str = str + `Q ${controlPointsWithDist[i].x} ${controlPointsWithDist[i].y} ${currentPoint.x} ${currentPoint.y} `
    } else if (curveStyles[i] === 'L') {
      str = str + `L ${currentPoint.x} ${currentPoint.y} `
    } else { // M
      str = str + `M ${currentPoint.x} ${currentPoint.y} `
    }
  })

  str = str + 'Z'
  return {
    str,
    controlPointsWithDist
  }
}

const updateControlPoints = (curveParameters: CurveParameter[], i: number, controlPointsWithDist: ControlPoint[], controlPoint1: { x: number, y: number}, controlPoint2: { x: number, y: number}, previousDist: number, currentDist: number) => {
  const previousPoint = curveParameters[i - 1]
  const currentPoint = curveParameters[i]
  controlPointsWithDist[i] = {
    ...controlPoint2,
    dist: currentDist,
    dx: controlPoint2.x - currentPoint.x,
    dy: controlPoint2.y - currentPoint.y
  }
  if (controlPointsWithDist[i - 2].dist < previousDist && controlPointsWithDist[i - 2].dist >= 0) {
    controlPointsWithDist[i - 1] = {
      x: previousPoint.x + controlPointsWithDist[i - 2].dx,
      y: previousPoint.y + controlPointsWithDist[i - 2].dy,
      dist: controlPointsWithDist[i - 2].dist,
      dx: controlPointsWithDist[i - 2].dx,
      dy: controlPointsWithDist[i - 2].dy
    }
  } else {
    controlPointsWithDist[i - 1] = { // 更新两个
      x: controlPoint1.x,
      y: controlPoint1.y,
      dist: previousDist,
      dx: controlPoint1.x - previousPoint.x,
      dy: controlPoint1.y - previousPoint.y
    }
    controlPointsWithDist[i - 2] = { // 更新两个
      x: curveParameters[i - 2].x + controlPointsWithDist[i - 1].dx,
      y: curveParameters[i - 2].y + controlPointsWithDist[i - 1].dy,
      dist: previousDist,
      dx: controlPointsWithDist[i - 1].dx,
      dy: controlPointsWithDist[i - 1].dy
    }
  }
}
