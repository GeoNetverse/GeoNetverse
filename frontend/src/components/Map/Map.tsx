/* eslint-disable react/react-in-jsx-scope */
// eslint-disable-next-line no-use-before-define
import React, { Component } from 'react'
import L from 'leaflet'
import store from '../../store'
import {
  setColors,
  setGeoNodes,
  setGeoNetworks,
  setBackground,
  setNodeIndex,
  setMap,
  setFS,
  setClusteredGeoNetworks,
  setGeoNetworkColors,
  SelectPathAction, SetLevelAction
} from '../../store/actions'
import { backgroundCalculator } from '../../utils/backgroundCalculator'
import { getScreenNodes } from '../../utils/getScreenNodes'
import { generateWeightedFEdgesIndex } from '../../utils/generateFEdgeIndex'
// import { optimize } from '../../utils/optimize'
import { globalScale } from '../../utils/globalScale'
import { retrieveEdgesInNetwork } from '../../utils/retrieveEKeys'
import { hierarchyClusteringNetworks } from '../../utils/hierarchyClusteringNetworks'
import { generatePath } from '../../utils/generatePath'
import { intersect } from '../../utils/intersectByPointAndK'
import { optimizeBackground } from '../../utils/optimizeBackground'
import { getQuadraticCurvePoint } from '../../utils/getQuadraticCurvePoint'
import { arrange } from '../../utils/arrange'
import { distFunc } from '../../utils/dist'
import * as d3 from 'd3'
import { cloneDeep, maxBy, sortBy } from 'lodash'
import Slider from '@mui/material/Slider'
import './Map.scss'
import { notification } from 'antd'
import 'antd/lib/notification/style/index.css'

const openNotification = (message: string) => {
  notification.open({
    message: message,
    description:
      ''
  })
}

interface State {
  split: boolean,
  mapSvg: HTMLElement | null,
  textG: null | d3.Selection<SVGGElement, unknown, null, undefined>,
  nodeG: null | d3.Selection<SVGGElement, unknown, null, undefined>,
  myMap: null | L.Map
  edgeG: null | d3.Selection<SVGGElement, unknown, null, undefined>
  fEdgeG: null | d3.Selection<SVGGElement, unknown, null, undefined>
  fIndividualG: null | d3.Selection<SVGGElement, unknown, null, undefined>,
  datasets: { mapLat: number, mapLng: number, path: string, zoom: number, minlevel: number, maxlevel: number}[]
  datasetIndex: number,
  level: number,
  dictFS: { [key: string]: {'f': string, 'c':string[] | never[], 'level': number} }
  popupP: [number, number]
  nowGid: string
}

interface props{
  state: any;
  selectPath: (pathInfo: { finfo: [string, string], cinfo: [string, string][]}) => SelectPathAction;
  setLevel: (level: number) => SetLevelAction;
}

class Map extends Component<props> {
  public state: State;
  constructor (props: any) {
    super(props)
    this.state = {
      split: false,
      mapSvg: null,
      myMap: null,
      textG: null,
      nodeG: null,
      edgeG: null,
      fEdgeG: null,
      fIndividualG: null,
      datasets: [{
        mapLat: 34.7617815255933,
        mapLng: 113.67588043212892,
        path: 'zhengzhou',
        zoom: 14,
        minlevel: 0,
        maxlevel: 2
      }, {
        mapLat: 31.86,
        mapLng: 117.283042,
        path: 'hefei',
        zoom: 14,
        minlevel: 0,
        maxlevel: 3
      }],
      datasetIndex: 0,
      level: 0,
      dictFS: {},
      popupP: [0, 0],
      nowGid: ''
    }
    this.drawGeoNodes = this.drawGeoNodes.bind(this)
    this.removeAll = this.removeAll.bind(this)
    this.drawAll = this.drawAll.bind(this)
    this.drawIndividuals = this.drawIndividuals.bind(this)
    this.enforceOpacity = this.enforceOpacity.bind(this)
    this.drawGeoNodeIds = this.drawGeoNodeIds.bind(this)
  }

