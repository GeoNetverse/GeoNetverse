import { maxBy, cloneDeep, merge } from 'lodash'
import { optimize, computeOverlapPairWiseGraph } from './optimize'

// 聚合的同时安排同一层两两间的顺序
// 随便定个阈值 聚类一下先: 小试牛刀，把最近的两个聚类一下，聚类次数是所有的除以2
// 顶一个最小的可以聚类的阈值，暗示聚类要停止了
// **数据结构怎么设计呢？**
// 层级聚类的结果本身是个树，每个图是一个节点，包含其底层的两个图
// 子问题1：给定两个图，他们的走线布局怎么解决，感觉可以枚举完？
// 子问题2：如何merge两个图
// 是不是可以考虑，如果本来那条背景边的数量就不多的话，可以不聚合？
export const hierarchyClusteringNetworks = (geoNetworksInput: GeoNetwork[], background: Background, screenNodes: ScreenNode[], nodeByNode: NodeByNode, directionAware: boolean) => {
  // const originNumberOfNetworks = geoNetworksInput.length
  const geoNetworks = cloneDeep(geoNetworksInput)
  const geoNetworkIndexRaw: {[gid: string]: GeoNetwork} = {}
  geoNetworks.forEach((geoNetwork) => {
    geoNetworkIndexRaw[geoNetwork.id] = geoNetwork
  })
  let targetI = -1
  let targetJ = -1
  // let targetIntersection: string[] = []
  let maximumSimilarity = 0.25
  let maximumSimilarityThreshold = 0.25

  // let maximumSimilarity = 0.5
  // const maximumSimilarityThreshold = 0.5 // only for aircas and viscas dataset!!!!!!!!!

  const mergedIndex: Set<number> = new Set()

  while (maximumSimilarity >= maximumSimilarityThreshold) {
    // 如何知道当前还有哪些边的数量大于5？
    let geoNetworksDictToBePick: Set<string> = new Set()
    const geoNetworkToBePickForEachEdge: {[eKey: string]: string[]} = {}
    geoNetworks.forEach((geoNetwork, i) => {
      if (!mergedIndex.has(i)) {
        for (const eKey of geoNetwork.eKeys) {
          if (eKey in geoNetworkToBePickForEachEdge) {
            geoNetworkToBePickForEachEdge[eKey].push(geoNetwork.id)
          } else {
            geoNetworkToBePickForEachEdge[eKey] = [geoNetwork.id]
          }
        }
      }
    })
    // 然后从这些tu里面pick进行合并
    for (const eKey in geoNetworkToBePickForEachEdge) {
      const ids = geoNetworkToBePickForEachEdge[eKey]
      if (ids.length >= 6) {
        geoNetworksDictToBePick = new Set([...geoNetworksDictToBePick, ...ids])
      }
    }
    // 如果每条边的数量都小于等于5了,且maximumSimilarity < 0.66
    if (geoNetworksDictToBePick.size === 0) {
      maximumSimilarity = 0.65
      maximumSimilarityThreshold = 0.66
      geoNetworksDictToBePick = new Set()
      geoNetworks.forEach(geoNetwork => {
        geoNetworksDictToBePick.add(geoNetwork.id)
      })
    }

    // 但是仍有相似性很大的咋办

    maximumSimilarity = -1
    targetI = -1
    targetJ = -1
    geoNetworks.forEach((geoNetworkA, i) => {
      if ((!mergedIndex.has(i)) && (geoNetworksDictToBePick.has(geoNetworkA.id))) {
        geoNetworks.forEach((geoNetworkB, j) => {
          if ((!mergedIndex.has(j)) && (geoNetworksDictToBePick.has(geoNetworkB.id))) {
            if (i > j) { // 有新的push，那这个还成立吗[warning]。应该成立
              // const similarity = myJaccard(new Set(geoNetworkA.eKeys), new Set(geoNetworkB.eKeys))
              // const similarity = simpleJaccard(new Set(geoNetworkA.eKeys), new Set(geoNetworkB.eKeys))
              const similarity = averageJaccard(geoNetworkA, geoNetworkB, geoNetworkIndexRaw, directionAware)
              // 不考虑图的个数会倾向于合并大图；合并过的图也越大；导致unbiased的结果
              if (similarity > maximumSimilarity) {
                maximumSimilarity = similarity
                targetI = i
                targetJ = j
                // targetIntersection = similarity.sharedEdgeKeys
              }
            }
          }
        })
      }
    })

    if (targetI >= 0 && targetJ >= 0) {
      // console.log(maximumSimilarity)
      const geoNetworkA = geoNetworks[targetI]
      const geoNetworkB = geoNetworks[targetJ]
      mergedIndex.add(targetI)
      mergedIndex.add(targetJ)
      const gAeKeys = directionAware ? geoNetworkA.eKeysDirectionAware : geoNetworkA.eKeys
      const gBeKeys = directionAware ? geoNetworkB.eKeysDirectionAware : geoNetworkB.eKeys
      const union = Array.from(new Set([...gAeKeys, ...gBeKeys]))
      const intersection = Array.from(new Set([...gAeKeys].filter(x => new Set(gBeKeys).has(x))))
      const newGeoNetwork = mergeTwoNetwork(geoNetworkA, geoNetworkB, intersection, union, directionAware)
      geoNetworkA.parent = newGeoNetwork.id
      geoNetworkB.parent = newGeoNetwork.id
      geoNetworks.push(newGeoNetwork)
    }
  }

  const geoNetworkIndex: {[gid: string]: GeoNetwork} = {}
  geoNetworks.forEach((geoNetwork) => {
    geoNetworkIndex[geoNetwork.id] = geoNetwork
  })

  // 计算level
  geoNetworks.forEach((geoNetwork, i) => {
    if (!mergedIndex.has(i)) {
      let level = 0
      geoNetwork.level = level
      const children = geoNetwork.children
      let queue: GeoNetwork[] = []
      for (const child of children) {
        queue.push(geoNetworkIndex[child])
      }
      let currentLength = queue.length
      while (currentLength > 0) {
        level += 1
        for (let k = 0; k < currentLength; k += 1) {
          const children = queue[k].children
          queue[k].level = level
          for (const child of children) {
            queue.push(geoNetworkIndex[child])
          }
        }

        queue = queue.slice(currentLength)
        currentLength = queue.length
      }
    }
  })

  return {
    geoNetworkIndex,
    geoNetworks
  }
}

