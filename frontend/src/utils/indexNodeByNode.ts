// 根据一个节点，获取周边节点
type IndexNodeByNode = (screenNodeIndex: {[nid: string]: ScreenNode}, background: Background) => NodeByNode
export const indexNodeByNode: IndexNodeByNode = (screenNodeIndex, background) => {
  const nodeByNodeTmp: NodeByNodeTmp = {}
  const nodeByNode: NodeByNode = {}

  for (const eKey in background.edgeSizeDict) {
    const [uid, vid] = eKey.split('_')
    if (uid in nodeByNodeTmp) {
      nodeByNodeTmp[uid].push(vid)
    } else {
      nodeByNodeTmp[uid] = [vid]
    }
    if (vid in nodeByNodeTmp) {
      nodeByNodeTmp[vid].push(uid)
    } else {
      nodeByNodeTmp[vid] = [uid]
    }
  }
  // console.log(nodeByNodeTmp)

  for (const nid in nodeByNodeTmp) {
    nodeByNodeTmp[nid] = Array.from(new Set(nodeByNodeTmp[nid])) // 去重
    const screenNode = screenNodeIndex[nid]
    // const neighbors: {[nid: string]: GeoNeighbor[]} = {}
    const geoNeighbors = nodeByNodeTmp[nid].map((nnid) => {
      const nScreenNode = screenNodeIndex[nnid]
      // console.log(nScreenNode, nnid, screenNode)

      const [uid, vid] = +nnid < +nid ? [+nnid, +nid] : [+nid, +nnid]
      const unifiedEKey = `${uid}_${vid}` // 1_2,2_1都要放进同一个地方

      // 把这个节点的相邻边计算出来
      const ret = ({
        slot: [0, 0],
        eKey: unifiedEKey,
        nid,
        nnid,
        angle: 0,
        numberOfIndividuals: -1,
        special: false
      } as GeoNeighbor)
      const dy = nScreenNode.y - screenNode.y
      const dx = nScreenNode.x - screenNode.x
      if (nScreenNode.x > screenNode.x && nScreenNode.y > screenNode.y) {
        ret.angle = Math.atan(dy / dx)
      } else if (nScreenNode.x < screenNode.x && nScreenNode.y > screenNode.y) {
        ret.angle = Math.atan(Math.abs(dx) / dy) + Math.PI / 2
      } else if (nScreenNode.x < screenNode.x && nScreenNode.y < screenNode.y) {
        ret.angle = Math.atan(dy / dx) + Math.PI
        ret.special = true
      } else {
        ret.angle = Math.atan(dx / Math.abs(dy)) + 3 * Math.PI / 2
        ret.special = true
      } // warning:xy要是相等会出事
      return ret
    })
    geoNeighbors.sort((a, b) => a.angle - b.angle)
    nodeByNode[nid] = geoNeighbors
  }
  return nodeByNode
}
