import { cloneDeep, maxBy } from 'lodash'
import { generateWeightedFEdgesIndex } from './generateFEdgeIndex'
import { getScreenNodes } from './getScreenNodes'
import { indexScreenNodes } from './indexScreenNodes'
import { indexNodeByNode } from './indexNodeByNode'

// 根据id获取带有屏幕坐标的节点信息
// const indexScreenNodes = (screenNodes: ScreenNode[]) => {
//   const screenNodeIndex: {[nid: string]: ScreenNode} = {}
//   for (const node of screenNodes) {
//     screenNodeIndex[node.nid] = node
//   }
//   return screenNodeIndex
// }

// const computeOverlap = (fEdgesIndex: ForegroundEdgesIndex, screenNode: ScreenNode, nodeByNode: NodeByNode, geoNetworksByNode: {[nid: string]: GeoNetwork[]}) => {
//   const cnid = screenNode.nid // center node's id
//   const passingGeoNetworks = geoNetworksByNode[cnid] // 只有穿过这个点的图才有可能产生遮挡
//   // 交换的时候，所有的（不论是不是穿过这个节点还是只是终止于这个节点）都需要交换
//   // 这个节点有几条边，分别在什么方向，宽度是多少，每个图的权重是多少
//   for (const geoNetwork of passingGeoNetworks) {
//     // 该图在p边的顺序，q边的顺序
//     // 该图的权重
//     // p端的位置，q端的位置
//     // 怎么从p画到q，render
//   }

//   return 0
// }

