/* eslint-disable no-unused-vars */
interface GeoNode {
  nid: string
  lat: number,
  lng: number,
  namechn: string,
  nameeng: string
}

interface ScreenNode {
  nid: string
  lat: number,
  lng: number,
  namechn: string,
  nameeng: string,
  x: number,
  y: number
}

type NodeSizeDict = {[nid: string]: number}
type EdgeSizeDict = {[uvid: string]: number} // u < v; uid_vid

interface Background {
  nodeSizeDict: NodeSizeDict,
  edgeSizeDict: EdgeSizeDict
}

interface ScreenPoint {
  x: number,
  y: number
}

interface UnderlyingEdge {
  kuReversed: number,
  kvReversed: number,
  w: number,
  key: string,
  uid: string,
  vid: string,
  k: number,
  uNode: ScreenNode,
  vNode: ScreenNode,
  median: ScreenPoint,
  controlPoint: ScreenPoint,
  uTangent: ScreenPoint,
  vTangent: ScreenPoint,
  ku: number,
  kv: number,
  angleU: number,
  angleV: number,
}

interface UnderlyingEdgeInNode {
  range: [number, number],
  angle: number,
  newAngle: number,
  eKey?: string,
  nid?: string
}

interface AngleParam {
  range: [number, number],
  angle: number,
  newAngle: number,
  eKey: string,
  nid: string
}

type Network = {[oid: string]: {[did: string]: number}}

type Arrow = Array<{toid: string, value: number}>

interface GeoNetwork {
  arrows: {[eKey: string]: Arrow}, // 需要按照v排个序
  id: string,
  g: Network,
  w: number,
  eKeys: string[],
  merged: boolean,
  level: number,
  children: string[],
  parent: string
  edgeWeightDict: {[eKey: string]: number},
  eKeysDirectionAware: string[],
  edgeWeightDictDirectionAware: {[eKey: string]: number},
  nodeSizeDictLocal: {[nid: string]: number},
  edgePositionDict?: {[eKey: string]: number},
  tmpBinary?: string,
  color: string,
  maxWeightAcrossEdge: number
}

type ForegroundEdge = {
  arrow: Arrow,
  w: number,
  gid: string,
  order?: number
}

type ForegroundEdgesIndex = {[uvid: string]: ForegroundEdge[]}
type NodeByNodeTmp = {[nid: string]: string[]}

interface GeoNeighbor {
  nnid: string
  nid: string
  angle: number, // 屏幕的正右方为0，顺时针;180-360的要特殊处理
  numberOfIndividuals: number,
  special: boolean,
  eKey: string,
  slot: [number, number] // 左闭右开
}
type NodeByNode = {[nid: string]: GeoNeighbor[]}

interface CurveParameter {
  x: number,
  y: number,
  k: number,
  key?: string,
  nnid: string,
  angle: number
}

interface LineEnd {
  eKey: string,
  x: number,
  y: number,
  w: number,
  k: number,
  a: number,
  tangentShift: number
}

interface PathParam {
  w: number,
  d: string,
  gid: string,
  dashArray?: string
}

interface VirtualNode {
  x: number,
  y: number,
  r: number,
  gid: string,
  ends: LineEnd[],
  // validEnds: LineEnd[],
  paths: PathParam[],
  intersectType?: string,
  intersection?: ScreenPoint
}

type ConnectionGraph = {[gid: string]: {
  intersect: Set<string>,
  adjacent: Set<string>,
  sameEdge: Set<string>,
}}

type SpecialLevelDict = {[gid: string]: {selfLevel: number, nextLevel: number}}
