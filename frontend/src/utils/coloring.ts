import { cloneDeep, maxBy, toUpper } from 'lodash'
import { retriveByLevel } from './retriveByLevel'
import { hexToLab, labToHex } from './color'

export const generateConnectionGraph = (renderedIDs: string[], fEdgesIndex: ForegroundEdgesIndex, nodeByNode: NodeByNode) => {
  // 构造位置邻接图
  // 扫描节点，在节点会发生“相交”的邻接关系
  // 扫描边，在边会发生“挨着”以及“处在同一条边”的邻接关系
  const connectionGraph: ConnectionGraph = {}

  for (const eKey in fEdgesIndex) {
    const fEdges = fEdgesIndex[eKey]

    if (fEdges.length === 1) {
      if (!(fEdges[0].gid in connectionGraph)) {
        connectionGraph[fEdges[0].gid] = {
          intersect: new Set(),
          adjacent: new Set(),
          sameEdge: new Set()
        }
      }
    }

    // sameEdge
    // console.log(eKey)
    fEdges.forEach((fei, i) => {
      // console.log(fei.gid)
      fEdges.forEach((fej, j) => {
        if (i > j) {
          if (!(fei.gid in connectionGraph)) {
            connectionGraph[fei.gid] = {
              intersect: new Set(),
              adjacent: new Set(),
              sameEdge: new Set()
            }
          }
          connectionGraph[fei.gid].sameEdge.add(fej.gid)

          if (!(fej.gid in connectionGraph)) {
            connectionGraph[fej.gid] = {
              intersect: new Set(),
              adjacent: new Set(),
              sameEdge: new Set()
            }
          }
          connectionGraph[fej.gid].sameEdge.add(fei.gid)
        }
      })
    })

    // adjacent
    fEdges.forEach((fe, i) => {
      if (i >= 1) {
        const prevFEdges = fEdges[i - 1]
        connectionGraph[fe.gid].adjacent.add(prevFEdges.gid)
        connectionGraph[prevFEdges.gid].adjacent.add(fe.gid)
      }
    })
  }

  // intersect
  // // 遍历每一个节点
  for (const nid in nodeByNode) {
    // console.log('nid:~', nid)
    const neighborNodes = nodeByNode[nid]

    let nSlot = 0
    for (const neighborNode of neighborNodes) {
      const eKey = neighborNode.eKey
      neighborNode.numberOfIndividuals = fEdgesIndex[eKey].length
      neighborNode.slot = [nSlot, nSlot + fEdgesIndex[eKey].length]
      nSlot += nSlot + fEdgesIndex[eKey].length
    }

    // 在当前节点为每个网络存储codes
    const networkCodeDict: {[gid: string]: number[]} = {}
    for (const neighborNode of neighborNodes) {
      const eKey = neighborNode.eKey
      const special = neighborNode.special
      const fEdges = fEdgesIndex[eKey]

      fEdges.forEach((fEdge, i) => {
        const code = special ? (neighborNode.slot[1] - i - 1) : (neighborNode.slot[0] + i)
        if (fEdge.gid in networkCodeDict) {
          networkCodeDict[fEdge.gid].push(code)
        } else {
          networkCodeDict[fEdge.gid] = [code]
        }
      })
    }

    // 在当前节点根据每个网络的codes生成codepairs
    const networkCodePairDict: {[gid: string]: [number, number][]} = {}
    for (const gid in networkCodeDict) {
      const codes = networkCodeDict[gid]
      const codePairs: [number, number][] = []

      if (codes.length === 2) {
        if (codes[0] > codes[1]) {
          codePairs.push([codes[1], codes[0]] as [number, number])
        } else {
          codePairs.push([codes[0], codes[1]] as [number, number])
        }
      } else if (codes.length > 2) {
        for (let i = 0; i < codes.length; i += 1) {
          for (let j = 0; j < codes.length; j += 1) {
            if (i < j) {
              const codePair: [number, number] = codes[i] > codes[j] ? [codes[j], codes[i]] : [codes[i], codes[j]]
              codePairs.push(codePair)
            }
          }
        }
      }
      networkCodePairDict[gid] = codePairs
    }

    // 在当前节点根据每个网络的codepairs去determine whether intersect
    const gids = Object.keys(networkCodePairDict)
    for (let i = 0; i < gids.length; i += 1) {
      const gidi = gids[i]
      const codePairsI = networkCodePairDict[gidi]

      for (let j = 0; j < gids.length; j += 1) {
        const gidj = gids[j]
        if (i > j) {
          let intersect = false
          const codePairsJ = networkCodePairDict[gidj]

          for (let ii = 0; ii < codePairsI.length && !intersect; ii += 1) {
            for (let jj = 0; jj < codePairsJ.length && !intersect; jj += 1) {
              if (ii <= jj) {
                if (codePairsI[ii][0] < codePairsJ[jj][0] && codePairsJ[jj][0] < codePairsI[ii][1] && codePairsI[ii][1] < codePairsJ[jj][1]) {
                  intersect = true
                }
                if (codePairsJ[jj][0] < codePairsI[ii][0] && codePairsI[ii][0] < codePairsJ[jj][1] && codePairsJ[jj][1] < codePairsI[ii][1]) {
                  intersect = true
                }
              }
            }
          }

          // 在当前节点，gidi和gidj是否相交判断完毕
          if (intersect) {
            connectionGraph[gidi].intersect.add(gidj)
            connectionGraph[gidj].intersect.add(gidi)
          }
        }
      }
    }
    // 当前节点遍历完
  }

  return connectionGraph
}

