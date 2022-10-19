/// <reference path="typings/index.d.ts"/>
/// <reference path="typings/ilp.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>

// recover orderDict by generating fedgeIndex
'use strict'

import * as fs from 'fs'
import { generateWeightedFEdgesIndex } from '../../frontend/src/utils/generateFEdgeIndex'

import datasetName from './constant'

const dataset = datasetName

const variablesResp = fs.readFileSync('public/' + dataset + '/tmp/variables.json')
const variables: number[] = JSON.parse(variablesResp.toString())

const variableIndexResp = fs.readFileSync('public/' + dataset + '/tmp/variableIndex.json')
const variableIndex: {[key: string]: number} = JSON.parse(variableIndexResp.toString())

const regardedNetworksOfEdgeArrayResp = fs.readFileSync('public/' + dataset + '/tmp/regardedNetworksOfEdgeArray.json')
const regardedNetworksOfEdgeArray: {[ekey: string]: string[]} = JSON.parse(regardedNetworksOfEdgeArrayResp.toString())

const geoNetworksResp = fs.readFileSync('public/' + dataset + '/geoNetworksTmp.json')
const geoNetworks: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())

const startTime = performance.now()

const geoNetworkIndex: {[gid: string]: GeoNetwork} = {}
for (const geoNetwork of geoNetworks) {
  geoNetworkIndex[geoNetwork.id] = geoNetwork
}

const geoNetworks0 = geoNetworks.filter(g => g.level === 0)
const fEdgesIndex0 = generateWeightedFEdgesIndex(geoNetworks0) // 这里怕不是所有的？
const fEdgesIndexNew0: ForegroundEdgesIndex = {}

// console.log(variables[609], variables[612], variables[1068], variables[1069], variables[1070])
// console.log(variables[554]) // 0
// console.log(variableIndex['2_92-2_89-2_79-2_9-3_43-2_97#17011_17012#1020_17011#2_58-2_8-2_5-2_77-2_30-2_6-2_0-2_78-1_1#17011_17012#1020_17011#17011'])

// console.log(variables[855]) // 0
// console.log(variableIndex['2_58-2_8-2_5-2_77-2_30-2_6-2_0-2_78-1_1#2_92-2_89-2_79-2_9-3_43-2_97#1020_17011'])

// console.log(variables[1196]) // 0
// console.log(variableIndex['2_58-2_8-2_5-2_77-2_30-2_6-2_0-2_78-1_1#2_92-2_89-2_79-2_9-3_43-2_97#17011_17012'])

// console.log(variables[865]) // 1
// console.log(variableIndex['2_92-2_89-2_79-2_9-3_43-2_97#2_58-2_8-2_5-2_77-2_30-2_6-2_0-2_78-1_1#1020_17011'])

// console.log(variables[1192]) // 1
// console.log(variableIndex['2_92-2_89-2_79-2_9-3_43-2_97#2_58-2_8-2_5-2_77-2_30-2_6-2_0-2_78-1_1#17011_17012'])

// 609, 612

// 832个交叉决策变量
const eKeys = Object.keys(regardedNetworksOfEdgeArray)
for (const eKey of eKeys) {
  const regardedNetworks = regardedNetworksOfEdgeArray[eKey]
  const regardedNetworksSet = new Set(regardedNetworks)
  const orderDict: {[gid: string]: number} = {}
  // regardedNetworks.forEach((gid, i) => {
  //   orderDict[gid] = i
  // })

  // 开始排序
  regardedNetworks.forEach((curgid, curi) => {
    let tmpOrder = 0
    regardedNetworks.forEach((othergid, otheri) => {
      if (curi !== otheri) {
        const key = `${curgid}#${othergid}#${eKey}`
        const index = variableIndex[key]
        const v = variables[index]

        if (v === 1) {
          tmpOrder += 1
        }

        // double check
        const key2 = `${othergid}#${curgid}#${eKey}`
        const index2 = variableIndex[key2]
        const v2 = variables[index2]
        if ((v + v2) !== 1) {
          console.log('something wrong', v, v2)
        }
      }
    })
    orderDict[curgid] = tmpOrder
  })

  const order: ForegroundEdge[] = []
  for (const gid in orderDict) {
    order.push({
      arrow: geoNetworkIndex[gid].arrows[eKey],
      w: geoNetworkIndex[gid].edgeWeightDict[eKey],
      gid,
      order: orderDict[gid]
    })
  }
  order.sort((a, b) => (a.order as number) - (b.order as number))
  // 剩下的直接根据fEdgesIndex添加进去？

  // const [oid, did] = eKey.split('_')
  // const reverseKey = `${did}_${oid}` // for direction-aware clustering
  // const fEdges = eKey in fEdgesIndex0 ? fEdgesIndex0[eKey] : fEdgesIndex0[reverseKey]
  for (const fe of fEdgesIndex0[eKey]) {
    if (!regardedNetworksSet.has(fe.gid)) {
      order.push(fe)
    }
  }

  fEdgesIndexNew0[eKey] = order

  // if (eKey === '17011_17012') {
  //   console.log(orderDict)
  //   console.log(order)
  // }
}

const endTime = performance.now()
console.log(`took ${endTime - startTime} milliseconds`)

const fEdgesIndexFistLevelStr = JSON.stringify(fEdgesIndexNew0, null, '\t')
fs.writeFile('public/' + dataset + '/fEdgesIndexFistLevel.json', fEdgesIndexFistLevelStr, function (err) {
  if (err) { console.log('Server is error...') }
})
