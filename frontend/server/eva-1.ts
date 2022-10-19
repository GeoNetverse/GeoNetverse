/// <reference path="typings/index.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>
/// <reference path="typings/ilp.d.ts"/>

'use strict'
import * as fs from 'fs'

import { retriveByLevel } from '../src/utils/retriveByLevel'
import { ilpModel } from '../src/utils/ilpModelling'
import { join, shuffle } from 'lodash'

// @ts-ignore
import JSONStream from 'JSONStream'
// @ts-ignore
import es from 'event-stream'
// import { computeOverlapSimple } from '../../frontend/src/utils/optimize'

// airvis has the max level of 14 (3), nin level of 0
// const dataset = 'airvis'
// const minlevel = 0
// const maxlevel = 3

// aircas has the max level of 2, nin level of 0
// const dataset = 'aircas'
// const minlevel = 0
// const maxlevel = 2

// viscas has the max level of 2, nin level of 0
// const dataset = 'viscas'
// const minlevel = 0
// const maxlevel = 2

// zhengzhou has the max level of 2, nin level of 0
// const dataset = 'zhengzhou'
// const minlevel = 0
// const maxlevel = 2

// hefei has the max level of 3, nin level of 0
const dataset = 'hefei'
const minlevel = 0
const maxlevel = 3

const fEdgesIndexFistLevelResp = fs.readFileSync('public/' + dataset + '/fEdgesIndexFistLevel.json')
const fEdgesIndexFistLevel: ForegroundEdgesIndex = JSON.parse(fEdgesIndexFistLevelResp.toString())
const nodeByNodeResp = fs.readFileSync('public/' + dataset + '/nodeByNode.json')
const nodeByNode: NodeByNode = JSON.parse(nodeByNodeResp.toString())
const clusteredGeoNetworkIndexResp = fs.readFileSync('public/' + dataset + '/clusteredGeoNetworkIndex.json')
const clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork} = JSON.parse(clusteredGeoNetworkIndexResp.toString())
const geoNodesResp = fs.readFileSync('public/' + dataset + '/geo-nodes-screen.json')
const screenNodes: ScreenNode[] = JSON.parse(geoNodesResp.toString())

