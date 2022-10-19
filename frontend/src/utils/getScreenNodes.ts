import store from '../store'
// 获取带有屏幕坐标的节点数组
type GetScreenNodes = (geoNodes: GeoNode[]) => ScreenNode[]
export const getScreenNodes: GetScreenNodes = (geoNodes: GeoNode[]) => {
  const geomap = store.getState().geomap
  return geoNodes.map(geoNode => {
    const Pt: L.Point = (geomap as L.Map).latLngToLayerPoint({ lat: geoNode.lat, lng: geoNode.lng })
    return { ...geoNode, x: Pt.x, y: Pt.y }
  })
}
