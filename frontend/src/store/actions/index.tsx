/* eslint-disable no-undef */
export interface SetGeoNodesAction {
  type: 'SET_GEO_NODES';
  payload: GeoNode[];
}

export const setGeoNodes = (nodes: GeoNode[]): SetGeoNodesAction => ({
  type: 'SET_GEO_NODES',
  payload: nodes
})

export interface SetGeoNetworksAction {
  type: 'SET_GEO_NETWORKS';
  payload: GeoNetwork[];
}

export const setGeoNetworks = (geoNetworks: GeoNetwork[]): SetGeoNetworksAction => ({
  type: 'SET_GEO_NETWORKS',
  payload: geoNetworks
})

export interface SetClusteredGeoNetworksAction {
  type: 'SET_CLUSTERED_GEO_NETWORKS';
  payload: GeoNetwork[];
}

export const setClusteredGeoNetworks = (geoNetworks: GeoNetwork[]): SetClusteredGeoNetworksAction => ({
  type: 'SET_CLUSTERED_GEO_NETWORKS',
  payload: geoNetworks
})

export interface SetColorsAction {
  type: 'SET_COLORS';
  payload: {[gid: string]: string};
}

export const setColors = (colors: {[gid: string]: string}): SetColorsAction => ({
  type: 'SET_COLORS',
  payload: colors
})

export interface SetFSAction {
  type: 'SET_FS';
  payload: {[key: string]: {'f': string, 'c':string[] | never[], 'level': number}};
}

export const setFS = (dictFS: {[key: string]: {'f': string, 'c':string[] | never[], 'level': number}}): SetFSAction => ({
  type: 'SET_FS',
  payload: dictFS
})

export interface SetBackgroundAction {
  type: 'SET_BACKGROUND';
  payload: Background;
}

export const setBackground = (background: Background): SetBackgroundAction => ({
  type: 'SET_BACKGROUND',
  payload: background
})

export interface SetNodeIndexAction {
  type: 'SET_NODE_INDEX';
  payload: {[nid: string]: ScreenNode};
}

export const setNodeIndex = (nodeIndex: {[nid: string]: ScreenNode}): SetNodeIndexAction => ({
  type: 'SET_NODE_INDEX',
  payload: nodeIndex
})

export interface SetMapAction {
  type: 'SET_MAP';
  payload: L.Map
}

export const setMap = (map: L.Map): SetMapAction => ({
  type: 'SET_MAP',
  payload: map
})

export interface SetGeoNetworkColorsAction {
  type: 'SET_GEO_NETWORK_COLORS';
  payload: {[gid: string]: string}
}

export const setGeoNetworkColors = (colors: {[gid: string]: string}): SetGeoNetworkColorsAction => ({
  type: 'SET_GEO_NETWORK_COLORS',
  payload: colors
})

export interface SwitchOpenSelectAction {
  type: 'SWITCH_OPEN_SELECT';
}

export const switchOpen = (): SwitchOpenSelectAction => ({
  type: 'SWITCH_OPEN_SELECT'
})

export interface SelectPathAction {
  type: 'SELECT_PATH';
  pathInfo: { finfo: [string, string], cinfo: [string, string][]};
}

export const selectPath = (info: { finfo: [string, string], cinfo: [string, string][]}): SelectPathAction => ({
  type: 'SELECT_PATH',
  pathInfo: info
})

export interface SetLevelAction {
  type: 'SET_LEVEL',
  level: number
}

export const setLevel = (level: number): SetLevelAction => ({
  type: 'SET_LEVEL',
  level: level
})
