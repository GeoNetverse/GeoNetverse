type BackgroundCalculator = (geoNodes: GeoNode[], geoNetworks: GeoNetwork[]) => Background

type RetrieveNodesInNetwork = (network: Network) => string[]
const retrieveNodesInNetwork: RetrieveNodesInNetwork = (network: Network) => {
  const nodeSet: Set<string> = new Set()
  for (const oid in network) {
    nodeSet.add(oid)
    for (const did in network[oid]) {
      nodeSet.add(did)
    }
  }

  return Array.from(nodeSet)
}

export const backgroundCalculator: BackgroundCalculator = (geoNodes: GeoNode[], geoNetworks: GeoNetwork[]) => {
  // 统计节点的大小
  const nodeSizeDict: NodeSizeDict = {}
  for (const gn of geoNodes) {
    nodeSizeDict[gn.nid] = 0
  }

  for (const geoNetwork of geoNetworks) {
    const nodes = retrieveNodesInNetwork(geoNetwork.g)
    for (const nid of nodes) {
      if (nid in nodeSizeDict) {
        nodeSizeDict[nid] += geoNetwork.nodeSizeDictLocal[nid]
      } else {
        console.log('warning', nid)
      }
    }
  }

  // 统计边的大小
  const edgeSizeDict: EdgeSizeDict = {}
  for (const geoNetwork of geoNetworks) {
    const eKeys = geoNetwork.eKeys
    const added: Set<string> = new Set()
    for (const eKey of eKeys) {
      // const [oid, did] = eKey.split('_')
      // const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
      // const unifiedEKey = `${uid}_${vid}` // 1_2,2_1都算同一个
      if (!added.has(eKey)) { // 对于一个individual图，双向边算一次就够了;
        added.add(eKey)

        if (eKey in edgeSizeDict) {
          edgeSizeDict[eKey] += geoNetwork.edgeWeightDict[eKey]
        } else {
          edgeSizeDict[eKey] = geoNetwork.edgeWeightDict[eKey]
        }
      } else {
        console.log('双向边')
      }
    }
  }

  return {
    nodeSizeDict,
    edgeSizeDict
  }
}