const computeOverlapSimple = (fEdgesIndex: ForegroundEdgesIndex, screenNode: ScreenNode, nodeByNode: NodeByNode) => {
  const cnid = screenNode.nid // center node's id
  let overlapMeasure = 0
  let count = 0

  let nSlot = 0
  if (!(cnid in nodeByNode)) {
    return { count: 0, measure: 0 }
  }
  const neighboringNodes = nodeByNode[cnid]
  for (const neighboringNode of neighboringNodes) {
    const eKey = neighboringNode.eKey
    neighboringNode.numberOfIndividuals = fEdgesIndex[eKey].length
    neighboringNode.slot = [nSlot, nSlot + fEdgesIndex[eKey].length]
    nSlot += nSlot + fEdgesIndex[eKey].length
  }

  const networkCodeDict: {[gid: string]: { code: number, w: number, eKey: string }[]} = {}
  for (const neighboringNode of neighboringNodes) {
    const eKey = neighboringNode.eKey
    const special = neighboringNode.special
    fEdgesIndex[eKey].forEach((fEdge, i) => {
      const w = fEdge.w
      const code = special ? (neighboringNode.slot[1] - i - 1) : (neighboringNode.slot[0] + i)
      if (fEdge.gid in networkCodeDict) {
        networkCodeDict[fEdge.gid].push({ code, w, eKey })
      } else {
        networkCodeDict[fEdge.gid] = [{ code, w, eKey }]
      }
    })
  }

  // new counter
  // type CodePair = [number, number, number, string, string, string]
  // const gids = Object.keys(networkCodeDict)
  // for (const gidI of gids) {
  //   const codePairsI: CodePair[] = []
  //   const tempCodes = networkCodeDict[gidI]
  //   if (tempCodes.length < 2) {
  //     continue
  //   } else {
  //     for (let i = 0; i < tempCodes.length; i += 1) {
  //       for (let j = 0; j < tempCodes.length; j += 1) {
  //         if (i < j) {
  //           const w = Math.max(tempCodes[i].w, tempCodes[j].w)
  //           const codePair: CodePair = tempCodes[i].code > tempCodes[j].code ? [tempCodes[j].code, tempCodes[i].code, w, tempCodes[j].eKey, tempCodes[i].eKey, gidI] : [tempCodes[i].code, tempCodes[j].code, w, tempCodes[i].eKey, tempCodes[j].eKey, gidI]
  //           codePairsI.push(codePair)
  //         }
  //       }
  //     }
  //   }
  //   for (const gidJ of gids) {
  //     if (gidI !== gidJ) {
  //       const codePairsJ: CodePair[] = []
  //       const tempCodes = networkCodeDict[gidJ]
  //       if (tempCodes.length < 2) {
  //         continue
  //       } else {
  //         for (let i = 0; i < tempCodes.length; i += 1) {
  //           for (let j = 0; j < tempCodes.length; j += 1) {
  //             if (i < j) {
  //               const w = Math.max(tempCodes[i].w, tempCodes[j].w)
  //               const codePair: CodePair = tempCodes[i].code > tempCodes[j].code ? [tempCodes[j].code, tempCodes[i].code, w, tempCodes[j].eKey, tempCodes[i].eKey, gidJ] : [tempCodes[i].code, tempCodes[j].code, w, tempCodes[i].eKey, tempCodes[j].eKey, gidJ]
  //               codePairsJ.push(codePair)
  //             }
  //           }
  //         }
  //       }
  //       // codePairsJ, codePairsI
  //       // 构造图
  //       for (const codePairI of codePairsI) {

  //       }

  //     }
  //   }
  // }

  // new counter end

  type CodePair = [number, number, number, string, string, string]

  const codePairs: CodePair[] = [] // 自己和自己会不会交叉都无所谓，都放一起好了
  for (const gid in networkCodeDict) {
    const tempCodes = networkCodeDict[gid]
    // if (tempCodes.length < 2 && screenNode.nid === '0') {
    //   console.log('tempCodes.length < 2', gid)
    // }
    if (tempCodes.length === 2) {
      const w = Math.max(tempCodes[0].w, tempCodes[1].w)
      if (tempCodes[0].code > tempCodes[1].code) {
        codePairs.push([tempCodes[1].code, tempCodes[0].code, w, tempCodes[1].eKey, tempCodes[0].eKey, gid] as CodePair)
      } else {
        codePairs.push([tempCodes[0].code, tempCodes[1].code, w, tempCodes[0].eKey, tempCodes[1].eKey, gid] as CodePair)
      }
    } else if (tempCodes.length > 2) {
      for (let i = 0; i < tempCodes.length; i += 1) {
        for (let j = 0; j < tempCodes.length; j += 1) {
          if (i < j) {
            const w = Math.max(tempCodes[i].w, tempCodes[j].w)
            const codePair: CodePair = tempCodes[i].code > tempCodes[j].code ? [tempCodes[j].code, tempCodes[i].code, w, tempCodes[j].eKey, tempCodes[i].eKey, gid] : [tempCodes[i].code, tempCodes[j].code, w, tempCodes[i].eKey, tempCodes[j].eKey, gid]
            codePairs.push(codePair)
          }
        }
      }
    }
  }

  // if (screenNode.nid === '0') {
  //   console.log(codePairs)
  // }

  // 应该至少有一个相等的才是可避免的
  for (let i = 0; i < codePairs.length; i += 1) {
    for (let j = 0; j < codePairs.length; j += 1) {
      if (i < j) {
        const eKeySetI = new Set([codePairs[i][3], codePairs[i][4]])
        const eKeySetJ = new Set([codePairs[j][3], codePairs[j][4]])
        const intersect = new Set([...eKeySetI].filter(x => eKeySetJ.has(x)))
        if (intersect.size === 0) {
          continue
        }

        if (codePairs[i][0] < codePairs[j][0] && codePairs[j][0] < codePairs[i][1] && codePairs[i][1] < codePairs[j][1]) {
          overlapMeasure += codePairs[i][2] * codePairs[j][2] // w * w
          count += 1
        }
        if (codePairs[j][0] < codePairs[i][0] && codePairs[i][0] < codePairs[j][1] && codePairs[j][1] < codePairs[i][1]) {
          overlapMeasure += codePairs[i][2] * codePairs[j][2] // w * w
          count += 1
        }
      }
    }
  }

  return { count, measure: overlapMeasure }
}

