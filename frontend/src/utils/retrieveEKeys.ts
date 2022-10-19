// 一个网络包含哪些边
type RetrieveEdgesInNetwork = (geoNetwork: GeoNetwork) => [string[], {[eKey: string]: number}, {[nid: string]: number}, string[], {[eKey: string]: number}]
export const retrieveEdgesInNetwork: RetrieveEdgesInNetwork = (geoNetwork: GeoNetwork) => {
  // for a raw geo-network
  const edgeWeightDict: {[eKey: string]: number} = {}
  const nodeSizeDict: {[nid: string]: number} = {}
  const edgeWeightDictDirectionAware: {[eKey: string]: number} = {}
  // for a raw geo-network

  const edgeSet: Set<string> = new Set()
  for (const oid in geoNetwork.g) {
    for (const did in geoNetwork.g[oid]) {
      const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
      const key = `${uid}_${vid}`
      edgeSet.add(key)

      const w = geoNetwork.w === 1 ? geoNetwork.g[oid][did] : geoNetwork.w
      edgeWeightDict[key] = w

      if (oid in nodeSizeDict) {
        nodeSizeDict[oid] = Math.max(nodeSizeDict[oid], w)
      } else {
        nodeSizeDict[oid] = w
      }

      if (did in nodeSizeDict) {
        nodeSizeDict[did] = Math.max(nodeSizeDict[did], w)
      } else {
        nodeSizeDict[did] = w
      }
    }
  }

  const edgeSetDirectionAware: Set<string> = new Set()
  for (const oid in geoNetwork.g) {
    for (const did in geoNetwork.g[oid]) {
      const key = `${oid}_${did}`
      edgeSetDirectionAware.add(key)

      const w = geoNetwork.w === 1 ? geoNetwork.g[oid][did] : geoNetwork.w
      edgeWeightDict[key] = w

      if (oid in nodeSizeDict) {
        nodeSizeDict[oid] = Math.max(nodeSizeDict[oid], w)
      } else {
        nodeSizeDict[oid] = w
      }

      if (did in nodeSizeDict) {
        nodeSizeDict[did] = Math.max(nodeSizeDict[did], w)
      } else {
        nodeSizeDict[did] = w
      }
    }
  }

  return [Array.from(edgeSet), edgeWeightDict, nodeSizeDict, Array.from(edgeSetDirectionAware), edgeWeightDictDirectionAware]
}