export const computeOverlapPairWiseGraph = (str1: string, str2: string, g1: GeoNetwork, g2: GeoNetwork, eKeys: string[], nodeByNode: NodeByNode) => {
  // console.log('eKeys:', eKeys)
  // const screenNodeIndex = indexScreenNodes(screenNodes)
  // const nodeByNode = indexNodeByNode(screenNodeIndex, background)
  // re-construct graph
  const positionDictOfNetwork1: {[eKey: string]: number} = {}
  const positionDictOfNetwork2: {[eKey: string]: number} = {}
  for (let i = 0; i <= eKeys.length; i += 1) {
    positionDictOfNetwork1[eKeys[i]] = +str1[i]
    positionDictOfNetwork2[eKeys[i]] = +str2[i]
  }

  const nodeDict: {[nid: string]: number } = {}
  const allNodes: Set<string> = new Set()
  for (const eKey of eKeys) {
    const [uid, vid] = eKey.split('_')
    if (!(uid in nodeDict)) {
      nodeDict[uid] = 0
    }
    if (!(vid in nodeDict)) {
      nodeDict[vid] = 0
    }
    nodeDict[uid] += 1
    nodeDict[vid] += 1
    allNodes.add(uid)
    allNodes.add(vid)
  }
  // 度大于等于2的才会有交叉 // 有问题
  // const centerNodeIDs: Set<string> = new Set()
  // for (const nid in nodeDict) {
  //   if (nodeDict[nid] >= 2) {
  //     centerNodeIDs.add(nid)
  //   }
  // }

  // console.log(allNodes)

  let overlapMeasure = 0
  allNodes.forEach(cnid => {
    const neighboringNodes = nodeByNode[cnid]
    // const neighboringNodes = nodeByNode[cnid].filter(x => allNodes.has(x.nid))
    // neighboringNodes.forEach(n => {
    //   console.log(n.eKey)
    //   console.log(n.slot)
    // })
    const networkCodes1: {code: number, w: number}[] = []
    const networkCodes2: {code: number, w: number}[] = []

    // console.log('number of nodes:', neighboringNodes.length, nodeByNode[cnid].length)
    // console.log(neighboringNodes.map(n => n.eKey))
    neighboringNodes.forEach((neighboringNode, index) => {
      const eKey = neighboringNode.eKey
      const special = neighboringNode.special

      // const code1 = special
      //   ? (neighboringNode.slot[1] - positionDictOfNetwork1[eKey] - 1)
      //   : (neighboringNode.slot[0] + positionDictOfNetwork1[eKey])
      // const code2 = special
      //   ? (neighboringNode.slot[1] - positionDictOfNetwork2[eKey] - 1)
      //   : (neighboringNode.slot[0] + positionDictOfNetwork2[eKey])
      if (eKey in positionDictOfNetwork1) { // 在共享的边
        const code1 = special
          ? (1 - positionDictOfNetwork1[eKey])
          : positionDictOfNetwork1[eKey]
        networkCodes1.push({ code: code1 + index * 2, w: g1.edgeWeightDict[eKey] })
      } else if (eKey in g1.edgeWeightDict) { // 不在共享的边，但是在g1,自然不在g2里
        networkCodes1.push({ code: index * 2, w: g1.edgeWeightDict[eKey] })
      }
      if (eKey in positionDictOfNetwork2) {
        const code2 = special
          ? (1 - positionDictOfNetwork2[eKey])
          : positionDictOfNetwork2[eKey]
        networkCodes2.push({ code: code2 + index * 2, w: g2.edgeWeightDict[eKey] })
      } else if (eKey in g2.edgeWeightDict) {
        networkCodes2.push({ code: index * 2, w: g2.edgeWeightDict[eKey] })
      }
    })

    // console.log('networkCodes1:', networkCodes1)
    // console.log('networkCodes2:', networkCodes2)

    // const w1 = (maxBy(networkCodes1, code => code.w) as { code:number, w: number }).w
    const codePairs: {code: [number, number], w: number}[] = []
    if (networkCodes1.length === 2) {
      codePairs.push({
        code: [networkCodes1[0].code, networkCodes1[1].code],
        w: Math.min(networkCodes1[0].w, networkCodes1[1].w)
      })
    } else if (networkCodes1.length > 2) {
      for (let i = 0; i < networkCodes1.length; i += 1) {
        for (let j = 0; j < networkCodes1.length; j += 1) {
          if (i < j) {
            const w = Math.min(networkCodes1[j].w, networkCodes1[i].w)
            const codePair: {code: [number, number], w: number} = networkCodes1[i].code > networkCodes1[j].code
              ? { code: [networkCodes1[j].code, networkCodes1[i].code], w }
              : { code: [networkCodes1[i].code, networkCodes1[j].code], w }
            // const codePair: [number, number] = networkCodes1[i] > networkCodes1[j] ? [networkCodes1[j], networkCodes1[i]] : [networkCodes1[i], networkCodes1[j]]
            codePairs.push(codePair)
          }
        }
      }
    }
    // const w2 = (maxBy(networkCodes2, code => code.w) as { code:number, w: number }).w
    if (networkCodes2.length === 2) {
      codePairs.push({
        code: [networkCodes2[0].code, networkCodes2[1].code],
        w: Math.min(networkCodes2[0].w, networkCodes2[1].w)
      })
    } else if (networkCodes2.length > 2) {
      for (let i = 0; i < networkCodes2.length; i += 1) {
        for (let j = 0; j < networkCodes2.length; j += 1) {
          if (i < j) {
            const w = Math.min(networkCodes2[j].w, networkCodes2[i].w)
            const codePair: {code: [number, number], w: number} = networkCodes2[i].code > networkCodes2[j].code
              ? { code: [networkCodes2[j].code, networkCodes2[i].code], w }
              : { code: [networkCodes2[i].code, networkCodes2[j].code], w }
            // const codePair: [number, number] = networkCodes2[i] > networkCodes2[j] ? [networkCodes2[j], networkCodes2[i]] : [networkCodes2[i], networkCodes2[j]]
            codePairs.push(codePair)
          }
        }
      }
    }
    // console.log(codePairs, overlapMeasure)

    for (let i = 0; i < codePairs.length; i += 1) {
      for (let j = 0; j < codePairs.length; j += 1) {
        if (i < j) {
          // if (Math.max(codePairs[i][0], codePairs[j][0]) < Math.min(codePairs[i][1], codePairs[j][1])) { // bug!!! 不能处理[0,9][1,8]，另一个地方也要改
          //   overlapMeasure += 1
          // }
          if (codePairs[i].code[0] < codePairs[j].code[0] && codePairs[j].code[0] < codePairs[i].code[1] && codePairs[i].code[1] < codePairs[j].code[1]) {
            overlapMeasure += codePairs[i].w * codePairs[j].w
          }
          if (codePairs[j].code[0] < codePairs[i].code[0] && codePairs[i].code[0] < codePairs[j].code[1] && codePairs[j].code[1] < codePairs[i].code[1]) {
            overlapMeasure += codePairs[i].w * codePairs[j].w
          }
        }
      }
    }
  })

  return overlapMeasure
}

