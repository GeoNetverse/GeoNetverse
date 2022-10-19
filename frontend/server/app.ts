/// <reference path="typings/index.d.ts"/>

'use strict'

import express from 'express'
import { hierarchyClusteringNetworks } from '../../frontend/src/utils/hierarchyClusteringNetworks'
import { backgroundCalculator } from '../../frontend/src/utils/backgroundCalculator'
import { indexScreenNodes } from '../../frontend/src/utils/indexScreenNodes'
import { indexNodeByNode } from '../../frontend/src/utils/indexNodeByNode'
import { retriveByLevel } from '../../frontend/src/utils/retriveByLevel'
import { getTotalIDsByRoot, getFS } from '../../frontend/src/utils/traverseTreeForIDs'
import { indexPassingGeoNetworksByNode } from '../../frontend/src/utils/indexPassingNetwork'
import { optimizeBackground } from '../../frontend/src/utils/optimizeBackground'
import {Children} from "react";
// const express = require('express')
const fs = require('fs')
const bodyParser = require('body-parser')
// const router = express.Router()
const app = express()
const port = 3001

const cors = require('cors')
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/test', (req: any, res: any) => {
  res.send('Hello World!')
  console.log('get')
})

interface Dataset {
  colors: {[gid: string]: string},
  fEdgesIndexFistLevel: ForegroundEdgesIndex,
  background: Background,
  nodeByNode: NodeByNode,
  clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork}
}
let dataset: Dataset | undefined
const specialLevelDict: SpecialLevelDict = {}

app.post('/setData', function (req, res) {
  const datasetName: string = req.body.datasetName
  console.log('receive the post request of setData', datasetName)
  const colorsResp = fs.readFileSync('public/' + datasetName + '/colorDict.json')
  const colors: {[gid: string]: string} = JSON.parse(colorsResp.toString())
  const fEdgesIndexFistLevelResp = fs.readFileSync('public/' + datasetName + '/fEdgesIndexFistLevel.json')
  const fEdgesIndexFistLevel: ForegroundEdgesIndex = JSON.parse(fEdgesIndexFistLevelResp.toString())
  const backgroundResp = fs.readFileSync('public/' + datasetName + '/background.json')
  const background: Background = JSON.parse(backgroundResp.toString())
  const nodeByNodeResp = fs.readFileSync('public/' + datasetName + '/nodeByNode.json')
  const nodeByNode: NodeByNode = JSON.parse(nodeByNodeResp.toString())
  const clusteredGeoNetworkIndexResp = fs.readFileSync('public/' + datasetName + '/clusteredGeoNetworkIndex.json')
  const clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork} = JSON.parse(clusteredGeoNetworkIndexResp.toString())

  dataset = {
    colors,
    fEdgesIndexFistLevel,
    background,
    nodeByNode,
    clusteredGeoNetworkIndex
  }

  res.sendStatus(200)
})

// const colorsResp = fs.readFileSync('public/airvis/colorDict.json')
// const colors: {[gid: string]: string} = JSON.parse(colorsResp.toString())
// const geoNodesResp = fs.readFileSync('public/airvis/geo-nodes-screen.json')
// const screenNodes: ScreenNode[] = JSON.parse(geoNodesResp.toString())
// const geoNetworksResp = fs.readFileSync('public/airvis/geo-networks.json')
// const geoNetworks: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())
// const fEdgesIndexFistLevelResp = fs.readFileSync('public/airvis/fEdgesIndexFistLevel.json')
// const fEdgesIndexFistLevel: ForegroundEdgesIndex = JSON.parse(fEdgesIndexFistLevelResp.toString())
// const backgroundResp = fs.readFileSync('public/airvis/background.json')
// const background: Background = JSON.parse(backgroundResp.toString())
// const nodeByNodeResp = fs.readFileSync('public/airvis/nodeByNode.json')
// const nodeByNode: NodeByNode = JSON.parse(nodeByNodeResp.toString())
// const clusteredGeoNetworkIndexResp = fs.readFileSync('public/airvis/clusteredGeoNetworkIndex.json')
// const clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork} = JSON.parse(clusteredGeoNetworkIndexResp.toString())

// const screenNodeIndex = indexScreenNodes(screenNodes)

// global variable
// let screenNodes: ScreenNode[] = []
// let geoNetworks: GeoNetwork[] = []
// let background: Background = { nodeSizeDict: {}, edgeSizeDict: {} }
// let nodeByNode: NodeByNode = {}
// let clusteredGeoNetworks: GeoNetwork[] = []
// let clusteredGeoNetworkIndex: {[gid: string]: GeoNetwork} = {}
// let fEdgesIndexFistLevel: ForegroundEdgesIndex = {}
let renderedGeoNetworks: string[] = []

// app.post('/setData', function (req, res) {
//   console.log('receive the post request of clustering')

//   const data: { screenNodes: ScreenNode[], geoNetworks: GeoNetwork[] } = req.body
//   screenNodes = data.screenNodes
//   geoNetworks = data.geoNetworks
//   screenNodeIndex = indexScreenNodes(screenNodes)

//   console.log('responsing the post request of clustering')
//   res.send('done')
// })

// app.post('/clustering', function (req, res) {
//   console.log('receive the post request of clustering')

//   const geoNetworksRaw: GeoNetwork[] = req.body
//   const { geoNetworks, geoNetworkIndex, fEdgesIndex0 } = hierarchyClusteringNetworks(geoNetworksRaw, background, screenNodes, nodeByNode)
//   clusteredGeoNetworks = geoNetworks
//   clusteredGeoNetworkIndex = geoNetworkIndex
//   fEdgesIndexFistLevel = fEdgesIndex0

