export const retriveByLevel = (geoNetworkIndex: {[gid: string]: GeoNetwork}, fEdgesIndex0: ForegroundEdgesIndex, level: number, specialLevelDict: SpecialLevelDict) => {
  const renderedGeoNetworkIDs: Set<string> = new Set()
  const fEdgesIndex: ForegroundEdgesIndex = {}
  // const clusteredGeoNetworks0 = geoNetworks.filter(g => g.level === 0)
  // level = 5

  let maxLevelOfRetrieving = level
  for (const gid in specialLevelDict) {
    maxLevelOfRetrieving = Math.max(maxLevelOfRetrieving, specialLevelDict[gid].nextLevel)
  }

  for (const eKey in fEdgesIndex0) {
    fEdgesIndex[eKey] = []
    let accumulateOrder = 0
    const fEdges = fEdgesIndex0[eKey]
    fEdges.forEach((fEdge) => {
      // console.log('accumulateOrder:', accumulateOrder)
      const innerOrder = { count: 0 }
      const gid = fEdge.gid
      const g = geoNetworkIndex[gid]
      if (eKey in g.edgeWeightDict) {
        recursion(renderedGeoNetworkIDs, eKey, g, accumulateOrder, geoNetworkIndex, level, fEdgesIndex, innerOrder, specialLevelDict, maxLevelOfRetrieving)
        // accumulateOrder += innerOrder.count
        accumulateOrder += Math.pow(2, maxLevelOfRetrieving)
      }
      // hit: (g.level === level) || (g.level < 5 && g.children.length == 0)
    })
    fEdgesIndex[eKey] = fEdgesIndex[eKey].sort((a, b) => (a.order as number) - (b.order as number))
  }

  return { fEdgesIndex, renderedGeoNetworkIDs }
}

const recursion = (
  renderedGeoNetworkIDs: Set<string>,
  eKey: string,
  g: GeoNetwork,
  accumulateOrder: number,
  geoNetworkIndex: {[gid: string]: GeoNetwork},
  level: number,
  fEdgesIndex: ForegroundEdgesIndex,
  innerOrder: {count: number},
  specialLevelDict: SpecialLevelDict,
  maxLevelOfRetrieving: number
) => {
  // (g.level === level)这个条件会使得不会有超过这个level的图被取出

  if ((g.level >= level) && (g.id in specialLevelDict) && (g.children.length > 0)) { // 特殊情况，需要取它的孩子继续递归
    const [child1, child2] = g.children
    const g1 = geoNetworkIndex[child1]
    const g2 = geoNetworkIndex[child2]
    const gTmpBinary = g.level === 0 ? '' : (g.tmpBinary as string) // 如果g是第0层需要特殊处理

    if (eKey in g1.edgeWeightDict) {
      g1.tmpBinary = gTmpBinary + (g1.edgePositionDict as {[eKey: string]: number})[eKey]
      recursion(renderedGeoNetworkIDs, eKey, g1, accumulateOrder, geoNetworkIndex, level, fEdgesIndex, innerOrder, specialLevelDict, maxLevelOfRetrieving)
    }
    if (eKey in g2.edgeWeightDict) {
      // 如果g是第0层需要特殊处理
      g2.tmpBinary = gTmpBinary + (g2.edgePositionDict as {[eKey: string]: number})[eKey]
      recursion(renderedGeoNetworkIDs, eKey, g2, accumulateOrder, geoNetworkIndex, level, fEdgesIndex, innerOrder, specialLevelDict, maxLevelOfRetrieving)
    }
  } else if (((g.level >= level) && !(g.id in specialLevelDict)) || (g.level < level && g.children.length === 0)) { // 命中，要被取出
    if (eKey in g.edgeWeightDict) {
      let binaryCode = g.level === 0 ? '0' : g.tmpBinary as string
      for (; binaryCode.length < maxLevelOfRetrieving;) {
        binaryCode = binaryCode + '0'
      }
      const order = parseInt(binaryCode, 2)
      fEdgesIndex[eKey].push({
        arrow: g.arrows[eKey],
        w: g.edgeWeightDict[eKey],
        gid: g.id,
        // 如果是第0层需要特殊处理
        order: accumulateOrder + order
      }) // 之后还要sort by order
      innerOrder.count += 1
      renderedGeoNetworkIDs.add(g.id)
    }
  } else if ((g.level < level) && (g.children.length > 0)) { // level没到，并且有孩子，递归到下一层
    const [child1, child2] = g.children
    const g1 = geoNetworkIndex[child1]
    const g2 = geoNetworkIndex[child2]
    const gTmpBinary = g.level === 0 ? '' : (g.tmpBinary as string) // 如果g是第0层需要特殊处理

    if (eKey in g1.edgeWeightDict) {
      g1.tmpBinary = gTmpBinary + (g1.edgePositionDict as {[eKey: string]: number})[eKey]
      recursion(renderedGeoNetworkIDs, eKey, g1, accumulateOrder, geoNetworkIndex, level, fEdgesIndex, innerOrder, specialLevelDict, maxLevelOfRetrieving)
    }
    if (eKey in g2.edgeWeightDict) {
      // 如果g是第0层需要特殊处理
      g2.tmpBinary = gTmpBinary + (g2.edgePositionDict as {[eKey: string]: number})[eKey]
      recursion(renderedGeoNetworkIDs, eKey, g2, accumulateOrder, geoNetworkIndex, level, fEdgesIndex, innerOrder, specialLevelDict, maxLevelOfRetrieving)
    }
  }
}