export const computeOverlapSimple = (fEdgesIndex: ForegroundEdgesIndex, screenNode: ScreenNode, nodeByNode: NodeByNode) => {
  const cnid = screenNode.nid // center node's id
  let overlapMeasure = 0
  let count = 0
  // const passingGeoNetworks = geoNetworksByNode[cnid]
  // 只有穿过这个点的图才有可能产生遮挡
  // 交换的时候，所有的（不论是不是穿过这个节点还是只是终止于这个节点）都需要交换
  // 这个节点有几条边，分别在什么方向，宽度是多少，每个图的权重是多少

  let nSlot = 0
  const neighboringNodes = nodeByNode[cnid]
  for (const neighboringNode of neighboringNodes) {
    const eKey = neighboringNode.eKey
    neighboringNode.numberOfIndividuals = fEdgesIndex[eKey].length
    neighboringNode.slot = [nSlot, nSlot + fEdgesIndex[eKey].length]
    nSlot += nSlot + fEdgesIndex[eKey].length
  }

  const networkCodeDict: {[gid: string]: { code: number, w: number }[]} = {}
  for (const neighboringNode of neighboringNodes) {
    const eKey = neighboringNode.eKey
    const special = neighboringNode.special
    fEdgesIndex[eKey].forEach((fEdge, i) => {
      const w = fEdge.w
      const code = special ? (neighboringNode.slot[1] - i - 1) : (neighboringNode.slot[0] + i)
      if (fEdge.gid in networkCodeDict) {
        networkCodeDict[fEdge.gid].push({ code, w })
      } else {
        networkCodeDict[fEdge.gid] = [{ code, w }]
      }
    })
  }

  const codePairs: [number, number, number][] = [] // 自己和自己会不会交叉都无所谓，都放一起好了
  for (const gid in networkCodeDict) {
    const tempCodes = networkCodeDict[gid]
    if (tempCodes.length === 2) {
      const w = Math.min(tempCodes[0].w, tempCodes[1].w)
      if (tempCodes[0].code > tempCodes[1].code) {
        codePairs.push([tempCodes[1].code, tempCodes[0].code, w] as [number, number, number])
      } else {
        codePairs.push([tempCodes[0].code, tempCodes[1].code, w] as [number, number, number])
      }
    } else if (tempCodes.length > 2) {
      for (let i = 0; i < tempCodes.length; i += 1) {
        for (let j = 0; j < tempCodes.length; j += 1) {
          if (i < j) {
            const w = Math.min(tempCodes[i].w, tempCodes[j].w)
            const codePair: [number, number, number] = tempCodes[i].code > tempCodes[j].code ? [tempCodes[j].code, tempCodes[i].code, w] : [tempCodes[i].code, tempCodes[j].code, w]
            codePairs.push(codePair)
          }
        }
      }
    }
    //  else {
    //   console.log('warning, 不穿过')
    // }
  }

  for (let i = 0; i < codePairs.length; i += 1) {
    for (let j = 0; j < codePairs.length; j += 1) {
      if (i < j) {
        // if (Math.max(codePairs[i][0], codePairs[j][0]) < Math.min(codePairs[i][1], codePairs[j][1])) {
        //   overlapMeasure += 1
        // }
        if (codePairs[i][0] < codePairs[j][0] && codePairs[j][0] < codePairs[i][1] && codePairs[i][1] < codePairs[j][1]) {
          overlapMeasure += codePairs[i][2] * codePairs[j][2] // w * w
          count += 1
        }
        if (codePairs[j][0] < codePairs[i][0] && codePairs[i][0] < codePairs[j][1] && codePairs[j][1] < codePairs[i][1]) {
          overlapMeasure += codePairs[i][2] * codePairs[j][2] // w * w
          count += 1
        }
      }
    }
  }

  // 该图在p边的顺序，q边的顺序
  // 该图的权重
  // p端的位置，q端的位置
  // 怎么从p画到q，render
  // 把每个图映射到[number, number], 或者[number, number][]如果在这个节点是多叉的话

  return { count, measure: overlapMeasure }
}

