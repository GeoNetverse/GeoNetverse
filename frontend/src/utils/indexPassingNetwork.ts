// 根据node获取【穿过】该节点的图，如果在一个图中，某个节点的度大于2，说明该图穿过它
// warning: 目前只处理有向图
export const indexPassingGeoNetworksByNode = (geoNetworks: GeoNetwork[], involved: boolean) => {
  const threshold = involved ? 1 : 2
  const geoNetworksByNode: {[nid: string]: GeoNetwork[]} = {}

  // debug
  const gids = geoNetworks.map(g => g.id)
  const gidsSet = new Set([...gids])
  console.log('............')
  console.log(gids.length, gidsSet.size)
  console.log('............')

  for (const geoNetwork of geoNetworks) {
    // 统计该网络中度大于2的节点
    const degreeDict: {[nid: string]: number} = {}
    const eKeys = geoNetwork.eKeys
    for (const eKey of eKeys) {
      const [uid, vid] = eKey.split('_')
      if (uid in degreeDict) {
        degreeDict[uid] += 1
      } else {
        degreeDict[uid] = 1
      }
      if (vid in degreeDict) {
        degreeDict[vid] += 1
      } else {
        degreeDict[vid] = 1
      }
    }
    for (const nid in degreeDict) {
      if (degreeDict[nid] >= threshold) { // warning: 度大于3的咋办
        if (nid in geoNetworksByNode) {
          geoNetworksByNode[nid].push(geoNetwork)
        } else {
          geoNetworksByNode[nid] = [geoNetwork]
        }
      }
    }
  }
  return geoNetworksByNode
}
