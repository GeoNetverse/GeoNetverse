/// <reference path="typings/index.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>

'use strict'

import * as fs from 'fs'
import { recursion } from '../src/utils/optimize'
import { coloring } from '../src/utils/coloring'

// TODO:
// 1.读取geoNetworks as geoNetworksTmp
// 2.读取background as backgroundTmp
// 3.读取screenNodes as screenNodesTmp
// 4.读取geoNetworkIndex as geoNetworkIndexTmp

import datasetName from './constant'


const dataset = datasetName

const fEdgesIndexFistLevelResp = fs.readFileSync('public/' + dataset + '/fEdgesIndexFistLevel.json')
const fEdgesIndexFistLevel: ForegroundEdgesIndex = JSON.parse(fEdgesIndexFistLevelResp.toString())

const nodeByNodeResp = fs.readFileSync('public/' + dataset + '/nodeByNode.json')
const nodeByNode: NodeByNode = JSON.parse(nodeByNodeResp.toString())

const geoNetworksResp = fs.readFileSync('public/' + dataset + '/geoNetworksTmp.json')
const geoNetworks: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())

const startTime = performance.now()

const geoNetworkIndex: {[gid: string]: GeoNetwork} = {}
for (const geoNetwork of geoNetworks) {
  geoNetworkIndex[geoNetwork.id] = geoNetwork
}

const clusteredGeoNetworks0 = geoNetworks.filter(g => g.level === 0)

// 给地0层赋予order
for (const eKey in fEdgesIndexFistLevel) {
  const fEdges = fEdgesIndexFistLevel[eKey]
  fEdges.forEach((fEdge, order) => {
    if (!geoNetworkIndex[fEdge.gid].edgePositionDict) {
      geoNetworkIndex[fEdge.gid].edgePositionDict = {}
    }
    (geoNetworkIndex[fEdge.gid].edgePositionDict as {[eKey: string]: number})[eKey] = order
  })
}
// 递归地进行优化
let tag = 0
for (const g of clusteredGeoNetworks0) {
  console.log(tag++, clusteredGeoNetworks0.length)
  recursion(g, geoNetworkIndex, nodeByNode)
}

// 上色
console.log('before coloring')
const { colorDict, mergedLabels } = coloring(geoNetworks, geoNetworkIndex, fEdgesIndexFistLevel, nodeByNode)
console.log('after coloring')

const endTime = performance.now()
console.log(`took ${endTime - startTime} milliseconds`)

// 5.删除geoNetworksTmp
// 6.删除backgroundTmp
// 7.删除screenNodesTmp
// 8.删除geoNetworkIndexTmp

// 9.输出geoNetworks
// 10.输出background
// 11.输出screenNodes
// 12.输出geoNetworkIndex

// debug mode: hide below
const colorDictStr = JSON.stringify(colorDict, null, '\t')
fs.writeFile('public/' + dataset + '/colorDict.json', colorDictStr, function (err) {
  if (err) { console.log('Server is error...') }
})

const clusteredGeoNetworkIndexStr = JSON.stringify(geoNetworkIndex, null, '\t')
fs.writeFile('public/' + dataset + '/clusteredGeoNetworkIndex.json', clusteredGeoNetworkIndexStr, function (err) {
  if (err) { console.log('Server is error...') }
})

const fEdgesIndexFistLevelStr = JSON.stringify(fEdgesIndexFistLevel, null, '\t')
fs.writeFile('public/' + dataset + '/fEdgesIndexFistLevel.json', fEdgesIndexFistLevelStr, function (err) {
  if (err) { console.log('Server is error...') }
})