  removeAll () {
    (this.state.nodeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('*')
      .remove();
    (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('*')
      .remove();
    (this.state.edgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('*')
      .remove();
    (this.state.textG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('*')
      .remove()
  }

  async drawAll () {
    this.updateNodeIndex()
    this.drawBackgroundEdges()
    this.drawGeoNodes()
    await this.drawIndividuals()
    this.enforceOpacity()
    this.drawGeoNodeIds()
  }

  enforceOpacity () {
    const pinned: Set<string> = this.props.state.selectedPathsID
    if (this.state.fEdgeG !== null) {
      if (pinned.size === 0) { // 恢复透明度
        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.individual-edge')
          .attr('stroke-opacity', this.props.state.openSelect ? 0.5 : 1);

        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.inner-path')
          .attr('stroke-opacity', this.props.state.openSelect ? 0.5 : 1);

        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.inner-node')
          .attr('stroke-opacity', this.props.state.openSelect ? 0.5 : 1);

        (this.state.edgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('path.b-edge')
          .attr('stroke', this.props.state.openSelect ? '#fff' : '#ccc')
      } else { // 在pinned里的透明度为1，其他为0.3
        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.individual-edge')
          .attr('stroke-opacity', (d: any) => pinned.has(d.gid) ? 1 : this.props.state.openSelect ? 0.5 : 0.2);

        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.inner-path')
          .attr('stroke-opacity', (d: any) => pinned.has(d.gid) ? 1 : this.props.state.openSelect ? 0.5 : 0.2);

        (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('.inner-node')
          .attr('stroke-opacity', (d: any) => pinned.has(d.gid) ? 1 : this.props.state.openSelect ? 0.5 : 0.2);

        (this.state.edgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
          .selectAll('path.b-edge')
          .attr('stroke', '#fff')
      }
    }
  }

  updateNodeIndex () {
    const nodeIndex: {[nid: string]: ScreenNode} = {}
    for (const node of store.getState().geoNodes) {
      const pt: L.Point = (this.state.myMap as L.Map).latLngToLayerPoint({ lat: node.lat, lng: node.lng })
      nodeIndex[node.nid] = { ...node, x: pt.x, y: pt.y }
    }
    store.dispatch(setNodeIndex(nodeIndex))
  }

  async drawIndividuals () {
    const pinned: Set<string> = this.props.state.selectedPathsID
    const zoom = this.state.myMap?.getZoom() as number
    const retrieveResp = await fetch('http://localhost:3001/retrieve', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ level: this.state.level })
    })
    const {
      maxWeightAcrossEdgeDict,
      renderedGeoNetworks,
      fEdgesIndex
    }: {
      maxWeightAcrossEdgeDict: {[gid: string]: number},
      renderedGeoNetworks: string[]
      fEdgesIndex: ForegroundEdgesIndex
    } = await retrieveResp.json()

    const colors = store.getState().colors
    // store.dispatch(setGeoNetworkColors(geoNetworkColors))

    const edgeSizeDict = store.getState().background.edgeSizeDict
    const screenNodeIndex = store.getState().nodeIndex

    const nodeByNodeResp = await fetch('http://localhost:3001/getNodeByNode', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
    const nodeByNode: NodeByNode = await nodeByNodeResp.json()

    const involvedNetworksIndexResp = await fetch('http://localhost:3001/getInvolvedNetworkIndex', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
    const involvedNetworksIndex: {[nid: string]: GeoNetwork[]} = await involvedNetworksIndexResp.json()

    // 感觉要写个fetch从后端把arrow都拿出来。。。。

    const nodeSizeDict = store.getState().background.nodeSizeDict
    const background = store.getState().background
    const nodeIndex = store.getState().nodeIndex
    const underlyingEdges = optimizeBackground(nodeIndex, background, zoom)

    // console.log(underlyingEdges);

    const underlyingEdgeIndex: {[eKey: string]: UnderlyingEdge} = {}
    for (const underlyingEdge of underlyingEdges) {
      underlyingEdgeIndex[underlyingEdge.key] = underlyingEdge
    }

    const lineEndPositionDict: {[gidNidEKey: string]: LineEnd} = {}

    const renderedIndividuals = []
    for (const eKey in fEdgesIndex) {
      // const [oid, did] = eKey.split('_')
      // const reverseKey = `${did}_${oid}` // for direction-aware clustering
      // const underlyingEdge = eKey in underlyingEdgeIndex ? underlyingEdgeIndex[eKey] : underlyingEdgeIndex[reverseKey]
      const underlyingEdge = underlyingEdgeIndex[eKey]

      const { ku, kv, angleU, angleV, kuReversed, kvReversed, uTangent, vTangent } = underlyingEdge
      const backgroundEdgeWidth = edgeSizeDict[eKey]
      const [uid, vid] = eKey.split('_')
      const uNode = screenNodeIndex[uid]
      const vNode = screenNodeIndex[vid]

      const k = (uNode.y - vNode.y) / (uNode.x - vNode.x)
      const angleUTangent = Math.atan(-1 / ku)
      const angleVTangent = Math.atan(-1 / kv)

      let shiftU = kuReversed * backgroundEdgeWidth / 2
      let shiftV = kvReversed * backgroundEdgeWidth / 2
      const individualLinks = fEdgesIndex[eKey]

      for (const l of individualLinks) {
        const dxu = Math.cos(angleUTangent) * globalScale(shiftU, zoom)
        const dyu = Math.sin(angleUTangent) * globalScale(shiftU, zoom)
        const revisedDxU = Math.cos(angleUTangent) * (globalScale(l.w / 2, zoom) - 0.5)
        const revisedDyU = Math.sin(angleUTangent) * (globalScale(l.w / 2, zoom) - 0.5)

        const dxv = Math.cos(angleVTangent) * globalScale(shiftV, zoom)
        const dyv = Math.sin(angleVTangent) * globalScale(shiftV, zoom)
        const revisedDxV = Math.cos(angleVTangent) * (globalScale(l.w / 2, zoom) - 0.5)
        const revisedDyV = Math.sin(angleVTangent) * (globalScale(l.w / 2, zoom) - 0.5)

        shiftV = shiftV - l.w * kvReversed
        shiftU = shiftU - l.w * kuReversed

        const xu = uTangent.x + dxu - revisedDxU * kuReversed
        const yu = uTangent.y + dyu - revisedDyU * kuReversed

        const xv = vTangent.x + dxv - revisedDxV * kvReversed
        const yv = vTangent.y + dyv - revisedDyV * kvReversed

        let cx = 0
        let cy = 0
        if (Math.abs(ku - kv) < 0.01) {
          cx = (xu + xv) / 2
          cy = (yu + yv) / 2
        } else {
          const intersection = intersect(ku, { x: xu, y: yu }, kv, { x: xv, y: yv })
          cx = intersection.x
          cy = intersection.y
        }

        lineEndPositionDict[`${l.gid}+${uid}+${eKey}`] = {
          eKey: eKey,
          x: xu,
          y: yu,
          k: ku,
          a: angleU,
          w: l.w,
          tangentShift: distFunc(xu, yu, uTangent.x, uTangent.y)
        }
        lineEndPositionDict[`${l.gid}+${vid}+${eKey}`] = {
          eKey: eKey,
          x: xv,
          y: yv,
          k: kv,
          a: angleV,
          w: l.w,
          tangentShift: distFunc(xv, yv, vTangent.x, vTangent.y)
        }

        const arrow = l.arrow.sort((a, b) => b.value - a.value)
        const midPoint = getQuadraticCurvePoint(xu, yu, cx, cy, xv, yv, 0.5)
        // const fake = [{ toid: uid, v: 0.7 }, { toid: vid, v: 0.3 }] // 第一个的v是大的
        const opacity = [arrow[0].value / Math.max(arrow[0].value, arrow[1].value), arrow[1].value / Math.max(arrow[0].value, arrow[1].value)]
        const w = (globalScale(l.w, zoom) - 2) * 0.9

        let averageAngle = (angleV + angleU) / 2 + 90
        const targetAngle = arrow[1].toid === uid ? angleU : angleV
        const nonTargetAngle = arrow[0].toid === uid ? angleU : angleV
        if (this.closeToFormer(averageAngle, nonTargetAngle, targetAngle)) {
          averageAngle += 180
        }

        // 这个给大的,初始位置向上
        const pointsStr1 = `${midPoint.x - w / 2},${midPoint.y}
        ${midPoint.x - w / 2},${midPoint.y + w / 4}
        ${midPoint.x},${midPoint.y + w / 4 + w / 4}
        ${midPoint.x + w / 2},${midPoint.y + w / 4}
        ${midPoint.x + w / 2},${midPoint.y}
        ${midPoint.x},${midPoint.y + w / 4}
        `

        // 这个给小的，初始位置向下
        const pointsStr2 = `${midPoint.x - w / 2},${midPoint.y}
        ${midPoint.x - w / 2},${midPoint.y - w / 4}
        ${midPoint.x},${midPoint.y - w / 4 - w / 4}
        ${midPoint.x + w / 2},${midPoint.y - w / 4}
        ${midPoint.x + w / 2},${midPoint.y}
        ${midPoint.x},${midPoint.y - w / 4}
        `
        renderedIndividuals.push({
          eKey,
          gid: l.gid,
          stroke: (globalScale(maxWeightAcrossEdgeDict[l.gid], zoom) > 6) ? colors[l.gid] : '#a7a7a7',
          d: `M ${xu} ${yu} Q ${cx} ${cy} ${xv} ${yv}`,
          strokeWidth: globalScale(l.w, zoom) - 1,
          arrows: [{
            points: pointsStr1,
            opacity: opacity[0],
            transform: `rotate(${averageAngle - 90},${midPoint.x},${midPoint.y})`
          }, {
            points: pointsStr2,
            opacity: opacity[1],
            transform: `rotate(${averageAngle - 90},${midPoint.x},${midPoint.y})`
          }]
        })
      }
    }

    const drew: {[key: string]: number} = {}
    for (const nid in screenNodeIndex) {
      const node = screenNodeIndex[nid]
      const r = globalScale(nodeSizeDict[nid], zoom) / 2 + 2
      const neighborNodes = nodeByNode[nid] // 按照角度排过序的
      if (!(nid in involvedNetworksIndex)) {
        continue
      }
      const involvedGeoNetworks = involvedNetworksIndex[nid]
      let virtualNodes: VirtualNode[] = []
      for (const g of involvedGeoNetworks) {
        if (`${g.id}+${node.nid}` in drew) {
          continue
        }
        const ends: LineEnd[] = []
        for (const neighborNode of neighborNodes) {
          const eKey = neighborNode.eKey
          const key = `${g.id}+${node.nid}+${eKey}`
          if (key in lineEndPositionDict) { // 有可能没有吗？
            ends.push(lineEndPositionDict[key])
          }
        }

        // new
        const maxWeight = (maxBy(ends, end => end.w) as LineEnd).w
        // const validEnds = cloneDeep(ends).filter(e => e.w > maxWeight / 2.5)
        // const validEnds = cloneDeep(ends)
        const innerNodeR = globalScale(maxWeight / 2, zoom) - 1

        let virtualNode: VirtualNode
        if (ends.length === 1) {
          virtualNode = {
            x: ends[0].x,
            y: ends[0].y,
            r: innerNodeR,
            gid: g.id,
            ends,
            paths: []
          }
        } else if (ends.length === 2) {
          const intersection = intersect(ends[0].k, ends[0], ends[1].k, ends[1])
          const dist = distFunc(intersection.x, intersection.y, node.x, node.y)
          if (dist <= (r - innerNodeR)) { // 这个改成curve直接连，使得线往里收一点
            // 先算一下curve的0.5的点
            const midPoint = getQuadraticCurvePoint(ends[0].x, ends[0].y, intersection.x, intersection.y, ends[1].x, ends[1].y, 0.5)

            virtualNode = {
              x: midPoint.x,
              y: midPoint.y,
              r: innerNodeR,
              gid: g.id,
              ends,
              paths: [],
              intersectType: 'intersect',
              intersection
            }
          } else { // 不知道咋办 先放着
            virtualNode = {
              x: (ends[0].x + ends[1].x) / 2,
              y: (ends[0].y + ends[1].y) / 2,
              r: innerNodeR,
              gid: g.id,
              ends,
              paths: [],
              intersectType: 'noIntersect'
            }
          }
        } else { // >= 3 取所有点交点中由最粗的两个相交而成的，如果没有交点， 端点的中间 done
          // 如果有两个远远大于其他，且这两个有交点，把它们当做intersect来处理
          // 先求所有交点
          const intersections: {w: number, p: ScreenPoint}[] = []
          ends.sort((end0, end1) => end1.eKey > end0.eKey ? 1 : -1).sort((end0, end1) => end1.w - end0.w)
          console.log(ends)
          ends.forEach((ei, i) => {
            ends.forEach((ej, j) => {
              if (j > i) {
                // 取交点
                const intersection = intersect(ei.k, ei, ej.k, ej)
                const dist = distFunc(intersection.x, intersection.y, node.x, node.y)
                if (dist <= r * 0.95) {
                  intersections.push({
                    p: intersection,
                    w: ei.w * ej.w
                  })
                }
              }
            })
          })

          if (intersections.length === 1) { // 1个交点
            virtualNode = {
              x: intersections[0].p.x,
              y: intersections[0].p.y,
              r: innerNodeR,
              gid: g.id,
              ends,
              paths: []
            }
          } else if (intersections.length === 0) { // 没有交点
            const medianX = ends.reduce((sum, cur) => cur.x + sum, 0) / ends.length
            const medianY = ends.reduce((sum, cur) => cur.y + sum, 0) / ends.length
            virtualNode = {
              x: medianX,
              y: medianY,
              r: innerNodeR,
              gid: g.id,
              ends,
              paths: []
            }
          } else { // 多个交点
            // 如果第一个比第二大5倍，当做intersect处理
            if (intersections[0].w >= intersections[1].w * 5) {
              // 得把产生intersections[0]这个交点的两个端点放前面
              const intersection = intersections[0].p
              const midPoint = getQuadraticCurvePoint(ends[0].x, ends[0].y, intersection.x, intersection.y, ends[1].x, ends[1].y, 0.5)

              virtualNode = {
                x: midPoint.x,
                y: midPoint.y,
                r: innerNodeR,
                gid: g.id,
                ends,
                paths: [],
                intersectType: 'intersect',
                intersection
              }
            } else {
              virtualNode = {
                x: intersections[0].p.x,
                y: intersections[0].p.y,
                r: innerNodeR,
                gid: g.id,
                ends,
                paths: []
              }
            }
          }
        }
        virtualNodes.push(virtualNode)
      }
      virtualNodes = arrange(virtualNodes, node, r)
      virtualNodes.sort((a, b) => a.r - b.r);

      (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
        .append('g')
        .attr('class', `inner-${nid}`)
        .selectAll('g')
        .data(virtualNodes)
        .enter()
        .append('g')
        .attr('class', d => `inner-${d.gid}-${nid}`)
        .attr('id', d => `inner-${d.gid}-${nid}`)
        .call((selection) => {
          // .attr('opacity', 0.4)
          selection
            .selectAll('path')
            .data(d => d.paths)
            .enter()
            .append('path')
            .attr('class', 'inner-path')
            .attr('d', p => p.d)
            .attr('stroke-width', p => globalScale(p.w, zoom) - 1)
            .attr('stroke-opacity', p => pinned.has(p.gid) ? 1 : 0.2)
            .attr('stroke', p => globalScale(maxWeightAcrossEdgeDict[p.gid], zoom) > 6 ? colors[p.gid] : '#a7a7a7')
            // .attr('opacity', 0.4)
            .attr('fill', 'none')
            .style('cursor', 'pointer')
            .attr('id', p => `inner-path-${p.gid}`)
            .attr('stroke-dasharray', d => d.dashArray ? d.dashArray : '')
            .attr('stroke-dashoffset', 0)
            .on('click', (e: MouseEvent, p: PathParam) => {
              if (this.props.state.openSelect) {
                const children: [string, string][] = []
                if (this.state.dictFS[p.gid].c.length > 0) {
                  this.state.dictFS[p.gid].c.forEach((c: string) => {
                    children.push([c, colors[c]])
                  })
                }
                this.props.selectPath({ finfo: [p.gid, colors[p.gid]], cinfo: children })
              }
            })
          selection
            .append('circle')
            // .attr('fill', '#a7a7a7')
            .attr('stroke', d => (globalScale(maxWeightAcrossEdgeDict[d.gid], zoom) > 6) ? colors[d.gid] : '#a7a7a7')
            .attr('fill', 'white')
            .attr('stroke-width', d => {
              if (d.r > 8) {
                return 4
              } else {
                return 2
              }
            })
            .style('cursor', 'pointer')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => {
              if (d.r > 8) {
                return d.r - 2
              } else {
                return d.r >= 1 ? d.r - 1 : 0
              }
            })
            .attr('class', 'inner-node')
            .attr('id', d => `inner-node-${d.gid}`)
            .attr('stroke-opacity', d => pinned.has(d.gid) ? 1 : 0.2)
            .on('click', async (e: MouseEvent, d) => {
              if (!this.props.state.openSelect) this.setState({ popupP: [e.clientY, e.clientX], split: !this.state.split, nowGid: d.gid })
            })
        })
    }

    const fIndividualG = (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>).append('g').attr('class', 'foreground-individuals-g');

    (fIndividualG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('g')
      .data(renderedIndividuals)
      .enter()
      .append('g')
      .attr('class', d => `individual-g-${d.eKey}-${d.gid}`)
      .attr('id', d => `individual-g-${d.eKey}-${d.gid}`)
      .call((selection) => {
        selection
          .append('path')
          .attr('class', 'individual-edge')
          .attr('fill', 'none')
          .attr('id', d => `individual-${d.gid}`)
          .attr('pointer-events', 'all')
          .attr('d', d => d.d)
          .attr('stroke-width', d => d.strokeWidth)
          // .attr('stroke', '#a7a7a7')
          .attr('stroke', d => d.stroke)
          .attr('cursor', 'pointer')
          .attr('stroke-opacity', (d: any) => pinned.has(d.gid) ? 1 : 0.2)
          .on('click', (e, d: any) => {
            if (this.props.state.openSelect) {
              const children: [string, string][] = []
              console.log(d.gid)
              console.log(this.state.dictFS[d.gid])
              if (this.state.dictFS[d.gid].c.length > 0) {
                this.state.dictFS[d.gid].c.forEach((c: string) => {
                  children.push([c, colors[c]])
                })
              }
              this.props.selectPath({ finfo: [d.gid, colors[d.gid]], cinfo: children })
              this.setState({})
            }
          })
        selection
          .append('polyline')
          .attr('points', d => d.arrows[0].points)
          .attr('fill', 'white')
          .attr('opacity', d => d.arrows[0].opacity)
          .attr('transform', d => d.arrows[0].transform)

        selection
          .append('polyline')
          .attr('points', d => d.arrows[1].points)
          .attr('fill', 'white')
          .attr('opacity', d => d.arrows[1].opacity)
          .attr('transform', d => d.arrows[1].transform)
      })
    console.log('finish drawing individuals')
  }

  drawBackgroundEdges () {
    const pinned: Set<string> = this.props.state.selectedPathsID
    const zoom = this.state.myMap?.getZoom() as number
    const background = store.getState().background
    const nodeIndex = store.getState().nodeIndex
    const underlyingEdges = optimizeBackground(nodeIndex, background, zoom);

    (this.state.edgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('path.b-edge')
      .data(underlyingEdges)
      .enter()
      .append('path')
      .attr('class', 'b-edge')
      .attr('fill', 'none')
      .attr('id', d => `${d.uid}_${d.vid}`)
      .attr('d', (d: UnderlyingEdge) => `M ${d.uNode.x} ${d.uNode.y} L ${d.uTangent.x} ${d.uTangent.y} Q ${d.controlPoint.x} ${d.controlPoint.y} ${d.vTangent.x} ${d.vTangent.y} L ${d.vNode.x} ${d.vNode.y}`)
      .attr('stroke-width', (d: UnderlyingEdge) => globalScale(d.w, zoom))
      .attr('stroke', '#ccc')
      .attr('opacity', pinned.size === 0 ? 1 : 0)
  }

  drawGeoNodeIds () {
    const Ps = store.getState().geoNodes
    const text = (this.state.textG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('.nid-text')
      .data(Ps)
      .enter()
      .append('text')
      .attr('font-size', 24)
      .attr('class', 'nid-text')
      .attr('id', (d: GeoNode) => `location-g-${d.nid}`)
      .attr('transform', (d: GeoNode) => {
        const pt: L.Point = (this.state.myMap as L.Map).latLngToLayerPoint({ lat: d.lat, lng: d.lng })
        return `translate(${pt.x}, ${pt.y})`
      })
      .text(d => d.nid)
      .style('pointer-events', 'none')
  }

  drawGeoNodes () {
    const zoom = this.state.myMap?.getZoom() as number
    const nodeSizeDict = store.getState().background.nodeSizeDict
    const Ps = store.getState().geoNodes
    const locationsG = (this.state.nodeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('.one-location-g')
      .data(Ps)
      .enter()
      .append('g')
      .attr('class', 'one-location-g')
      .attr('id', (d: GeoNode) => `location-g-${d.nid}`)
      .attr('transform', (d: GeoNode) => {
        const pt: L.Point = (this.state.myMap as L.Map).latLngToLayerPoint({ lat: d.lat, lng: d.lng })
        return `translate(${pt.x}, ${pt.y})`
      })
      .style('cursor', 'pointer')
    locationsG.append('circle')
      .attr('fill', '#fff')
      .attr('title', (d: GeoNode) => d.nid)
      .attr('id', (d: GeoNode) => d.nid)
      .attr('stroke', '#777')
      .attr('stroke-width', 2)
      .attr('r', (d: GeoNode) => globalScale(nodeSizeDict[d.nid], zoom) / 2)

    // locationsG.append('text')
    //   .attr('dy', '1em')
    //   .text(d => d.nid)
  }

  async handleClickPopup (type: number) {
    const gid = this.state.nowGid

    const { dictFS } = this.state
    this.setState({ split: !this.state.split })
    let split = false
    let needPost = false
    const colors = this.props.state.colors
    switch (type) {
      case 0: { // cancel
        break
      }
      case 1: { // split
        split = true
        if (dictFS[gid].c.length > 0) {
          needPost = true
          if (this.props.state.selectedPathsID.has(gid)) this.props.selectPath({ finfo: [gid, 'any'], cinfo: [] })
        } else {
          openNotification('can not split')
        }
        break
      }
      case 2: { // merge
        if ((dictFS[gid].f !== '') && (dictFS[gid].level > this.props.state.level)) {
          needPost = true
          const children: [string, string][] = []
          if (dictFS[dictFS[gid].f].c.length > 0) {
            dictFS[dictFS[gid].f].c.forEach((c: string) => {
              children.push([c, colors[c]])
            })
          }
          if (this.props.state.selectedPathsID.has(gid)) this.props.selectPath({ finfo: [dictFS[gid].f, colors[dictFS[gid].f]], cinfo: children })
        } else {
          openNotification('can not merge')
        }
        break
      }
    }
    if (needPost) {
      const resp = await fetch('http://localhost:3001/setSpecialLevel', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          is_back: !split,
          level: this.state.level,
          gid: gid
        })
      })
      const status = await resp.json()
      console.log(status)
      if (status.status === 200) {
        this.removeAll()
        this.drawAll()
      } else if (status.status === 201) {
        openNotification('can not split')
      } else if (status.status === 202) {
        openNotification('can not merge')
      }
    }
  }

  async componentDidMount () {
    store.subscribe(() => this.setState({}))
    window.onbeforeunload = function (e: BeforeUnloadEvent) {
      fetch('http://localhost:3001/setSpecialLevel', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          is_back: false,
          level: -1,
          gid: ''
        })
      })
    }
    const { mapLat, mapLng, path, zoom } = this.state.datasets[this.state.datasetIndex]
    await fetch('http://localhost:3001/setData', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ datasetName: path })
    })
    const myMap = L.map('map', {
      center: [mapLat, mapLng],
      zoom: zoom,
      zoomSnap: 0.5,
      zoomControl: true,
      attributionControl: false,
      touchZoom: true
    })

    // function onMapClick (e: any) {
    //   console.log(e)
    // }

    // myMap.on('click', onMapClick)

    // https://api.mapbox.com/styles/v1/zikunrain/cl09ejle0003v14mglm1p9x13/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw

    const tileUrl = 'https://api.mapbox.com/styles/v1/zikunrain/cl09ejle0003v14mglm1p9x13/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw' // 好看的
    // const tileUrl = 'https://api.mapbox.com/styles/v1/zikunrain/cl09ewdw6001o14tg8i62vdkm/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw'
    // const tileUrl = 'https://api.mapbox.com/styles/v1/zikunrain/cl09er7cx001r14qr6pxdyhsi/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw'
    // const tileUrl = 'https://api.mapbox.com/styles/v1/zikunrain/cl09eo9yy000015pc5dxhk4dp/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw'
    // const tileUrl = 'https://api.mapbox.com/styles/v1/zikunrain/ckwn2gszf0jq616pls3wi4pdc/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiemlrdW5yYWluIiwiYSI6ImNqeWE2dXJ1djBibmIzY21mMWl5MDljc2wifQ.NMe8T_yYFKIsraDJV4tIPw'
    L.tileLayer(tileUrl, {
      tileSize: 512,
      zoomOffset: -1
    }).addTo(myMap)

    const width: number = myMap.getSize().x
    const height: number = myMap.getSize().y
    const mapSvg = d3
      .select(myMap.getPanes().overlayPane)
      .append('svg')
      .attr('class', 'map-svg')
      .attr('width', width)
      .attr('height', height)
      .attr('overflow', 'visible')
    const edgeG = mapSvg.append('g').attr('class', 'edge-g')
    const nodeG = mapSvg.append('g').attr('class', 'node-g')
    const fEdgeG = mapSvg.append('g').attr('class', 'foreground-edge-g')
    const textG = mapSvg.append('g').attr('class', 'text-g')

    myMap.on('zoomstart', this.removeAll)
    myMap.on('zoomend', this.drawAll)

    this.setState({ mapSvg })
    this.setState({ myMap })
    this.setState({ nodeG })
    this.setState({ edgeG })
    this.setState({ fEdgeG })
    this.setState({ textG })
    store.dispatch(setMap(myMap))

    const nodesResp = await fetch(`${path}/geo-nodes.json`)
    const networksResp = await fetch(`${path}/geo-networks.json`)
    const geoNodes: GeoNode[] = await nodesResp.json()
    const geoNetworks: GeoNetwork[] = await networksResp.json()

    const colorsResp = await fetch('http://localhost:3001/obtainColors', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
    const colors = await colorsResp.json()
    store.dispatch(setColors(colors))

    const dictFSResp = await fetch('http://localhost:3001/obtainFS', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
    const dicFS: { [key: string]: {'f': string, 'c':string[] | never[], 'level': number} } = await dictFSResp.json()
    this.setState({ dictFS: dicFS })
    store.dispatch(setFS(dicFS))

    for (const geoNetwork of geoNetworks) {
      const [eKeys, edgeWeightDict] = retrieveEdgesInNetwork(geoNetwork)
      geoNetwork.eKeys = eKeys
      geoNetwork.edgeWeightDict = edgeWeightDict
      geoNetwork.level = -1
      geoNetwork.merged = false
      geoNetwork.children = []
      geoNetwork.color = colors[geoNetwork.id]
      // hack: assign color randomly
      // geoNetworkColors[geoNetwork.id] = d3.interpolateRainbow(Math.random())
    }
    const screenNodes = getScreenNodes(geoNodes)
    store.dispatch(setGeoNodes(geoNodes))
    store.dispatch(setGeoNetworks(geoNetworks))

    // await fetch('http://localhost:3001/setdata', {
    //   headers: {
    //     Accept: 'application/json',
    //     'Content-Type': 'application/json'
    //   },
    //   method: 'POST',
    //   body: JSON.stringify({
    //     screenNodes,
    //     geoNetworks
    //   })
    // })

    const backgroundResp = await fetch('http://localhost:3001/background', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
    const background = await backgroundResp.json()
    store.dispatch(setBackground(background))

    const nodeIndex: {[nid: string]: ScreenNode} = {}
    for (const node of screenNodes) {
      nodeIndex[node.nid] = node
    }
    store.dispatch(setNodeIndex(nodeIndex))

    // const clusteredGeoNetworksResp = await fetch('http://localhost:3001/clustering', {
    //   headers: {
    //     Accept: 'application/json',
    //     'Content-Type': 'application/json'
    //   },
    //   method: 'POST',
    //   body: JSON.stringify(geoNetworks)
    // })
    // const clusteredGeoNetworks: GeoNetwork[] = await clusteredGeoNetworksResp.json()
    // store.dispatch(setClusteredGeoNetworks(clusteredGeoNetworks))

    this.drawAll()
  }

  handleChange = async (event: any, value: any) => {
    this.setState({ level: value })
    this.props.setLevel(value);
    (this.state.fEdgeG as d3.Selection<SVGGElement, unknown, null, undefined>)
      .selectAll('*')
      .remove()

    await this.drawIndividuals()
    this.enforceOpacity()
  };

  closeToFormer = (a0: number, a1: number, a2: number) => {
    // 都先取模
    const a00 = (a0 + 1080) % 360
    const a11 = (a1 + 1080) % 360
    const a22 = (a2 + 1080) % 360
    let d01 = Math.abs(a00 - a11)
    d01 = d01 > 180 ? 360 - d01 : d01
    let d02 = Math.abs(a00 - a22)
    d02 = d02 > 180 ? 360 - d02 : d02
    if (d01 < d02) {
      return true
    } else {
      return false
    }
  }

  public render () {
    this.enforceOpacity()
    const { datasets, datasetIndex } = this.state
    const { minlevel, maxlevel } = datasets[datasetIndex]
    return (
      <>
        {
          this.state.split && !this.props.state.openSelect
            ? <div className='pup'
            onMouseLeave={ () => this.setState({ split: false }) }
            style={
              {
                top: this.state.popupP[0],
                left: this.state.popupP[1]
              }
            }
            >
              <div className='pop_option' onClick={ () => this.handleClickPopup(2) }>merge</div>
              <div className='split_line'/>
              <div className='pop_option' onClick={ () => this.handleClickPopup(1) }>split</div>
              <div className='split_line'/>
              <div className='pop_option' onClick={ () => this.handleClickPopup(0) }>cancel</div>
            </div>
            : <></>
        }
        <div className="container">
          <div className="map-container" id="map"/>
          <div className='level-container'>
            <div className='text'>Target Level:</div>
            <div className='slider-container'>
              <Slider
                className='slider'
                aria-label="Volume"
                orientation="horizontal"
                defaultValue={0}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={minlevel}
                max={maxlevel}
                onChangeCommitted={this.handleChange} />
            </div>
          </div>
        </div>
      </>
    )
  }
}

export default Map
