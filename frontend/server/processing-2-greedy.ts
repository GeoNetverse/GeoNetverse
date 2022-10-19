/// <reference path="typings/index.d.ts"/>
/// <reference path="../node_modules/@types/node/fs.d.ts"/>

'use strict'

import * as fs from 'fs'
import { optimize } from '../src/utils/optimize'

const geoNetworksResp = fs.readFileSync('public/airvis/geoNetworksTmp.json')
const geoNetworks: GeoNetwork[] = JSON.parse(geoNetworksResp.toString())

const backgroundResp = fs.readFileSync('public/airvis/background.json')
const background: Background = JSON.parse(backgroundResp.toString())

const geoNodesResp = fs.readFileSync('public/airvis/geo-nodes-screen.json')
const screenNodes: ScreenNode[] = JSON.parse(geoNodesResp.toString())

// 对第0层的布局进行优化
const clusteredGeoNetworks0 = geoNetworks.filter(g => g.level === 0)
const fEdgesIndexFistLevel = optimize(clusteredGeoNetworks0, background, screenNodes)

const fEdgesIndexFistLevelStr = JSON.stringify(fEdgesIndexFistLevel, null, '\t')
fs.writeFile('public/airvis/fEdgesIndexFistLevel.json', fEdgesIndexFistLevelStr, function (err) {
  if (err) { console.log('Server is error...') }
})