export const optimize = (geoNetworks: GeoNetwork[], background: Background, screenNodes: ScreenNode[]) => {
  const fEdgesIndex = generateWeightedFEdgesIndex(geoNetworks)
  const eKeys = Object.keys(fEdgesIndex)
  // const screenNodes = getScreenNodes(store.getState().geoNodes)
  const screenNodeIndex = indexScreenNodes(screenNodes)
  const nodeByNode = indexNodeByNode(screenNodeIndex, background)
  // const geoNetworksByNode = indexPassingGeoNetworksByNode(geoNetworks)
  const overlapByNode: {[nid: string]: {count: number, measure: number}} = {}
  for (const screenNode of screenNodes) {
    overlapByNode[screenNode.nid] = computeOverlapSimple(fEdgesIndex, screenNode, nodeByNode)
  }
  let iter = 0
  let maxAward = 1
  let targetI = -1
  let targetJ = -1
  let targetEdge = ''
  let targetOverlapU = { measure: -1, count: 0 }
  let targetOverlapV = { measure: -1, count: 0 }
  while (iter <= 100 && maxAward > 0.01) {
    // const cost = screenNodes.reduce((accCost, cur) => accCost + computeOverlapSimple(fEdgesIndexTmp, cur, nodeByNode), 0)

    // switch = arg switch function1(fEdgesIndex,nodeByNode)
    maxAward = -Infinity
    targetI = -1
    targetJ = -1
    targetEdge = ''
    targetOverlapU = { measure: -1, count: 0 }
    targetOverlapV = { measure: -1, count: 0 }

    for (const eKey of eKeys) {
      const [uid, vid] = eKey.split('_')
      const screenNodeU = screenNodeIndex[uid]
      const screenNodeV = screenNodeIndex[vid]
      const originOverlap = overlapByNode[uid].measure + overlapByNode[vid].measure

      const fEdges = fEdgesIndex[eKey]
      for (let i = 0; i < fEdges.length; i += 1) {
        for (let j = 0; j < fEdges.length; j += 1) {
          if (i > j) {
            const fEdgesIndexTmp = cloneDeep(fEdgesIndex)
            const tmp = fEdgesIndexTmp[eKey][i]
            fEdgesIndexTmp[eKey][i] = fEdgesIndexTmp[eKey][j]
            fEdgesIndexTmp[eKey][j] = tmp
            const overlapU = computeOverlapSimple(fEdgesIndexTmp, screenNodeU, nodeByNode)
            const overlapV = computeOverlapSimple(fEdgesIndexTmp, screenNodeV, nodeByNode)
            const overlapTmp = overlapU.measure + overlapV.measure // 其实只需要更新这条边附近的
            const award = originOverlap - overlapTmp // 变少了多少
            // switch i and j in fEdgesIndex[eKey]
            if (maxAward < award) {
              maxAward = award
              targetI = i
              targetJ = j
              targetEdge = eKey
              targetOverlapU = overlapU
              targetOverlapV = overlapV
            }
          }
        }
      }
    }
    console.log('iter:', iter, ';  maxAward:', maxAward)

    // conduct switch
    const tmp = fEdgesIndex[targetEdge][targetI]
    fEdgesIndex[targetEdge][targetI] = fEdgesIndex[targetEdge][targetJ]
    fEdgesIndex[targetEdge][targetJ] = tmp

    // update overlapByNode
    const [uid, vid] = targetEdge.split('_')
    overlapByNode[uid] = targetOverlapU
    overlapByNode[vid] = targetOverlapV

    iter += 1
  }

  return fEdgesIndex
}

