/// <reference path="typings/index.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>

'use strict'

import { indexScreenNodes } from '../src/utils/indexScreenNodes'
import { retrieveEdgesInNetwork } from '../src/utils/retrieveEKeys'
import { hierarchyClusteringNetworks } from '../src/utils/hierarchyClusteringNetworks'
import { backgroundCalculator } from '../src/utils/backgroundCalculator'
import { indexNodeByNode } from '../src/utils/indexNodeByNode'
import { coloring } from '../src/utils/coloring'
import { retriveByLevel } from '../src/utils/retriveByLevel'
import { optimize, recursion } from '../src/utils/optimize'

// const fs = require('fs')
// import fs from 'fs'
import * as fs from 'fs'
// @ts-ignore
import { performance } from 'perf_hooks'

import datasetName from './constant'

const dataset = datasetName

const geoNodesResp = fs.readFileSync('public/' + dataset + '/geo-nodes-screen.json')
const screenNodes: ScreenNode[] = JSON.parse(geoNodesResp.toString())
const geoNetworksResp = fs.readFileSync('public/' + dataset + '/geo-networks.json')
const geoNetworksRaw: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())

const used1 = process.memoryUsage().heapUsed / 1024 / 1024
console.log(`The script uses approximately ${Math.round(used1 * 100) / 100} MB`)

const startTime = performance.now()
const screenNodeIndex = indexScreenNodes(screenNodes)
for (const geoNetwork of geoNetworksRaw) {
  // const [eKeys, edgeWeightDict, nodeSizeDict] = dataset === 'zhengzhou' ? retrieveEdgesInNetworkNoBidirection(geoNetwork) : retrieveEdgesInNetwork(geoNetwork)
  const [eKeys, edgeWeightDict, nodeSizeDict, eKeysDirectionAware, edgeWeightDictDirectionAware] = retrieveEdgesInNetwork(geoNetwork)
  geoNetwork.nodeSizeDictLocal = nodeSizeDict
  geoNetwork.eKeys = eKeys
  geoNetwork.edgeWeightDict = edgeWeightDict
  geoNetwork.eKeysDirectionAware = eKeysDirectionAware
  geoNetwork.edgeWeightDictDirectionAware = edgeWeightDictDirectionAware
  geoNetwork.level = -1
  geoNetwork.merged = false
  geoNetwork.children = []
  geoNetwork.parent = ''
  geoNetwork.maxWeightAcrossEdge = 0
  // 这是最原始的图
  const arrows: {[eKey: string]: Arrow} = {}
  // const w = geoNetwork.w
  for (const eKey of eKeys) {
    const w = geoNetwork.edgeWeightDict[eKey]
    const [uid, vid] = eKey.split('_')
    const toUValue = (vid in geoNetwork.g && uid in geoNetwork.g[vid]) ? w : 0
    const toVValue = (uid in geoNetwork.g && vid in geoNetwork.g[uid]) ? w : 0
    arrows[eKey] = [{ toid: uid, value: toUValue }, { toid: vid, value: toVValue }]
    // 注定了第一个是tou的 第二个是tov的
  }
  geoNetwork.arrows = arrows
}

const background = backgroundCalculator(screenNodes, geoNetworksRaw)
const nodeByNode = indexNodeByNode(screenNodeIndex, background)

const used2 = process.memoryUsage().heapUsed / 1024 / 1024
console.log(`The script uses approximately ${Math.round(used2 * 100) / 100} MB`)

// @ts-ignore
const directionAware = dataset === 'zhengzhou' || dataset === 'hefei'
const { geoNetworks, geoNetworkIndex } = hierarchyClusteringNetworks(geoNetworksRaw, background, screenNodes, nodeByNode, directionAware)
// const clusteredGeoNetworks = geoNetworks 目前没用到
for (const geoNetwork of geoNetworks) {
  let m = 0
  for (const eKey in geoNetwork.edgeWeightDict) {
    m = Math.max(m, geoNetwork.edgeWeightDict[eKey])
  }
  geoNetwork.maxWeightAcrossEdge = m
}
// const clusteredGeoNetworkIndex = geoNetworkIndex

const endTime = performance.now()
console.log(`took ${endTime - startTime} milliseconds`)

const used3 = process.memoryUsage().heapUsed / 1024 / 1024
console.log(`The script uses approximately ${Math.round(used3 * 100) / 100} MB`)

// TODO:
// 1.输出geoNetworks as geoNetworksTmp
// 2.输出background as backgroundTmp
// 3.输出screenNodes as screenNodesTmp
// 4.输出geoNetworkIndex as geoNetworkIndexTmp

const geoNetworksStr = JSON.stringify(geoNetworks, null, '\t')
fs.writeFile('public/' + dataset + '/geoNetworksTmp.json', geoNetworksStr, function (err) {
  if (err) { console.log('Server is error...') }
})


const backgroundStr = JSON.stringify(background, null, '\t')
fs.writeFile('public/' + dataset + '/background.json', backgroundStr, function (err) {
  if (err) { console.log('Server is error...') }
})

const nodeByNodeStr = JSON.stringify(nodeByNode, null, '\t')
fs.writeFile('public/' + dataset + '/nodeByNode.json', nodeByNodeStr, function (err) {
  if (err) { console.log('Server is error...') }
})