//   // const level = 5
//   // const fEdgeIndex = retriveByLevel(geoNetworks, geoNetworkIndex, fEdgesIndex0, level)

//   console.log('responsing the post request of clustering')
//   res.json(geoNetworks)
// })

app.post('/retrieve', function (req, res) {
  console.log('receive the post request of retrieve')

  const level: number = req.body.level
  console.log('level', level)

  // detect special level
  const validSpecialLevelDict: SpecialLevelDict = {}
  for (const gid in specialLevelDict) {
    if (specialLevelDict[gid].selfLevel >= level) {
      validSpecialLevelDict[gid] = specialLevelDict[gid]
    }
  }

  console.log(validSpecialLevelDict)

  const { fEdgesIndex, renderedGeoNetworkIDs } = retriveByLevel(
    (dataset as Dataset).clusteredGeoNetworkIndex,
    (dataset as Dataset).fEdgesIndexFistLevel,
    level,
    validSpecialLevelDict
  )
  renderedGeoNetworks = Array.from(renderedGeoNetworkIDs)

  const maxWeightAcrossEdgeDict: {[gid: string]: number} = {}
  for (const gid of renderedGeoNetworks) {
    maxWeightAcrossEdgeDict[gid] = (dataset as Dataset).clusteredGeoNetworkIndex[gid].maxWeightAcrossEdge
  }

  console.log('responsing the post request of retrieve')
  // res.json(fEdgesIndex)
  res.json({
    maxWeightAcrossEdgeDict,
    renderedGeoNetworks,
    fEdgesIndex
  })
})

app.get('/obtainColors', function (req, res) {
  console.log('receive the GET request of obtainColors')

  // background = backgroundCalculator(screenNodes, geoNetworks)
  // nodeByNode = indexNodeByNode(screenNodeIndex, background)

  console.log('responsing the GET request of obtainColors')
  res.json((dataset as Dataset).colors)
})

app.get('/obtainFS', function (req, res) {
  console.log('receive the GET request of obtainFS')
  console.log('responsing the GET request of obtainColors')
  const FS = getFS((dataset as Dataset).clusteredGeoNetworkIndex)
  res.json(FS)
})

app.get('/background', function (req, res) {
  console.log('receive the GET request of background')

  // background = backgroundCalculator(screenNodes, geoNetworks)
  // nodeByNode = indexNodeByNode(screenNodeIndex, background)

  console.log('responsing the GET request of background')
  res.json((dataset as Dataset).background)
})

app.get('/getNodeByNode', function (req, res) {
  console.log('receive the post request of getNodeByNode')

  // background = backgroundCalculator(screenNodes, geoNetworks)
  // nodeByNode = indexNodeByNode(screenNodeIndex, background)

  console.log('responsing the post request of getNodeByNode')
  res.json((dataset as Dataset).nodeByNode)
})

app.get('/getPassingNetworkIndex', function (req, res) {
  console.log('receive the post request of getPassingNetworkIndex')
  const renderedGeoNetworkIDs = renderedGeoNetworks
  const gs = renderedGeoNetworkIDs.map(gid => (dataset as Dataset).clusteredGeoNetworkIndex[gid])
  const index = indexPassingGeoNetworksByNode(gs, false)

  // background = backgroundCalculator(screenNodes, geoNetworks)
  // nodeByNode = indexNodeByNode(screenNodeIndex, background)

  console.log('responsing the post request of getPassingNetworkIndex')
  res.json(index)
})

app.get('/getInvolvedNetworkIndex', function (req, res) {
  console.log('receive the post request of getInvolvedNetworkIndex')
  const renderedGeoNetworkIDs = renderedGeoNetworks
  const gs = renderedGeoNetworkIDs.map(gid => (dataset as Dataset).clusteredGeoNetworkIndex[gid])
  const index = indexPassingGeoNetworksByNode(gs, true)

  // background = backgroundCalculator(screenNodes, geoNetworks)
  // nodeByNode = indexNodeByNode(screenNodeIndex, background)

  console.log('responsing the post request of getInvolvedNetworkIndex')
  res.json(index)
})

// router.post('/clustering', (request, response) => {
//   // code to perform particular action.
//   // To access POST variable use req.body()methods.
//   console.log(request.body)
//   response.send('Add a book')
// })

app.post('/setSpecialLevel', function (req, res) {
  console.log('receive the post request of setSpecialLevel')
  const merge: boolean = req.body.is_back
  const level: number = req.body.level // 当前系统整体的level，好像没啥用
  const gid: string = req.body.gid
  if (gid === '') {
    for (const item in specialLevelDict) delete specialLevelDict[item]
    res.json({
      status: 200
    })
    return null
  }
  let splitable = false; let mergeable = false
  if (merge) {
    const gids: Array<string> = getTotalIDsByRoot(
      gid, (dataset as Dataset).clusteredGeoNetworkIndex
    )
    gids.map((gidDelete: string) => {
      if (gidDelete in specialLevelDict) {
        delete specialLevelDict[gidDelete]
        mergeable = true
      }
      return null
    })
  } else {
    const g = (dataset as Dataset).clusteredGeoNetworkIndex[gid]
    const gLevel = g.level
    if (g.children.length > 0) {
      specialLevelDict[gid] = {
        selfLevel: gLevel,
        nextLevel: gLevel + 1
      }
      splitable = true
    }
  }
  console.log('responsing the post request of setSpecialLevel')
  // res.json(fEdgesIndex)
  if (!splitable && !merge) {
    res.json({
      status: 201
    })
  } else if (!mergeable && merge) {
    res.json({
      status: 202
    })
  } else {
    res.json({
      status: 200
    })
  }
  return null
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