const mergeTwoNetwork = (geoNetworkA: GeoNetwork, geoNetworkB: GeoNetwork, sharedEdges: string[], unionEdges: string[], directionAware: boolean) => {
  const gAeKeys = directionAware ? geoNetworkA.eKeysDirectionAware : geoNetworkA.eKeys
  const gBeKeys = directionAware ? geoNetworkB.eKeysDirectionAware : geoNetworkB.eKeys

  const remainderEdgesA = gAeKeys.filter(x => !sharedEdges.includes(x))
  const remainderEdgesB = gBeKeys.filter(x => !sharedEdges.includes(x))

  const edgeWeightDict: {[eKey: string]: number} = {}
  const edgeWeightDictDirectionAware: {[eKey: string]: number} = {}
  const arrows: {[eKey: string]: Arrow} = {}

  const newG: Network = merge(cloneDeep(geoNetworkA.g), cloneDeep(geoNetworkB.g))

  for (const sharedEdge of sharedEdges) {
    const [oid, did] = sharedEdge.split('_')
    const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
    const unifiedKey = `${uid}_${vid}`
    // const key = sharedEdge

    edgeWeightDict[unifiedKey] = geoNetworkA.edgeWeightDict[unifiedKey] + geoNetworkB.edgeWeightDict[unifiedKey]
    arrows[unifiedKey] = cloneDeep(geoNetworkA.arrows[unifiedKey]) // 需要合并，两边的加起来就好了？
    // console.log(arrows[key])
    arrows[unifiedKey][0].value = arrows[unifiedKey][0].value + geoNetworkB.arrows[unifiedKey][0].value
    arrows[unifiedKey][1].value = arrows[unifiedKey][1].value + geoNetworkB.arrows[unifiedKey][1].value

    if (directionAware) {
      edgeWeightDictDirectionAware[sharedEdge] = geoNetworkA.edgeWeightDictDirectionAware[sharedEdge] + geoNetworkB.edgeWeightDictDirectionAware[sharedEdge]
    }
  }
  for (const remainderEdgeA of remainderEdgesA) {
    const [oid, did] = remainderEdgeA.split('_')
    const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
    const unifiedKey = `${uid}_${vid}`
    // const key = remainderEdgeA
    edgeWeightDict[unifiedKey] = geoNetworkA.edgeWeightDict[unifiedKey]
    arrows[unifiedKey] = geoNetworkA.arrows[unifiedKey]

    if (directionAware) {
      edgeWeightDictDirectionAware[remainderEdgeA] = geoNetworkA.edgeWeightDictDirectionAware[remainderEdgeA]
    }
  }
  for (const remainderEdgeB of remainderEdgesB) {
    const [oid, did] = remainderEdgeB.split('_')
    const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
    const unifiedKey = `${uid}_${vid}`
    // const key = remainderEdgeB
    edgeWeightDict[unifiedKey] = geoNetworkB.edgeWeightDict[unifiedKey]
    arrows[unifiedKey] = geoNetworkB.arrows[unifiedKey]

    if (directionAware) {
      edgeWeightDictDirectionAware[remainderEdgeB] = geoNetworkB.edgeWeightDictDirectionAware[remainderEdgeB]
    }
  }

  const newNetwork: GeoNetwork = {
    color: '',
    edgeWeightDict,
    edgeWeightDictDirectionAware,
    nodeSizeDictLocal: {}, // 后面也用不到吧
    id: `${geoNetworkA.id}-${geoNetworkB.id}`,
    g: newG,
    level: -1, // 之后再扫一遍才知道
    w: -1, // 这个权重已经不重要了
    children: [geoNetworkA.id, geoNetworkB.id],
    parent: '',
    eKeysDirectionAware: directionAware ? unionEdges : Array.from(new Set([...geoNetworkA.eKeys, ...geoNetworkB.eKeys])),
    eKeys: directionAware ? Array.from(new Set([...geoNetworkA.eKeys, ...geoNetworkB.eKeys])) : unionEdges,
    merged: true, // 当它为真时，权重应该看g里面的
    maxWeightAcrossEdge: 0,
    arrows
  }

  return newNetwork
}

