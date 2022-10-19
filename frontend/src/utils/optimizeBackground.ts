import { intersect } from './intersectByPointAndK'
import { globalScale } from './globalScale'
import { cloneDeep } from 'lodash'

export const optimizeBackground = (screenNodeIndex: {[nid: string]: ScreenNode}, background: Background, zoom: number) => {
  const underlyingNodeDict: {[nid: string]: {[eKey: string]: UnderlyingEdgeInNode}} = {}
  // 对边排序，最粗的边开始
  const edges: {eKey: string, w: number}[] = []
  for (const eKey in background.edgeSizeDict) {
    const w = background.edgeSizeDict[eKey]
    edges.push({ eKey, w })
  }
  edges.sort((a, b) => b.w - a.w)

  for (const { eKey, w } of edges) {
    const width = globalScale(w, zoom)
    const [unid, vnid] = eKey.split('_')
    const uNode = screenNodeIndex[unid]
    const vNode = screenNodeIndex[vnid]
    const k = (uNode.y - vNode.y) / (uNode.x - vNode.x)

    let revisedAngleForV = 0
    // 角度正右方为0 y轴向上, 逆时针增长
    // 先算u
    const ru = globalScale(background.nodeSizeDict[unid], zoom) / 2
    const halfAngleU = Math.abs(Math.asin(width / 2 / ru)) * 180 / Math.PI

    let edgeAngleU = Math.atan(k) * 180 / Math.PI
    if (k > 0 && vNode.y > uNode.y) {
      edgeAngleU = edgeAngleU * 1
    } else if (k > 0 && vNode.y < uNode.y) {
      edgeAngleU = edgeAngleU - 180
    } else if (k < 0 && vNode.y > uNode.y) {
      edgeAngleU = edgeAngleU - 180
    } else if (k < 0 && vNode.y < uNode.y) {
      edgeAngleU = edgeAngleU * 1
    } else {
      console.log('warning')
    }
    const edgeAngleRangeU = [edgeAngleU - halfAngleU, edgeAngleU + halfAngleU] as [number, number]

    let revisedU = false
    if (unid in underlyingNodeDict) {
      for (const otherEKey in underlyingNodeDict[unid]) {
        if (otherEKey === eKey) {
          continue
        }
        const otherAngleRange = underlyingNodeDict[unid][otherEKey].range
        if (isOverlap(otherAngleRange, edgeAngleRangeU)) { // 如果重叠，挪动
          revisedU = true
          // 往靠近的挪

          if (isCloseToLower(edgeAngleU, otherAngleRange)) { // 更加靠近otherAngleRange[0]
            const newEdgeAngle = otherAngleRange[0] - halfAngleU
            const newAngleRange = [newEdgeAngle - halfAngleU, otherAngleRange[0]] as [number, number]
            underlyingNodeDict[unid][eKey] = {
              range: newAngleRange,
              angle: edgeAngleU,
              newAngle: newEdgeAngle,
              nid: unid,
              eKey
            }
          } else { // 更加靠近otherAngleRange[1]
            const newEdgeAngle = otherAngleRange[1] + halfAngleU
            const newAngleRange = [otherAngleRange[1], newEdgeAngle + halfAngleU] as [number, number]
            underlyingNodeDict[unid][eKey] = {
              range: newAngleRange,
              angle: edgeAngleU,
              newAngle: newEdgeAngle,
              nid: unid,
              eKey
            }
          }
          revisedAngleForV = underlyingNodeDict[unid][eKey].newAngle - underlyingNodeDict[unid][eKey].angle
        }
      }
      if (!revisedU) {
        underlyingNodeDict[unid][eKey] = {
          range: edgeAngleRangeU,
          angle: edgeAngleU,
          newAngle: edgeAngleU,
          nid: unid,
          eKey
        }
      }
    } else {
      underlyingNodeDict[unid] = {}
      underlyingNodeDict[unid][eKey] = {
        range: edgeAngleRangeU,
        angle: edgeAngleU,
        newAngle: edgeAngleU,
        nid: unid,
        eKey
      }
    }

    // v
    // const rv = background.nodeSizeDict[vnid]
    const rv = globalScale(background.nodeSizeDict[vnid], zoom) / 2
    const halfAngleV = Math.abs(Math.asin(width / 2 / rv)) * 180 / Math.PI
    let edgeAngleV = Math.atan(k) * 180 / Math.PI
    if (k > 0 && uNode.y > vNode.y) {
      edgeAngleV = edgeAngleV * 1
    } else if (k > 0 && uNode.y < vNode.y) {
      edgeAngleV = edgeAngleV - 180
    } else if (k < 0 && uNode.y > vNode.y) {
      edgeAngleV = edgeAngleV - 180
    } else if (k < 0 && uNode.y < vNode.y) {
      edgeAngleV = edgeAngleV * 1
    } else {
      console.log('warning')
    }
    edgeAngleV = edgeAngleV - revisedAngleForV
    const edgeAngleRangeV = [edgeAngleV - halfAngleV, edgeAngleV + halfAngleV] as [number, number]

    let revisedV = false
    if (vnid in underlyingNodeDict) {
      for (const otherEKey in underlyingNodeDict[vnid]) {
        if (otherEKey === eKey) {
          continue
        }
        const otherAngleRange = underlyingNodeDict[vnid][otherEKey].range
        if (isOverlap(otherAngleRange, edgeAngleRangeV)) { // 如果重叠，挪动
          revisedV = true
          if (isCloseToLower(edgeAngleV, otherAngleRange)) { // 往小的挪
            const newEdgeAngle = otherAngleRange[0] - halfAngleV
            const newAngleRange = [newEdgeAngle - halfAngleV, otherAngleRange[0]] as [number, number]
            underlyingNodeDict[vnid][eKey] = {
              range: newAngleRange,
              angle: edgeAngleV,
              newAngle: newEdgeAngle
            }
          } else { // 往大的挪
            const newEdgeAngle = otherAngleRange[1] + halfAngleV
            const newAngleRange = [otherAngleRange[1], newEdgeAngle + halfAngleV] as [number, number]
            underlyingNodeDict[vnid][eKey] = {
              range: newAngleRange,
              angle: edgeAngleV + revisedAngleForV,
              newAngle: newEdgeAngle
            }
          }
        }
      }
      if (!revisedV) {
        underlyingNodeDict[vnid][eKey] = {
          range: edgeAngleRangeV,
          angle: edgeAngleV,
          newAngle: edgeAngleV
        }
      }
    } else {
      underlyingNodeDict[vnid] = {}
      underlyingNodeDict[vnid][eKey] = {
        range: edgeAngleRangeV,
        angle: edgeAngleV + revisedAngleForV,
        newAngle: edgeAngleV
      }
    }

    // 如果两个都没改，万事大吉
    // 如果改了u，v也会改
    // 如果u没改，v改了，回去把u改一下
    if (underlyingNodeDict[vnid][eKey].newAngle !== underlyingNodeDict[vnid][eKey].angle && underlyingNodeDict[unid][eKey].newAngle === underlyingNodeDict[unid][eKey].angle) {
      // 改变u
      const revisedAngleForU = underlyingNodeDict[vnid][eKey].newAngle - underlyingNodeDict[vnid][eKey].angle
      let edgeAngleRangeU = cloneDeep(underlyingNodeDict[unid][eKey].range)
      edgeAngleRangeU[0] -= revisedAngleForU
      edgeAngleRangeU[1] -= revisedAngleForU
      let edgeAngleU = underlyingNodeDict[unid][eKey].angle - revisedAngleForU

      // 判断重叠
      for (const otherEKey in underlyingNodeDict[unid]) {
        if (otherEKey === eKey) {
          continue
        }
        const otherAngleRange = underlyingNodeDict[unid][otherEKey].range
        if (isOverlap(otherAngleRange, edgeAngleRangeU)) { // 如果重叠，挪动
          // console.log(edgeAngleU, cloneDeep(edgeAngleRangeU), otherAngleRange)
          if (isCloseToLower(edgeAngleU, otherAngleRange)) { // 往小的挪
            edgeAngleU = otherAngleRange[0] - halfAngleU
            edgeAngleRangeU = [edgeAngleU - halfAngleU, otherAngleRange[0]] as [number, number]
          } else { // 往大的挪
            edgeAngleU = otherAngleRange[1] + halfAngleU
            edgeAngleRangeU = [otherAngleRange[1], edgeAngleU + halfAngleU] as [number, number]
          }
        }
      }
      underlyingNodeDict[unid][eKey].range = edgeAngleRangeU
      underlyingNodeDict[unid][eKey].newAngle = edgeAngleU
      revisedAngleForV = underlyingNodeDict[unid][eKey].angle - underlyingNodeDict[unid][eKey].newAngle
    }
  }

  // 上面是inital placement
  // 下面是opt
  // 对每个节点再内部检查一遍
  for (const nid in screenNodeIndex) {
    const underlyingEdgesInNode = underlyingNodeDict[nid]
    let shouldRevisited = false
    const shouldRevisitedEdges: Set<string> = new Set()
    for (const eKeyI in underlyingEdgesInNode) {
      const ei = underlyingEdgesInNode[eKeyI]
      for (const eKeyJ in underlyingEdgesInNode) {
        if (eKeyJ === eKeyI) {
          continue
        }
        const ej = underlyingEdgesInNode[eKeyJ]
        if (isOverlap(ei.range, ej.range)) {
          shouldRevisited = true
          shouldRevisitedEdges.add(eKeyJ)
          shouldRevisitedEdges.add(eKeyI)
        }
      }
    }

    if (shouldRevisited) { // 需要修改
      console.log(nid, '需要修改！！！', shouldRevisitedEdges)
      // 从一个范围开始，如果隔壁的间距小于我的范围，列为危险，加入要优化的范围里
      const angleParams: AngleParam[] = []
      for (const eKey in underlyingEdgesInNode) {
        angleParams.push({
          ...underlyingEdgesInNode[eKey],
          eKey,
          nid
        })
      }
      for (const angleParam of angleParams) {
        const range = angleParam.range
        const l = (range[0] + 720) % 360
        let r = (range[1] + 720) % 360
        if (r < l) {
          r += 360
        }
        angleParam.range = [l, r]
        angleParam.angle = (angleParam.angle + 720) % 360
        angleParam.newAngle = (angleParam.newAngle + 720) % 360
      }
      angleParams.sort((a, b) => a.newAngle - b.newAngle)
      angleParams.push(angleParams[0]) // 为了下面的聚类首位相连

      let angleParamsToBeOpt: AngleParam[] = [angleParams[0]]
      for (let i = 1; i < angleParams.length; i += 1) {
        const prev = angleParamsToBeOpt[angleParamsToBeOpt.length - 1]
        const rPrev = prev.range[1] - prev.range[0]
        const cur = angleParams[i]
        const rCur = cur.range[1] - cur.range[0]

        if ((cur.range[0] - prev.range[1]) < Math.max(rPrev, rCur)) {
          angleParamsToBeOpt.push(cur)
        } else if (angleParamsToBeOpt.length > 1) {
          let problematic = false
          for (const angleParam of angleParamsToBeOpt) {
            if (shouldRevisitedEdges.has(angleParam.eKey)) {
              problematic = true
              break
            }
          }
          if (!problematic) {
            angleParamsToBeOpt = [cur]
            continue
          }

          // 优化angleParamsToBeOpt
          const n = angleParamsToBeOpt.length
          const cover = angleParamsToBeOpt[n - 1].range[1] - angleParamsToBeOpt[0].range[0]
          let l = angleParamsToBeOpt[0].range[0]
          let r = angleParamsToBeOpt.reduce((sum, cur) => sum + cur.range[1] - cur.range[0], l)
          const shift = (cover - (r - l)) / 2
          l += shift
          r += shift

          let unSafe = true
          let iter = 0
          while (unSafe && iter < 10) {
            unSafe = false
            // 根据l r 反推angle
            let acc = l

            for (const angleParam of angleParamsToBeOpt) {
              const newAngle = acc + (angleParam.range[1] - angleParam.range[0]) / 2
              const revision = newAngle - angleParam.angle

              const nnid = angleParam.eKey.split('_').filter(id => id !== nid)[0]
              const opposite = obtainSortedAngleParams(underlyingNodeDict, nnid)
              opposite.forEach((oppositiAngleParam, j) => { // 首尾是一样的
                if (oppositiAngleParam.eKey === angleParam.eKey) {
                  if (revision > 0) { // 当前的增加了，你应该减，也就是你的上一个离你还有至少3个角度的空隙，如果没有，则不安全，进行下一个while
                    const prevIndex = j - 1 < 0 ? opposite.length - 2 : j - 1
                    if ((opposite[prevIndex].range[1] + 5 > oppositiAngleParam.range[0] && opposite[prevIndex].range[1] < oppositiAngleParam.range[0])) {
                      unSafe = true
                    }
                    if ((opposite[prevIndex].range[1] + 5 - 360 > oppositiAngleParam.range[0] && opposite[prevIndex].range[1] > oppositiAngleParam.range[0])) {
                      unSafe = true
                    }
                  } else {
                    const nextIndex = j + 1 >= opposite.length ? 1 : j + 1
                    if ((opposite[nextIndex].range[0] - 5 < oppositiAngleParam.range[1]) && (opposite[nextIndex].range[0] > oppositiAngleParam.range[1])) {
                      unSafe = true
                    }
                    if ((opposite[nextIndex].range[0] - 5 + 360 < oppositiAngleParam.range[1]) && (opposite[nextIndex].range[0] < oppositiAngleParam.range[1])) {
                      unSafe = true
                    }
                  }
                }
              })
              acc = angleParam.range[1]
              if (unSafe) { // 如果有一个不安全，那其他都不用试了
                break
              }
            }

            if (!unSafe) { // 如果不是不安全，更新，更新完就while循环也就结束了
              console.log('332 updating', l, iter)
              acc = l
              for (const angleParam of angleParamsToBeOpt) {
                const eKey = angleParam.eKey
                const newAngle = acc + (angleParam.range[1] - angleParam.range[0]) / 2
                // 更新
                underlyingNodeDict[angleParam.nid][eKey].newAngle = newAngle
                underlyingNodeDict[angleParam.nid][eKey].range = [acc, acc + angleParam.range[1] - angleParam.range[0]]

                const revision = newAngle - angleParam.angle
                const nnid = eKey.split('_').filter(id => id !== nid)[0]
                const opposite = obtainSortedAngleParams(underlyingNodeDict, nnid)
                opposite.forEach((oppositiAngleParam, j) => {
                  if (oppositiAngleParam.eKey === eKey) {
                    if (revision > 0) { // 当前的增加了，你应该减，也就是你的上一个离你还有至少3个角度的空隙，如果没有，则不安全，进行下一个while
                      const prevIndex = j - 1 < 0 ? opposite.length - 2 : j - 1
                      let validSpace = 0
                      if (opposite[prevIndex].range[1] < oppositiAngleParam.range[0]) {
                        validSpace = oppositiAngleParam.range[0] - opposite[prevIndex].range[1]
                      } else if (opposite[prevIndex].range[1] > oppositiAngleParam.range[0]) {
                        validSpace = 360 + oppositiAngleParam.range[0] - opposite[prevIndex].range[1]
                      } else {
                        console.log('warning')
                      }
                      const currentRevision = Math.min(validSpace, revision)
                      const oppositeCover = oppositiAngleParam.range[1] - oppositiAngleParam.range[0]

                      // 更新
                      underlyingNodeDict[nnid][eKey].newAngle = underlyingNodeDict[nnid][eKey].angle - currentRevision
                      underlyingNodeDict[nnid][eKey].range = [underlyingNodeDict[nnid][eKey].newAngle - oppositeCover / 2, underlyingNodeDict[nnid][eKey].newAngle + oppositeCover / 2]
                    } else {
                      const nextIndex = j + 1 >= opposite.length ? 1 : j + 1

                      if ((opposite[nextIndex].range[0] - 5 < oppositiAngleParam.range[1]) && (opposite[nextIndex].range[0] > oppositiAngleParam.range[1])) {
                        unSafe = true
                      }
                      if ((opposite[nextIndex].range[0] - 5 + 360 < oppositiAngleParam.range[1]) && (opposite[nextIndex].range[0] < oppositiAngleParam.range[1])) {
                        unSafe = true
                      }

                      let validSpace = 0
                      if (opposite[nextIndex].range[0] > oppositiAngleParam.range[1]) {
                        validSpace = opposite[nextIndex].range[0] - oppositiAngleParam.range[1]
                      } else if (opposite[nextIndex].range[0] < oppositiAngleParam.range[1]) {
                        validSpace = 360 + opposite[nextIndex].range[0] - oppositiAngleParam.range[1]
                      } else {
                        console.log('warning')
                      }
                      const currentRevision = Math.min(validSpace, -revision)

                      const oppositeCover = oppositiAngleParam.range[1] - oppositiAngleParam.range[0]

                      // 更新
                      underlyingNodeDict[nnid][eKey].newAngle = underlyingNodeDict[nnid][eKey].angle + currentRevision
                      underlyingNodeDict[nnid][eKey].range = [underlyingNodeDict[nnid][eKey].newAngle - oppositeCover / 2, underlyingNodeDict[nnid][eKey].newAngle + oppositeCover / 2]
                    }
                  }
                })
                acc = underlyingNodeDict[angleParam.nid][eKey].range[1]
              }
            }

            l += (iter % 2 === 1 ? 1 : -1) * iter

            iter += 1
          }

          angleParamsToBeOpt = [cur]
        } else { // 只有一个就不用优化了
          angleParamsToBeOpt = [cur]
        }
      }
    }
  }

  console.log(underlyingNodeDict)

  const underlyingEdges: UnderlyingEdge[] = []
  // const underlyingEdgeDict: {[eKey: string]: UnderlyingEdge} = {}
  for (const { eKey, w } of edges) {
    const [unid, vnid] = eKey.split('_')
    const uNode = screenNodeIndex[unid]
    const vNode = screenNodeIndex[vnid]
    const k = (uNode.y - vNode.y) / (uNode.x - vNode.x)
    const median = { x: (uNode.x + vNode.x) / 2, y: (uNode.y + vNode.y) / 2 }

    const originAngleU = underlyingNodeDict[unid][eKey].angle
    const angleU = underlyingNodeDict[unid][eKey].newAngle
    const ku = Math.tan(angleU * Math.PI / 180)
    const ru = globalScale(background.nodeSizeDict[unid], zoom) / 2
    let dxu = Math.abs(Math.cos(angleU * Math.PI / 180) * ru)
    let dyu = Math.abs(Math.sin(angleU * Math.PI / 180) * ru)
    dxu = (Math.floor((angleU + 90) / 180)) % 2 === 0 ? dxu : -dxu
    dyu = (Math.floor(angleU / 180)) % 2 === 0 ? dyu : -dyu
    const uTangent = { x: uNode.x + dxu, y: uNode.y + dyu }

    const originAngleV = underlyingNodeDict[vnid][eKey].angle
    const angleV = underlyingNodeDict[vnid][eKey].newAngle
    const kv = Math.tan(angleV * Math.PI / 180)
    const rv = globalScale(background.nodeSizeDict[vnid], zoom) / 2
    let dxv = Math.abs(Math.cos(angleV * Math.PI / 180) * rv)
    let dyv = Math.abs(Math.sin(angleV * Math.PI / 180) * rv)
    dxv = (Math.floor((angleV + 90) / 180)) % 2 === 0 ? dxv : -dxv
    dyv = (Math.floor(angleV / 180)) % 2 === 0 ? dyv : -dyv
    const vTangent = { x: vNode.x + dxv, y: vNode.y + dyv }

    let controlPoint: ScreenPoint = { x: 0, y: 0 }
    if (Math.abs(ku - kv) <= 0.01) {
      controlPoint = median
    } else {
      controlPoint = intersect(ku, uNode, kv, vNode)
    }

    let kuReversed = 1
    let kvReversed = 1
    if (Math.abs((Math.floor(angleU / 180)) % 2) + Math.abs((Math.floor(originAngleU / 180)) % 2) === 1) {
      console.log('warning 很重要', eKey)
      kuReversed = -1
    }
    if (Math.abs((Math.floor(angleV / 180)) % 2) + Math.abs((Math.floor(originAngleV / 180)) % 2) === 1) {
      console.log('warning 很重要', eKey)
      kvReversed = -1
      console.log('eKey of 1030_19009 has been fixed')
    }
    underlyingEdges.push({
      kuReversed,
      kvReversed,
      angleU,
      angleV,
      ku,
      kv,
      w,
      key: eKey,
      uid: unid,
      vid: vnid,
      k: k,
      uNode: uNode,
      vNode: vNode,
      median,
      controlPoint,
      uTangent,
      vTangent
    })
  }
  return underlyingEdges
}

