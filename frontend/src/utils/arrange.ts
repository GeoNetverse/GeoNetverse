import { maxBy, minBy } from 'lodash'
import { distFunc } from './dist'
import { quadraticBezierLengthByRatio, quadraticBezierLength } from './getQuadraticCurvePoint'

export const arrange = (virtualNodes: VirtualNode[], node: ScreenNode, r: number) => {
  const movement = 1
  const iter = 0
  const maxR = (maxBy(virtualNodes, n => n.r) as VirtualNode).r
  const minR = (minBy(virtualNodes, n => n.r) as VirtualNode).r
  // 越大点越不好挪动

  // 把只有一个end的virtualnode延长到node里面
  virtualNodes.forEach(p => {
    // const dist = distFunc(node.x, node.y, p.x, p.y)
    if (p.ends.length === 1) {
      const shift = p.ends[0].tangentShift
      const extention = (r - Math.sqrt(r * r - shift * shift)) + p.r
      const enda = p.ends[0].a

      let dx = Math.abs(Math.cos(enda * Math.PI / 180)) * extention
      let dy = Math.abs(Math.sin(enda * Math.PI / 180)) * extention
      dx = (Math.floor((enda + 90) / 180)) % 2 === 0 ? -dx : dx
      dy = (Math.floor(enda / 180)) % 2 === 0 ? -dy : dy

      p.x = p.ends[0].x + dx
      p.y = p.ends[0].y + dy
    }
  })

  // while (movement >= 1 && iter < 100) {
  //   movement = 0

  //   const positionsDelta = new Array(virtualNodes.length).fill(0).map(n => ({
  //     dx: 0,
  //     dy: 0
  //   }))

  //   virtualNodes.forEach((p, i) => {
  //     // 互不重叠
  //     virtualNodes.forEach((pj, j) => {
  //       if (i !== j) {
  //         const dist = Math.sqrt((p.x - pj.x) * (p.x - pj.x) + (p.y - pj.y) * (p.y - pj.y))
  //         if (dist <= pj.r + p.r) {
  //           const k = (pj.y - p.y) / (pj.x - p.x)
  //           if (isNaN(k)) {
  //             console.log(i, j, p, pj)
  //           }
  //           const a = Math.atan(k)
  //           const dx = Math.abs(Math.cos(a)) * 2
  //           const dy = Math.abs(Math.sin(a)) * 2
  //           // 远离
  //           positionsDelta[i].dx += (pj.x > p.x ? -dx : dx)
  //           positionsDelta[i].dy += (pj.y > p.y ? -dy : dy)
  //         }
  //       }
  //     })
  //   })

  //   // update positions
  //   if (virtualNodes.length > 1) {
  //     virtualNodes.forEach((p, i) => {
  //       if (isNaN(p.x)) {
  //         console.log(p, positionsDelta[i])
  //       }
  //       p.x += positionsDelta[i].dx * (maxR - p.r) / (maxR - minR) + 0.1
  //       p.y += positionsDelta[i].dy * (maxR - p.r) / (maxR - minR) + 0.1
  //       movement += Math.abs(positionsDelta[i].dy)
  //       movement += Math.abs(positionsDelta[i].dx)
  //     })
  //   }
  //   iter += 1
  // }

  // generate path
  virtualNodes.forEach(p => {
    if (p.intersectType && p.intersectType === 'noIntersect') {
      const averageAngle = (p.ends[0].a + p.ends[1].a) / 2 + 90
      const pdx = Math.cos(averageAngle * Math.PI / 180) * Math.min(p.r * 2, 10)
      const pdy = Math.sin(averageAngle * Math.PI / 180) * Math.min(p.r * 2, 10)
      const pc1 = { x: p.x + pdx, y: p.y + pdy }
      const pc2 = { x: p.x - pdx, y: p.y - pdy }
      // 会有两个pc (p的control point)

      p.ends.forEach(end => {
        const enda = end.a
        const dist = Math.sqrt((end.x - p.x) * (end.x - p.x) + (end.y - p.y) * (end.y - p.y))
        let dx = Math.abs(Math.cos(enda * Math.PI / 180)) * dist / 2
        let dy = Math.abs(Math.sin(enda * Math.PI / 180)) * dist / 2
        dx = (Math.floor((enda + 90) / 180)) % 2 === 0 ? -dx : dx
        dy = (Math.floor(enda / 180)) % 2 === 0 ? -dy : dy
        const c = { x: end.x + dx, y: end.y + dy }

        if (end.a !== p.ends[0].a && end.a !== p.ends[1].a) { // 不是valid的
          p.paths.push({
            w: end.w,
            d: `M ${p.x} ${p.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`,
            gid: p.gid
          })
        } else { // 处理valid的
          const pc1Dist = distFunc(pc1.x, pc1.y, end.x, end.y)
          const pc2Dist = distFunc(pc2.x, pc2.y, end.x, end.y)
          const pc = pc1Dist < pc2Dist ? pc1 : pc2
          p.paths.push({
            w: end.w,
            d: `M ${p.x} ${p.y} C ${pc.x} ${pc.y} ${c.x} ${c.y} ${end.x} ${end.y}`,
            gid: p.gid
          })
        }
      })
    } else if (p.intersectType && p.intersectType === 'intersect' && p.intersection) {
      const end0 = p.ends[0]
      const end1 = p.ends[1]
      const intersection = p.intersection as ScreenPoint
      const qbLength = quadraticBezierLength(end0.x, end0.y, intersection.x, intersection.y, end1.x, end1.y)
      const qbLengthHalf = quadraticBezierLengthByRatio(end0.x, end0.y, intersection.x, intersection.y, end1.x, end1.y, 0.5)

      p.paths.push({
        w: end0.w,
        d: `M ${end0.x} ${end0.y} Q ${intersection.x} ${intersection.y} ${end1.x} ${end1.y}`,
        gid: p.gid,
        dashArray: `${qbLengthHalf} ${qbLength - qbLengthHalf}`
      })
      p.paths.push({
        w: end1.w,
        d: `M ${end1.x} ${end1.y} Q ${intersection.x} ${intersection.y} ${end0.x} ${end0.y}`,
        gid: p.gid,
        dashArray: `${qbLength - qbLengthHalf} ${qbLengthHalf}`
      })

      if (p.ends.length > 2) { // 把剩下的push进去p.paths里
        for (let endi = 2; endi < p.ends.length; endi += 1) {
          const end = p.ends[endi]
          const enda = end.a
          const dist = Math.sqrt((end.x - p.x) * (end.x - p.x) + (end.y - p.y) * (end.y - p.y))
          let dx = Math.abs(Math.cos(enda * Math.PI / 180)) * 2 * dist / 5
          let dy = Math.abs(Math.sin(enda * Math.PI / 180)) * 2 * dist / 5
          dx = (Math.floor((enda + 90) / 180)) % 2 === 0 ? -dx : dx
          dy = (Math.floor(enda / 180)) % 2 === 0 ? -dy : dy
          const c = { x: end.x + dx, y: end.y + dy }
          p.paths.push({
            w: end.w,
            d: `M ${p.x} ${p.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`,
            gid: p.gid
          })
        }
      }
    } else {
      p.ends.forEach(end => {
        const enda = end.a
        const dist = Math.sqrt((end.x - p.x) * (end.x - p.x) + (end.y - p.y) * (end.y - p.y))
        let dx = Math.abs(Math.cos(enda * Math.PI / 180)) * 2 * dist / 5
        let dy = Math.abs(Math.sin(enda * Math.PI / 180)) * 2 * dist / 5
        dx = (Math.floor((enda + 90) / 180)) % 2 === 0 ? -dx : dx
        dy = (Math.floor(enda / 180)) % 2 === 0 ? -dy : dy
        const c = { x: end.x + dx, y: end.y + dy }
        p.paths.push({
          w: end.w,
          d: `M ${p.x} ${p.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`,
          gid: p.gid
        })
      })
    }
  })

  return virtualNodes
}