const simpleJaccard = (a: Set<string>, b: Set<string>) => {
  const union = new Set([...a, ...b])
  const intersection = new Set([...a].filter(x => b.has(x))) // intersection
  if (intersection.size === 0) {
    return {
      similarity: 0,
      sharedEdgeKeys: []
    }
  } else if (intersection.size === 1) {
    return {
      similarity: 1 / union.size,
      sharedEdgeKeys: Array.from(intersection)
    }
  } else {
    return {
      similarity: intersection.size / union.size,
      sharedEdgeKeys: Array.from(intersection)
    }
  }
}

const averageJaccard = (geoNetworkA: GeoNetwork, geoNetworkB: GeoNetwork, geoNetworkIndexRaw: {[gid: string]: GeoNetwork}, directionAware: boolean) => {
  const rawIDsA = geoNetworkA.id.split('-')
  const rawIDsB = geoNetworkB.id.split('-')
  let similarity = 0
  for (const rawIDA of rawIDsA) {
    const g1 = geoNetworkIndexRaw[rawIDA]
    const g1eKeySet = directionAware ? new Set(g1.eKeysDirectionAware) : new Set(g1.eKeys)
    for (const rawIDB of rawIDsB) {
      const g2 = geoNetworkIndexRaw[rawIDB]
      const g2eKeySet = directionAware ? new Set(g2.eKeysDirectionAware) : new Set(g2.eKeys)
      const union = new Set([...g1eKeySet, ...g2eKeySet])
      const intersection = new Set([...g1eKeySet].filter(x => g2eKeySet.has(x))) // intersection
      const j = intersection.size / union.size
      similarity += j
    }
  }
  return similarity / (rawIDsA.length * rawIDsB.length)
}

// 尚未对双向边进行考虑
const myJaccard = (a: Set<string>, b: Set<string>) => {
  const union = new Set([...a, ...b])
  const intersection = new Set([...a].filter(x => b.has(x))) // intersection需要重新定义:取intersection里的最大连通的部分
  if (intersection.size === 0) {
    return {
      similarity: 0,
      sharedEdgeKeys: []
    }
  } else if (intersection.size === 1) {
    return {
      similarity: 1 / union.size,
      sharedEdgeKeys: Array.from(intersection)
    }
  } else {
    const eKeys = Array.from(intersection)
    const valid: Set<number> = new Set()
    const groups: string[][] = []
    for (let i = 0; i < eKeys.length; i += 1) {
      // 取intersection里的最大连通的部分
      const eKeyI = eKeys[i]
      if (!(valid.has(i))) {
        const group: string[] = [eKeyI]
        valid.add(i)
        eKeys.forEach((eKeyJ, j) => {
          if (!(valid.has(j))) {
            const [uI, vI] = eKeyI.split('_')
            const [uJ, vJ] = eKeyJ.split('_')
            if (uI === uJ || uI === vJ || vI === uJ || vI === vJ) {
              valid.add(j)
              group.push(eKeyJ)
            }
          }
        })
        if (group.length > 0) {
          groups.push(group)
          if (group.length === eKeys.length) {
            break
          }
        }
      }
    }
    const groupWithMaxEdges = maxBy(groups, (group) => group.length) as string[]
    return {
      similarity: groupWithMaxEdges.length / union.size,
      sharedEdgeKeys: groupWithMaxEdges
    }
  }
}