const isOverlap = (range1: [number, number], range2: [number, number]) => {
  if (Math.max(range2[0], range1[0]) < Math.min(range2[1], range1[1])) {
    return true
  }
  if ((range1[0] + range1[1] - range2[0] - range2[1]) > 500) {
    if (Math.max(range2[0], range1[0] - 360) < Math.min(range2[1], range1[1] - 360)) {
      return true
    }
  }
  if ((range2[0] + range2[1] - range1[0] - range1[1]) > 500) {
    if (Math.max(range1[0], range2[0] - 360) < Math.min(range1[1], range2[1] - 360)) {
      return true
    }
  }
  return false
}

const isCloseToLower = (angle: number, range: [number, number]) => {
  const midOfRange = (range[0] + range[1]) / 2
  if (angle - midOfRange > 270) {
    return Math.abs(angle - 360 - range[0]) < Math.abs(angle - 360 - range[1])
  } else if (midOfRange - angle > 270) {
    return Math.abs(angle + 360 - range[0]) < Math.abs(angle + 360 - range[1])
  } else {
    return Math.abs(angle - range[0]) < Math.abs(angle - range[1])
  }
}

const obtainSortedAngleParams = (underlyingNodeDict: {[nid: string]: {[eKey: string]: UnderlyingEdgeInNode}}, nid: string) => {
  const underlyingEdgesInNode = underlyingNodeDict[nid]
  const angleParams: AngleParam[] = []
  for (const eKey in underlyingEdgesInNode) {
    angleParams.push({
      ...underlyingEdgesInNode[eKey],
      eKey,
      nid
    })
  }
  for (const angleParam of angleParams) {
    const range = angleParam.range
    const l = (range[0] + 1080) % 360
    let r = (range[1] + 1080) % 360
    if (r < l) {
      r += 360
    }
    angleParam.range = [l, r]
    angleParam.angle = (angleParam.angle + 1080) % 360
    angleParam.newAngle = (angleParam.newAngle + 1080) % 360
  }
  angleParams.sort((a, b) => a.newAngle - b.newAngle)
  angleParams.push(angleParams[0]) // why?
  return angleParams
}
