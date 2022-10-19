import { combineReducers } from 'redux'
import {
  SetGeoNodesAction,
  SetGeoNetworksAction,
  SetBackgroundAction,
  SetNodeIndexAction,
  SetMapAction,
  SetClusteredGeoNetworksAction,
  SetGeoNetworkColorsAction,
  SetColorsAction,
  SwitchOpenSelectAction,
  SelectPathAction,
  SetLevelAction,
  setFS,
  SetFSAction
} from '../actions'
// import points from './points'

const geomap = (state: L.Map | null = null, action: SetMapAction) => {
  switch (action.type) {
    case 'SET_MAP':
      return action.payload
    default:
      return state
  }
}

const geoNodes = (state: GeoNode[] = [], action: SetGeoNodesAction) => {
  switch (action.type) {
    case 'SET_GEO_NODES':
      return action.payload
    default:
      return state
  }
}

const geoNetworks = (state: GeoNetwork[] = [], action: SetGeoNetworksAction) => {
  switch (action.type) {
    case 'SET_GEO_NETWORKS':
      return action.payload
    default:
      return state
  }
}

const clusteredGeoNetworks = (state: GeoNetwork[] = [], action: SetClusteredGeoNetworksAction) => {
  switch (action.type) {
    case 'SET_CLUSTERED_GEO_NETWORKS':
      return action.payload
    default:
      return state
  }
}

const colors = (state: { [gid: string]: string } = {}, action: SetColorsAction) => {
  switch (action.type) {
    case 'SET_COLORS':
      return action.payload
    default:
      return state
  }
}

const dictFS = (state: {[key: string]: {'f': string, 'c':string[] | never[], 'level': number}} = {}, action: SetFSAction) => {
  switch (action.type) {
    case 'SET_FS':
      return action.payload
    default:
      return state
  }
}

const background = (state: Background = { nodeSizeDict: {}, edgeSizeDict: {} }, action: SetBackgroundAction) => {
  switch (action.type) {
    case 'SET_BACKGROUND':
      return action.payload
    default:
      return state
  }
}

const nodeIndex = (state: { [nid: string]: ScreenNode } = {}, action: SetNodeIndexAction) => {
  switch (action.type) {
    case 'SET_NODE_INDEX':
      return action.payload
    default:
      return state
  }
}

const geoNetworkColors = (state: { [gid: string]: string } = {}, action: SetGeoNetworkColorsAction) => {
  switch (action.type) {
    case 'SET_GEO_NETWORK_COLORS':
      return action.payload
    default:
      return state
  }
}

const openSelect = (state = false, action: SwitchOpenSelectAction) => {
  switch (action.type) {
    case 'SWITCH_OPEN_SELECT':
      return !state
    default:
      return state
  }
}

const selectedPaths = (state: Map<string, string> = new Map<string, string>(), action: SelectPathAction) => {
  switch (action.type) {
    case 'SELECT_PATH': {
      const newState = state
      if (state.has(action.pathInfo.finfo[0])) {
        newState.delete(action.pathInfo.finfo[0])
        action.pathInfo.cinfo.forEach((child) => {
          if (state.has(child[0])) newState.delete(child[0])
        })
      } else {
        newState.set(action.pathInfo.finfo[0], action.pathInfo.finfo[1])
        action.pathInfo.cinfo.forEach((child) => {
          newState.set(child[0], child[1])
        })
      }
      return newState
    }
    default:
      return state
  }
}

const selectedPathsID = (state: Set<string> = new Set<string>(), action: SelectPathAction) => {
  switch (action.type) {
    case 'SELECT_PATH': {
      const newState = state
      if (state.has(action.pathInfo.finfo[0])) {
        newState.delete(action.pathInfo.finfo[0])
        action.pathInfo.cinfo.forEach((child) => {
          if (state.has(child[0])) newState.delete(child[0])
        })
      } else {
        newState.add(action.pathInfo.finfo[0])
        action.pathInfo.cinfo.forEach((child) => {
          newState.add(child[0])
        })
      }
      return newState
    }
    default:
      return state
  }
}

const level = (state = 0, action: SetLevelAction) => {
  switch (action.type) {
    case 'SET_LEVEL': {
      return action.level
    }
    default:
      return state
  }
}

export default combineReducers({
  geoNodes,
  geoNetworks,
  background,
  nodeIndex,
  geomap,
  clusteredGeoNetworks,
  geoNetworkColors,
  colors,
  openSelect,
  selectedPaths,
  selectedPathsID,
  level,
  dictFS
})