type LabelDict = {[gid: string]: {adjacents: Set<number>, assigned: number}}

type IsSafeFunc = (gid: string, connectionGraph: ConnectionGraph, labelDict: LabelDict, labelTmp: number, k: number, unassigned?: Set<string>) => boolean
const isSafe: IsSafeFunc = (gid: string, connectionGraph: ConnectionGraph, labelDict: LabelDict, labelTmp: number, k: number, unassigned?: Set<string>) => {
  for (const neighborGid of [...connectionGraph[gid].adjacent]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if ((labelDict[neighborGid].assigned % k) === (labelTmp % k)) {
      return false
    }
  }

  for (const neighborGid of [...connectionGraph[gid].intersect]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if ((labelDict[neighborGid].assigned % k) === (labelTmp % k)) {
      return false
    }
  }
  for (const neighborGid of [...connectionGraph[gid].sameEdge]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  return true
}

const isSafeSoftSoft: IsSafeFunc = (gid: string, connectionGraph: ConnectionGraph, labelDict: LabelDict, labelTmp: number, k: number, unassigned?: Set<string>) => {
  for (const neighborGid of [...connectionGraph[gid].adjacent]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  for (const neighborGid of [...connectionGraph[gid].intersect]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  for (const neighborGid of [...connectionGraph[gid].sameEdge]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  return true
}

const isSafeSoft: IsSafeFunc = (gid: string, connectionGraph: ConnectionGraph, labelDict: LabelDict, labelTmp: number, k: number, unassigned?: Set<string>) => {
  for (const neighborGid of [...connectionGraph[gid].adjacent]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if ((labelDict[neighborGid].assigned % k) === (labelTmp % k)) {
      return false
    }
  }
  for (const neighborGid of [...connectionGraph[gid].intersect]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  for (const neighborGid of [...connectionGraph[gid].sameEdge]) {
    if (unassigned && unassigned.has(neighborGid)) {
      continue
    }
    if (labelDict[neighborGid].assigned === labelTmp) {
      return false
    }
  }
  return true
}

/* A recursive utility function
       to solve m coloring  problem */
const graphColoringUtilHard = (connectionGraph: ConnectionGraph, labelDict: LabelDict, cur: number, renderedIDs: string[], k: number) => {
  /* base case: If all vertices are assigned a color then return true */
  if (cur >= renderedIDs.length) { return true }

  /* Consider this vertex v and try different colors */
  let currentMax = 0
  for (const gid in labelDict) {
    currentMax = Math.max(currentMax, labelDict[gid].assigned)
  }
  let c = 0
  for (; c <= (currentMax + k); c++) {
    /* Check if assignment of color c to v is fine */
    if (isSafe(renderedIDs[cur], connectionGraph, labelDict, c, k)) {
      labelDict[renderedIDs[cur]].assigned = c

      /* recur to assign colors to rest of the vertices */
      if (graphColoringUtilHard(connectionGraph, labelDict, cur + 1, renderedIDs, k)) { return true }

      /* If assigning color c doesn't lead to a solution then remove it */
      labelDict[renderedIDs[cur]].assigned = 0
    }
  }

  /* If no color can be assigned to this vertex then return false */
  return false
}

const graphColoringUtilSoft = (connectionGraph: ConnectionGraph, labelDict: LabelDict, cur: number, renderedIDs: string[], k: number) => {
  /* base case: If all vertices are assigned a color then return true */
  if (cur >= renderedIDs.length) { return true }

  /* Consider this vertex v and try different colors */
  let currentMax = 0
  for (const gid in labelDict) {
    currentMax = Math.max(currentMax, labelDict[gid].assigned)
  }
  let c = 0
  for (; c <= (currentMax + k); c++) {
    /* Check if assignment of color c to v is fine */
    if (isSafe(renderedIDs[cur], connectionGraph, labelDict, c, k)) {
      labelDict[renderedIDs[cur]].assigned = c

      /* recur to assign colors to rest of the vertices */
      if (graphColoringUtilSoft(connectionGraph, labelDict, cur + 1, renderedIDs, k)) { return true }

      /* If assigning color c doesn't lead to a solution then remove it */
      labelDict[renderedIDs[cur]].assigned = 0
    }
  }
  if (c > (currentMax + k)) { // 如果到了这一步，这说明不能用强约束
    c = 0
    for (;; c++) {
      if (isSafeSoft(renderedIDs[cur], connectionGraph, labelDict, c, k)) {
        labelDict[renderedIDs[cur]].assigned = c

        /* recur to assign colors to rest of the vertices */
        if (graphColoringUtilSoft(connectionGraph, labelDict, cur + 1, renderedIDs, k)) { return true }

        /* If assigning color c doesn't lead to a solution then remove it */
        labelDict[renderedIDs[cur]].assigned = 0
      }
    }
  }

  /* If no color can be assigned to this vertex then return false */
  return false
}

const graphLabelingExploitingK = (k: number, renderedIDs: string[], connectionGraph: ConnectionGraph, clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork}) => {
  const labelDict: LabelDict = {}
  for (const gid of renderedIDs) {
    labelDict[gid] = { adjacents: new Set(), assigned: 0 }
  }

  // 取最粗的k个赋予0~k-1
  // const geoNetworks = renderedIDs.map(id => clusteredGeoNetworkIndex[id]).sort((ga, gb) => gb.maxWeightAcrossEdge - ga.maxWeightAcrossEdge)
  const renderedIDsSort = renderedIDs.sort((gida, gidb) => clusteredGeoNetworkIndex[gidb].maxWeightAcrossEdge - clusteredGeoNetworkIndex[gida].maxWeightAcrossEdge)
  console.log(renderedIDsSort)
  for (let i = 0; i < Math.min(k, renderedIDsSort.length); i += 1) { // 如果renderedIDsSort.length < k
    labelDict[renderedIDsSort[i]].assigned = i
  }

  const successfulHard = graphColoringUtilHard(connectionGraph, labelDict, k, renderedIDsSort, k)
  if (!successfulHard) {
    const successfulSolf = graphColoringUtilSoft(connectionGraph, labelDict, k, renderedIDsSort, k)
    if (!successfulSolf) {
      console.log('ERROR!!!!')
    }
  } else {
    console.log('graphColoringUtilHard success')
  }

  // 计算子节点要避免赋予的label
  // 这里是第一层的，不需要从上一层继承
  for (const gid in labelDict) {
    for (const neighborGid of [...connectionGraph[gid].adjacent]) {
      labelDict[gid].adjacents.add(labelDict[neighborGid].assigned)
    }
    for (const neighborGid of [...connectionGraph[gid].intersect]) {
      labelDict[gid].adjacents.add(labelDict[neighborGid].assigned)
    }
  }

  // 计算最大的label
  let maxColors = 0
  for (const gid in labelDict) {
    maxColors = Math.max(maxColors, labelDict[gid].assigned)
  }
  return {
    labels: labelDict,
    maxColors
  }
}

const graphLabelingHierarchy = (k: number, renderedIDs: string[], connectionGraph: ConnectionGraph, prevLabels: LabelDict, clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork}, maxColorsPrev: number) => {
  const reused: Set<string> = new Set()
  const unassigned: Set<string> = new Set()
  const labels: LabelDict = {}

  const renderedIDsSort = cloneDeep(renderedIDs).sort((gid1, gid2) => clusteredGeoNetworkIndex[gid2].maxWeightAcrossEdge - clusteredGeoNetworkIndex[gid1].maxWeightAcrossEdge)

  // reuse the previous labels
  for (const gid of renderedIDsSort) { // 给他们排个序，使得越粗的越在前面，这样子在reuse parent的颜色时，会优先分配给粗的儿子
    if (gid in prevLabels) {
      reused.add(gid)
      labels[gid] = prevLabels[gid]
    } else { // 如果（e.g., graph1）不在上一层，则上一层必然有其父亲(e.g., graph1_xxx or xxx_graph1)
      const parentID = clusteredGeoNetworkIndex[gid].parent
      if (!reused.has(parentID)) {
        reused.add(parentID)
        labels[gid] = prevLabels[parentID]
      } else {
        unassigned.add(gid)
        labels[gid] = { assigned: 0, adjacents: cloneDeep(prevLabels[parentID].adjacents) }
      }
    }
  }

  const toBeAssigned = cloneDeep([...unassigned])
  let iter = 0
  // const MAX_ITER = 100
  for (const gid of toBeAssigned) {
    // console.log(iter, toBeAssigned.length)
    let currentMax = 0
    for (const gid in labels) {
      currentMax = Math.max(currentMax, labels[gid].assigned)
    }

    let c = 0
    for (; c <= (currentMax + k); c++) {
      for (const adjacentAssigned of labels[gid].adjacents) {
        if ((adjacentAssigned % k) === (c % k)) {
          continue
        }
      }

      // console.log(c)
      /* Check if assignment of color c to v is fine */
      if (isSafe(gid, connectionGraph, labels, c, k, unassigned)) {
        labels[gid].assigned = c
        unassigned.delete(gid)
        break
      }
    }

    if (c > (currentMax + k)) {
      console.log('soft')
      c = 0
      for (;; c++) {
        if (c > 300 + currentMax) {
          break
        }
        // console.log(c)
        /* Check if assignment of color c to v is fine */
        if (labels[gid].adjacents.has(c)) {
          continue
        }

        if (isSafeSoft(gid, connectionGraph, labels, c, k, unassigned)) {
          labels[gid].assigned = c
          unassigned.delete(gid)
          break
        }
      }
    }

    if (c > (currentMax + k + 1)) {
      console.log('softsoft')
      c = 0
      for (;; c++) {
        if (c > 300 + currentMax) {
          break
        }
        // console.log(c)
        /* Check if assignment of color c to v is fine */
        if (isSafeSoft(gid, connectionGraph, labels, c, k, unassigned)) {
          labels[gid].assigned = c
          unassigned.delete(gid)
          break
        }
      }
    }

    if (c > (currentMax + k + 2)) {
      console.log('softsoftsoft')
      c = 0
      for (;; c++) {
        if (c > 300 + currentMax) {
          console.log('ERROR!!!!')
          break
        }
        // console.log(c)
        /* Check if assignment of color c to v is fine */
        if (isSafeSoftSoft(gid, connectionGraph, labels, c, k, unassigned)) {
          labels[gid].assigned = c
          unassigned.delete(gid)
          break
        }
      }
    }

    iter += 1
  }

  // 计算子节点要避免赋予的label
  // 这里不是第一层，需要从上一层继承（已经完成），现在要push进新的
  for (const gid in labels) {
    for (const neighborGid of [...connectionGraph[gid].adjacent]) {
      labels[gid].adjacents.add(labels[neighborGid].assigned)
    }
    for (const neighborGid of [...connectionGraph[gid].intersect]) {
      labels[gid].adjacents.add(labels[neighborGid].assigned)
    }
  }

  let maxColors = 0
  for (const gid in labels) {
    maxColors = Math.max(maxColors, labels[gid].assigned)
  }
  if (maxColors < maxColorsPrev) {
    console.log('warning')
  }

  // console.log(labels)

  return { labels, maxColors }
}

const evaluate = (k: number, connectionGraph: ConnectionGraph, labels: LabelDict, ids: string[]) => {
  let nonviolateSum = 0
  let violateSum = 0
  let modviolateSum = 0
  let imodSum = 0
  let iSum = 0
  let amodSum = 0
  let aSum = 0
  let smodSum = 0
  let sSum = 0
  for (const id of ids) {
    let violate = false
    let modViolate = false
    let a = false
    let amod = false
    let i = false
    let imod = false
    let s = false
    let smod = false
    const curLabel = labels[id].assigned
    const intersectIDs = connectionGraph[id].intersect
    const adjacentIDs = connectionGraph[id].adjacent
    const sameEdgeIDs = connectionGraph[id].sameEdge

    for (const intersectID of intersectIDs) {
      const label = labels[intersectID].assigned
      if (label === curLabel) {
        i = true
        violate = true
      }
      if (label % k === curLabel % k) {
        imod = true
        modViolate = true
      }
    }

    for (const adjacentID of adjacentIDs) {
      const label = labels[adjacentID].assigned
      if (label === curLabel) {
        a = true
        violate = true
      }
      if (label % k === curLabel % k) {
        amod = true
        modViolate = true
      }
    }

    for (const sameEdgeID of sameEdgeIDs) {
      const label = labels[sameEdgeID].assigned
      if (label === curLabel) {
        s = true
        violate = true
      }
      if (label % k === curLabel % k) {
        smod = true
        modViolate = true
      }
    }

    if (violate) {
      violateSum += 1
    } else if (modViolate) {
      modviolateSum += 1
    } else {
      nonviolateSum += 1
    }

    if (smod) {
      smodSum += 1
    }
    if (amod) {
      amodSum += 1
    }
    if (imod) {
      imodSum += 1
    }
    if (s) {
      sSum += 1
    }
    if (a) {
      aSum += 1
    }
    if (i) {
      iSum += 1
    }
  }

  return {
    violateSum,
    modviolateSum,
    nonviolateSum,
    aSum,
    amodSum,
    sSum,
    smodSum,
    iSum,
    imodSum
  }
}

export const coloring = (geoNetworks: GeoNetwork[], clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork}, fEdgesIndexFirstLevel: ForegroundEdgesIndex, nodeByNode: NodeByNode) => {
  // const { fEdgesIndex, renderedGeoNetworkIDs } = retriveByLevel(clusteredGeoNetworkIndex, fEdgesIndexFistLevel, level)
  const k = 8
  const maxLevel = (maxBy(geoNetworks, g => g.level) as GeoNetwork).level
  console.log('maxLevel: ', maxLevel)

  const labelsOfAllLevels: LabelDict[] = []

  // processing first level
  const idsFirstLevel = geoNetworks.filter(g => g.level === 0).map(g => g.id)

  const connectionGraph = generateConnectionGraph(idsFirstLevel, fEdgesIndexFirstLevel, nodeByNode)
  // const { labels, maxColors } = graphLabelingNew(k, idsFirstLevel, connectionGraph)
  const { labels, maxColors } = graphLabelingExploitingK(k, idsFirstLevel, connectionGraph, clusteredGeoNetworkIndex)

  // labels 从0开始
  const labelsOfFirstLevel = labels

  // evaluate
  const eva = evaluate(k, connectionGraph, labels, idsFirstLevel)
  console.log('evaluation: ', idsFirstLevel.length)
  console.log(JSON.stringify(eva))

  // debug mode: hide below

  labelsOfAllLevels.push(labels)

  console.log('first level. maxColors:', maxColors)

  // processing following level
  let prevLabels = labelsOfFirstLevel
  let maxColorsPrev = maxColors
  for (let l = 1; l <= maxLevel; l += 1) {
    const { fEdgesIndex, renderedGeoNetworkIDs } = retriveByLevel(clusteredGeoNetworkIndex, fEdgesIndexFirstLevel, l, {})
    const ids = [...renderedGeoNetworkIDs]
    const connectionGraph = generateConnectionGraph(ids, fEdgesIndex, nodeByNode)
    console.log('connectionGraph of level= ', l, ' has been generated')
    const { labels, maxColors } = graphLabelingHierarchy(k, ids, connectionGraph, prevLabels, clusteredGeoNetworkIndex, maxColorsPrev)
    labelsOfAllLevels.push(labels)
    console.log('maxColor of level', l, ' :', maxColors)
    maxColorsPrev = maxColors
    prevLabels = labels

    const eva = evaluate(k, connectionGraph, labels, ids)
    console.log('evaluation: ', ids.length)
    console.log(JSON.stringify(eva))
  }

  // 检查下每一层的是否有冲突，并且顺便合并
  let maxLabel = 0
  const mergedLabels: LabelDict = {}
  for (const labels of labelsOfAllLevels) {
    let maxLabelLocal = 0
    for (const gid in labels) {
      maxLabelLocal = Math.max(maxLabelLocal, labels[gid].assigned)
      if (gid in mergedLabels) {
        if (mergedLabels[gid].assigned !== labels[gid].assigned) {
          console.log('warning')
        }
      } else {
        mergedLabels[gid] = labels[gid]
      }
    }
    console.log('the maximum label of current level is ', maxLabelLocal)
    maxLabel = Math.max(maxLabel, maxLabelLocal)
  }

  // console.log(mergedLabels['3_166-3_165-3_352-4_58-4_108-2_395-2_428-2_311-3_164-3_333-3_129-3_167'])
  // console.log(mergedLabels['3_84-3_79-3_150-3_334-4_23-3_159-4_136-4_104-4_100-4_69-4_68-4_45-4_38-4_9-4_6-4_26-3_313-4_49-3_86-3_151-3_149-3_147-3_126-4_96-4_34-3_195-4_97-3_122-4_101-4_105'].assigned)

  const rawColors = ['#af7aa1', '#f28e2c', '#e15759', '#76b7b2', '#edc949', '#59a14f', '#4e79a7', '#ff9da7']
  const nSamples = Math.ceil((maxLabel + 1) / rawColors.length) - 1 // 在主颜色附近采样nSamples个
  // lab的值域 l:[0,100];a:[-128,127];b:[-128,127]
  const colors = new Array(k).fill(0).map(v => new Array(nSamples + 1).fill(0).map(v => ''))
  for (let i = 0; i < k; i += 1) {
    colors[i][0] = rawColors[i]
    const lab = hexToLab(rawColors[i])
    const l = lab[0] - 1
    const a = lab[1] - 2
    const b = lab[2] - 2

    let shiftL = -4
    let shiftA = -4
    const delta = nSamples === 1 ? 0 : 8 / (nSamples - 1)
    for (let s = 1; s <= nSamples; s += 1) {
      // const dl = (Math.random() - 0.5) * 3
      // const da = (Math.random() - 0.5) * 5
      // const db = (Math.random() - 0.5) * 5

      const sign = s % 2 === 0 ? -1 : 1
      const dl = shiftL
      const da = shiftA
      const db = Math.sqrt(32 - shiftL * shiftL - shiftA * shiftA) * sign
      shiftL += delta
      shiftA += delta

      colors[i][s] = labToHex([l + dl / 1.414, a + da / 1.414, b + db / 1.414])
    }
  }
  const colorDict: {[gid: string]: string} = {}
  for (const gid in mergedLabels) {
    colorDict[gid] = colors[(mergedLabels[gid].assigned) % k][Math.floor((mergedLabels[gid].assigned) / k)] // 不能直接取模，需要采样 todo
  }

  // 查看不同颜色的使用率
  const distribution: number[] = new Array(k).fill(0)
  for (const gid in mergedLabels) {
    const l = mergedLabels[gid].assigned
    distribution[l % k] += 1
  }
  console.log(distribution)

  return { colorDict, mergedLabels }
}
