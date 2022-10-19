export const getTotalIDsByRoot = (gid: string, geoNetworkIndex: { [gid: string]: GeoNetwork }) => {
  const deletedGeoNetworkIDs: Array<string> = []
  const fid = findFather(gid, geoNetworkIndex)
  if (fid === gid) return deletedGeoNetworkIDs
  traverseTreeByRoot(geoNetworkIndex[fid], deletedGeoNetworkIDs, geoNetworkIndex)
  return deletedGeoNetworkIDs
}

const traverseTreeByRoot = (g: GeoNetwork, deletedGeoNetworkIDs: Array<string>, geoNetworkIndex: { [gid: string]: GeoNetwork }) => {
  deletedGeoNetworkIDs.push(g.id)
  for (let i = 0; i < g.children.length; i++) {
    traverseTreeByRoot(geoNetworkIndex[g.children[i]], deletedGeoNetworkIDs, geoNetworkIndex)
  }
}

const findFather = (gid: string, geoNetworkIndex: { [gid: string]: GeoNetwork }) => {
  for (const item in geoNetworkIndex) {
    if (geoNetworkIndex[item].children.includes(gid)) return item
  }
  return gid
}

export const getFS = (geoNetworkIndex: { [gid: string]: GeoNetwork }) => {
  const dictFS: { [key: string]: { 'f': string, 'c': string[] | never[], 'level': number } } = {}
  for (const gid in geoNetworkIndex) {
    const children: Array<string> = []
    let fid = findFather(gid, geoNetworkIndex)
    if (fid === gid) fid = ''
    geoNetworkIndex[gid].children.forEach(child => {
      traverseTreeByRoot(geoNetworkIndex[child], children, geoNetworkIndex)
    })
    dictFS[gid] = {
      f: fid,
      c: children,
      level: geoNetworkIndex[gid].level
    }
  }
  console.log('dictFS:', dictFS)
  return dictFS
}