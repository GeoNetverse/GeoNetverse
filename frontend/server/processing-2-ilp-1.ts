/// <reference path="typings/index.d.ts"/>
/// <reference path="typings/ilp.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>

'use strict'

import * as fs from 'fs'
// @ts-ignore
import { performance } from 'perf_hooks'
import { ilpModel } from '../src/utils/ilpModelling'

import datasetName from './constant'

const dataset = datasetName

const geoNetworksResp = fs.readFileSync('public/' + dataset + '/geoNetworksTmp.json')
const geoNetworks: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())

const backgroundResp = fs.readFileSync('public/' + dataset + '/background.json')
const background: Background = JSON.parse(backgroundResp.toString())

const nodeByNodeResp = fs.readFileSync('public/' + dataset + '/nodeByNode.json')
const nodeByNode: NodeByNode = JSON.parse(nodeByNodeResp.toString())

const geoNodesResp = fs.readFileSync('public/' + dataset + '/geo-nodes-screen.json')
const screenNodes: ScreenNode[] = JSON.parse(geoNodesResp.toString())

// ************对第0层的布局进行优化*********************

const startTime = performance.now()
const clusteredGeoNetworks0 = geoNetworks.filter(g => g.level === 0)
// console.log(geoNetworks)

const { ret, regardedNetworksOfEdgeArray, variableIndex } = ilpModel(clusteredGeoNetworks0, nodeByNode, screenNodes)

const endTime = performance.now()
console.log(`took ${endTime - startTime} milliseconds`)

const retStr = JSON.stringify(ret)
fs.writeFile('public/' + dataset + '/tmp/ilpParam.json', retStr, function (err) {
  if (err) { console.log('Server is error...') }
})

const regardedNetworksOfEdgeArrayStr = JSON.stringify(regardedNetworksOfEdgeArray)
fs.writeFile('public/' + dataset + '/tmp/regardedNetworksOfEdgeArray.json', regardedNetworksOfEdgeArrayStr, function (err) {
  if (err) { console.log('Server is error...') }
})

const variableIndexStr = JSON.stringify(variableIndex)
fs.writeFile('public/' + dataset + '/tmp/variableIndex.json', variableIndexStr, function (err) {
  if (err) { console.log('Server is error...') }
})