for (let level = 0; level <= maxlevel; level += 1) {
  const { fEdgesIndex, renderedGeoNetworkIDs } = retriveByLevel(
    clusteredGeoNetworkIndex,
    fEdgesIndexFistLevel,
    level,
    {}
  )
  // ===================我们的方法============
  let countAcc = 0
  let measureAcc = 0
  console.log('\n start level of ', level)
  for (const screenNode of screenNodes) {
    const { count, measure } = computeOverlapSimple(fEdgesIndex, screenNode, nodeByNode)
    countAcc += count
    measureAcc += Math.round(measure / 1000)
  }
  console.log('level: ', level, '; #g:', renderedGeoNetworkIDs.size, '; countAcc: ', countAcc, '; measureAcc: ', measureAcc)

  // ===================随机方法============

  console.log('========Random==========')
  console.log('\n start level of ', level)
  // Shuffle
  for (let iter = 0; iter < 10; iter += 1) {
    countAcc = 0
    measureAcc = 0
    for (const eKey in fEdgesIndex) {
      const fEdges = shuffle(fEdgesIndex[eKey])
      fEdgesIndex[eKey] = fEdges
    }

    for (const screenNode of screenNodes) {
      const { count, measure } = computeOverlapSimple(fEdgesIndex, screenNode, nodeByNode)
      countAcc += count
      measureAcc += Math.round(measure / 1000)
    }
    console.log('level: ', level, '; #g:', renderedGeoNetworkIDs.size, '; countAcc: ', countAcc, '; measureAcc: ', measureAcc)
  }

  // if (level === 4) {
  //   const geoNetworks: GeoNetwork[] = []
  //   for (const gid of renderedGeoNetworkIDs) {
  //     geoNetworks.push(clusteredGeoNetworkIndex[gid])
  //   }

  //   const { ret, regardedNetworksOfEdgeArray, variableIndex } = ilpModel(geoNetworks, nodeByNode, screenNodes)

  //   console.log(ret.leftMatrix.length)
  //   console.log(ret.leftMatrix[0].length)
  // }

  // ============直接用ILP==========
  if (level <= maxlevel) {
    const geoNetworks: GeoNetwork[] = []
    for (const gid of renderedGeoNetworkIDs) {
      geoNetworks.push(clusteredGeoNetworkIndex[gid])
    }

    const { ret, regardedNetworksOfEdgeArray, variableIndex } = ilpModel(geoNetworks, nodeByNode, screenNodes)

    console.log(ret.leftMatrix.length)
    console.log(ret.leftMatrix[0].length)

    const out = fs.createWriteStream('public/' + dataset + '/tmp/ilpParam-' + level + '.json')

    es.readable(function (count: any, next: any) {
      for (const key in ret) {
        // @ts-ignore
        this.emit('data', [key, ret[key]])
      }
      // @ts-ignore
      this.emit('end')
      next()
    }).pipe(JSONStream.stringifyObject()).pipe(out)

    const variableIndexStr = JSON.stringify(variableIndex)
    fs.writeFile('public/' + dataset + '/tmp/variableIndex-' + level + '.json', variableIndexStr, function (err) {
      if (err) { console.log('Server is error...') }
    })
  }
}