export const recursion = (g: GeoNetwork, geoNetworkIndex: {[gid: string]: GeoNetwork}, nodeByNode: NodeByNode) => {
  if (g.children.length >= 2) {
    const [child1, child2] = g.children
    // console.log(child1, child2, geoNetworkIndex[child1], geoNetworkIndex[child1])
    const g1 = geoNetworkIndex[child1]
    const g2 = geoNetworkIndex[child2]
    optimizeNetworkPair(g1, g2, nodeByNode)
    recursion(g1, geoNetworkIndex, nodeByNode)
    recursion(g2, geoNetworkIndex, nodeByNode)
  }
}

const optimizeNetworkPair = (g1: GeoNetwork, g2: GeoNetwork, nodeByNode: NodeByNode) => {
  const g1eKeys = new Set(g1.eKeys)
  const g2eKeys = new Set(g2.eKeys)
  const unionEdges = Array.from(new Set([...g1.eKeys, ...g2.eKeys]))
  // console.log(g1.eKeys, g2.eKeys, unionEdges)
  const intersectEdges = Array.from(new Set([...g1eKeys].filter(x => g2eKeys.has(x))))
  // const uniqueEdges1 = Array.from(new Set([...unionEdges].filter(x => !g2eKeys.has(x))))
  // const uniqueEdges2 = Array.from(new Set([...unionEdges].filter(x => !g1eKeys.has(x))))
  if (intersectEdges.length > 22) {
    console.log('warning, boom')
  }
  let overlapMinimum = +Infinity
  let layout1 = ''
  let layout2 = ''
  // console.log('start enumeration')
  const maxIter = Math.pow(2, intersectEdges.length) - 1
  for (let iter = 0; iter <= maxIter; iter += 1) {
    let str1 = iter.toString(2)
    for (; str1.length < intersectEdges.length;) {
      str1 = '0' + str1 // 不够的就在前面补0
    }
    let str2 = (maxIter - iter).toString(2)
    for (; str2.length < intersectEdges.length;) {
      str2 = '0' + str2 // 不够的就在前面补0
    }
    const overlap = computeOverlapPairWiseGraph(str1, str2, g1, g2, intersectEdges, nodeByNode)
    // console.log((maxIter - iter), iter, str2, str1, overlap)
    if (overlapMinimum > overlap) {
      // console.log('optimizing; Iter:', iter, '; overlap:', overlap, str1, str2)
      overlapMinimum = overlap
      layout1 = str1
      layout2 = str2
    }
  }

  g1.edgePositionDict = {}
  g2.edgePositionDict = {}
  // console.log('optimized', layout1, layout2)
  intersectEdges.forEach((eKey, i) => {
    if (eKey in g1.edgeWeightDict) {
      (g1.edgePositionDict as {[eKey: string]: number})[eKey] = parseInt(layout1[i])
    }
    if (eKey in g2.edgeWeightDict) {
      (g2.edgePositionDict as {[eKey: string]: number})[eKey] = parseInt(layout2[i])
    }
  })
  unionEdges.forEach((eKey, i) => {
    if (eKey in g1.edgeWeightDict && !(eKey in (g1.edgePositionDict as {[eKey: string]: number}))) {
      (g1.edgePositionDict as {[eKey: string]: number})[eKey] = 0
    }
    if (eKey in g2.edgeWeightDict && !(eKey in (g2.edgePositionDict as {[eKey: string]: number}))) {
      (g2.edgePositionDict as {[eKey: string]: number})[eKey] = 0
    }
  })
  // 那剩下的咋办呢
}
