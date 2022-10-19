// 每个边上有哪些图经过
export type GenerateFEdgesIndex = (geoNetworks: GeoNetwork[]) => ForegroundEdgesIndex
// export const generateFEdgesIndex: GenerateFEdgesIndex = (geoNetworks: GeoNetwork[]) => {
//   const fEdgesIndex: ForegroundEdgesIndex = {}
//   for (const geoNetwork of geoNetworks) {
//     const eKeys = geoNetwork.eKeys

//     for (const eKey of eKeys) {
//       const [oid, did] = eKey.split('_')
//       const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
//       const unifiedEKey = `${uid}_${vid}` // 1_2,2_1都要放进同一个地方

//       if (unifiedEKey in fEdgesIndex) {
//         fEdgesIndex[unifiedEKey].push({ w: geoNetwork.w, gid: geoNetwork.id })
//       } else {
//         fEdgesIndex[unifiedEKey] = [{ w: geoNetwork.w, gid: geoNetwork.id }]
//       }
//     }
//   }

//   return fEdgesIndex
// }

// 每个边上有哪些图经过
export const generateWeightedFEdgesIndex: GenerateFEdgesIndex = (geoNetworks: GeoNetwork[]) => {
  const fEdgesIndex: ForegroundEdgesIndex = {}
  for (const geoNetwork of geoNetworks) {
    const eKeys = geoNetwork.eKeys // 双向边已经被区分,但是在这里不需要被区分，下面已经处理过了，权重取两者间大的（报个warning

    for (const eKey of eKeys) {
      const [oid, did] = eKey.split('_')
      const [uid, vid] = +oid < +did ? [+oid, +did] : [+did, +oid]
      const unifiedEKey = `${uid}_${vid}` // 1_2,2_1都要放进同一个地方

      // 如果存在双向边，验证一下权重是否一样，不一样的话报个warnning
      // let weight = geoNetwork.g[oid][did]
      // if (`${did}_${oid}` in eKeys && geoNetwork.g[did][oid] !== geoNetwork.g[oid][did]) {
      //   console.log('warning')
      //   weight = Math.max(geoNetwork.g[did][oid], geoNetwork.g[oid][did])
      // }

      if (unifiedEKey in fEdgesIndex) {
        fEdgesIndex[unifiedEKey].push({ arrow: geoNetwork.arrows[unifiedEKey], w: geoNetwork.edgeWeightDict[unifiedEKey], gid: geoNetwork.id })
      } else {
        fEdgesIndex[unifiedEKey] = [{ arrow: geoNetwork.arrows[unifiedEKey], w: geoNetwork.edgeWeightDict[unifiedEKey], gid: geoNetwork.id }]
      }
    }
  }

  return fEdgesIndex
}
