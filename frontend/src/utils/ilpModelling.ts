export const ilpModel = (geoNetworks: GeoNetwork[], nodeByNode: NodeByNode, screenNodes: ScreenNode[]) => {
// const clusteredGeoNetworks0 = geoNetworks.filter(g => g.level === 0)
// console.log(geoNetworks)
  // console.log(screenNodes)
  // console.log(geoNetworks)
  // console.log(nodeByNode)

  const crossings: Crossing[] = [] // // 交叉变量空数组, only avoidable
  const binaryVariablesOfEdge: {[eKey: string]: BinaryVariable[]} = {} // 为每条边存储x变量
  const regardedNetworksOfEdge: {[eKey: string]: Set<string>} = {}
  // initialize regardedNetworksOfEdge
  for (const screenNode of screenNodes) {
    const cnid = screenNode.nid
    if (cnid in nodeByNode) { // 有可能没有，如果该点没有图穿过
      const neighboringNodes = nodeByNode[cnid]
      for (const neighboringNode of neighboringNodes) {
        const eKey = neighboringNode.eKey
        if (!(eKey in regardedNetworksOfEdge)) {
          regardedNetworksOfEdge[eKey] = new Set()
        }
      }
    }
  }

  for (const screenNode of screenNodes) {
    const cnid = screenNode.nid

    if (!(cnid in nodeByNode)) { // 有可能没有，如果该点没有图穿过
      continue
    }
    const neighboringNodes = nodeByNode[cnid]

    // 存一个字典，根据eKey获取angle
    const specialDict: {[eKey: string]: boolean} = {}
    const angleDict: {[eKey: string]: number} = {}
    for (const neighboringNode of neighboringNodes) {
      angleDict[neighboringNode.eKey] = neighboringNode.angle
      specialDict[neighboringNode.eKey] = neighboringNode.special
    }

    // 生成每个图的codePairs e.g.， [[e1, e2], [e2, e3]] // [e2, e3]顺序有关系吗？
    const codePairsWithIDs: {codePairs: [string, string, number, boolean][], gid: string}[] = [] // 存储了穿过当前节点的图的

    for (const geoNetwork of geoNetworks) { // 只存储第0层的
      const codes: {special: boolean, w: number, eKey: string}[] = []
      for (const neighboringNode of neighboringNodes) {
        const eKey = neighboringNode.eKey
        if (eKey in geoNetwork.edgeWeightDict) {
          codes.push({ eKey, w: geoNetwork.edgeWeightDict[eKey], special: neighboringNode.special })
        }
      }

      const codePairs: [string, string, number, boolean][] = [] // boolean=true indicates they are same, 也就是类型2
      // if (codes.length < 2) {
      //   console.log(geoNetwork.id, 'not passing', cnid)
      // } else
      if (codes.length === 2) {
        const w = Math.max(codes[0].w, codes[1].w)
        const isSame = codes[0].special === codes[1].special
        codePairs.push([codes[0].eKey, codes[1].eKey, w, isSame])
      } else {
        for (let i = 0; i < codes.length; i += 1) {
          for (let j = 0; j < codes.length; j += 1) {
            if (i < j) {
              const w = Math.max(codes[i].w, codes[j].w)
              const isSame = codes[i].special === codes[j].special
              codePairs.push([codes[i].eKey, codes[j].eKey, w, isSame])
            }
          }
        }
      }

      codePairsWithIDs.push({
        codePairs,
        gid: geoNetwork.id
      })
    }

    for (let i = 0; i < codePairsWithIDs.length; i += 1) {
      const igid = codePairsWithIDs[i].gid
      const codePairsI = codePairsWithIDs[i].codePairs
      for (let j = 0; j < codePairsWithIDs.length; j += 1) {
        if (i === j) {
          continue
        }
        const jgid = codePairsWithIDs[j].gid
        const codePairsJ = codePairsWithIDs[j].codePairs

        for (const codePairI of codePairsI) {
          for (const codePairJ of codePairsJ) {
            const arrayI = [codePairI[0], codePairI[1]]
            const setJ = new Set([codePairJ[0], codePairJ[1]])

            const sharedEdge = Array.from(new Set(arrayI.filter(v => setJ.has(v))))

            if (sharedEdge.length === 2) { // 如果是交叉类型1
              const crossing = {
                igid,
                ige1: sharedEdge[0], // eKey
                ige2: sharedEdge[1], // eKey
                jgid,
                jge1: sharedEdge[0], // eKey
                jge2: sharedEdge[1], // eKey
                nid: cnid,
                type: codePairI[3] ? 2 : 1, // codePairI[3] 应该等于 codePairJ[3]
                cost: codePairI[2] * codePairJ[2],
                key: ''
              }
              crossing.key = `${crossing.igid}#${crossing.ige1}#${crossing.ige2}#${crossing.jgid}#${crossing.jge1}#${crossing.jge2}#${crossing.nid}`

              crossings.push(crossing)

              regardedNetworksOfEdge[sharedEdge[0]].add(igid)
              regardedNetworksOfEdge[sharedEdge[0]].add(jgid)
              regardedNetworksOfEdge[sharedEdge[1]].add(igid)
              regardedNetworksOfEdge[sharedEdge[1]].add(jgid)
            } else if (sharedEdge.length === 1) { // 如果是交叉类型3
              const remainderOfi = arrayI.filter(v => v !== sharedEdge[0])
              const remainderOfj = [...setJ].filter(v => v !== sharedEdge[0])
              if (remainderOfi.length !== 1 || remainderOfj.length !== 1) {
                console.log('error')
              }

              let t = 0
              let angleRemainderOfi = angleDict[remainderOfi[0]]
              let angleRemainderOfj = angleDict[remainderOfj[0]]
              const angleShared = angleDict[sharedEdge[0]]
              if (specialDict[sharedEdge[0]]) { // 逆时针
                angleRemainderOfj = angleRemainderOfj > angleShared ? angleRemainderOfj - Math.PI * 2 : angleRemainderOfj
                angleRemainderOfi = angleRemainderOfi > angleShared ? angleRemainderOfi - Math.PI * 2 : angleRemainderOfi
                if (angleRemainderOfi < angleRemainderOfj) {
                  t = 1
                }
              } else { // 顺时针
                angleRemainderOfj = angleRemainderOfj < angleShared ? angleRemainderOfj + Math.PI * 2 : angleRemainderOfj
                angleRemainderOfi = angleRemainderOfi < angleShared ? angleRemainderOfi + Math.PI * 2 : angleRemainderOfi
                if (angleRemainderOfi > angleRemainderOfj) {
                  t = 1
                }
              }

              const crossing = {
                igid,
                ige1: sharedEdge[0], // eKey
                ige2: remainderOfi[0], // eKey
                jgid,
                jge1: sharedEdge[0], // eKey
                jge2: remainderOfj[0], // eKey
                nid: cnid,
                type: 3,
                cost: codePairI[2] * codePairJ[2],
                key: '',
                t
              }
              crossing.key = `${crossing.igid}#${crossing.ige1}#${crossing.ige2}#${crossing.jgid}#${crossing.jge1}#${crossing.jge2}#${crossing.nid}`

              // if (crossing.key === '2_92-2_89-2_79-2_9-3_43-2_97-1_77-2_117#17011_17012#17005_17012#2_91-1_74-2_85-1_52-2_95-2_90-2_94-2_86-1_173#17011_17012#17012_22009#17012') {
              //   console.log(crossing)
              // }

              crossings.push(crossing)

              regardedNetworksOfEdge[sharedEdge[0]].add(igid)
              regardedNetworksOfEdge[sharedEdge[0]].add(jgid)
              regardedNetworksOfEdge[remainderOfi[0]].add(igid)
              regardedNetworksOfEdge[remainderOfj[0]].add(jgid)
            }
          }
        }
      }
    }
  }

  console.log('number of crossings', crossings.length)

  for (const eKey in regardedNetworksOfEdge) {
    const regardedNetworks = Array.from(regardedNetworksOfEdge[eKey])
    binaryVariablesOfEdge[eKey] = []
    for (let i = 0; i < regardedNetworks.length; i += 1) {
      for (let j = 0; j < regardedNetworks.length; j += 1) {
        if (i !== j) {
          binaryVariablesOfEdge[eKey].push({
            igid: regardedNetworks[i],
            jgid: regardedNetworks[j],
            eKey,
            key: `${regardedNetworks[i]}#${regardedNetworks[j]}#${eKey}`
          })
        }
      }
    }
  }

  // 变量的索引
  let i = 0
  const variableIndex: {[key: string]: number} = {}
  const eKeys = Object.keys(binaryVariablesOfEdge)
  const variables: Array<BinaryVariable | Crossing> = []
  for (const crossing of crossings) {
    const potentialCrossingKey = `${crossing.jgid}#${crossing.jge1}#${crossing.jge2}#${crossing.igid}#${crossing.ige1}#${crossing.ige2}#${crossing.nid}`
    if (potentialCrossingKey in variableIndex) {
      variableIndex[crossing.key] = variableIndex[potentialCrossingKey]
    } else {
      variables.push(crossing)
      variableIndex[crossing.key] = i
      i += 1
    }
  }
  const NUMBER_OF_DECISIONS = variables.length
  for (const eKey of eKeys) {
    const binaryVariables = binaryVariablesOfEdge[eKey]
    for (const binaryVariable of binaryVariables) {
      variables.push(binaryVariable)
      variableIndex[binaryVariable.key] = i
      i += 1
    }
  }
  // 变量的索引完毕
  console.log('variables length', variables.length)

  const MAX_COL = variables.length
  if (MAX_COL !== i) {
    console.log(MAX_COL, i)
  }

  // 添加约束
  let constraintsCount = 0
  const leftMatrix: number[][] = []
  const rightVector: number[] = []

  for (const c of crossings) {
    const parameters: number[] = new Array(MAX_COL).fill(0)
    const cKey = c.key
    const cIndex = variableIndex[cKey]
    parameters[cIndex] = 1

    if (c.type === 1) {
      const xije1Key = `${c.igid}#${c.jgid}#${c.ige1}`
      const xjie2Key = `${c.jgid}#${c.igid}#${c.ige2}`
      const xije1Index = variableIndex[xije1Key]
      const xjie2Index = variableIndex[xjie2Key]
      parameters[xije1Index] = 1
      parameters[xjie2Index] = 1

      rightVector.push(1) // >= TODO
    } else if (c.type === 2) {
      const xije1Key = `${c.igid}#${c.jgid}#${c.ige1}`
      const xije2Key = `${c.igid}#${c.jgid}#${c.ige2}`
      const xije1Index = variableIndex[xije1Key]
      const xije2Index = variableIndex[xije2Key]
      parameters[xije1Index] = 1
      parameters[xije2Index] = 1

      rightVector.push(1) // >= TODO
    } else if (c.type === 3) {
      if (typeof (c.t) === 'undefined') {
        console.log('bug!!!', c.t)
      }

      const xije1Key = `${c.igid}#${c.jgid}#${c.ige1}`
      const xije1Index = variableIndex[xije1Key]
      parameters[xije1Index] = 1

      rightVector.push(1 - (c.t as number)) // >= TODO
    }

    leftMatrix.push(parameters)
    constraintsCount += 1
  }

  console.log('leftMatrix length', leftMatrix.length)
  console.log('rightVector length', rightVector.length)

  // 位置关系传递性约束transitivity
  for (const eKey of eKeys) {
    const regardedNetworks = Array.from(regardedNetworksOfEdge[eKey])
    const N = regardedNetworks.length

    // if（N === 1 || N === 2) { // 不用管
    //   continue
    // }
    if (N >= 3) {
      for (let m = 0; m < N; m += 1) {
        for (let n = 0; n < N; n += 1) {
          if (m !== n) {
            for (let k = 0; k < N; k += 1) {
              if (k !== m && k !== n) {
              // console.log(m, n, k)
                const parameters: number[] = new Array(MAX_COL).fill(0)
                const gid1 = regardedNetworks[m]
                const gid2 = regardedNetworks[n]
                const gid3 = regardedNetworks[k]
                const transKey1 = `${gid3}#${gid1}#${eKey}`
                const transKey2 = `${gid3}#${gid2}#${eKey}`
                const transKey3 = `${gid2}#${gid1}#${eKey}`

                const transvIndex1 = variableIndex[transKey1]
                const transvIndex2 = variableIndex[transKey2]
                const transvIndex3 = variableIndex[transKey3]

                // console.log(m, n, k, transvIndex1, transvIndex2, transvIndex3)

                parameters[transvIndex1] = 1
                parameters[transvIndex2] = -1
                parameters[transvIndex3] = -1

                leftMatrix.push(parameters)
                rightVector.push(-1) // >= TODO
                constraintsCount += 1
              }
            }
          }
        }
      }
    }
  }

  const division = rightVector.length
  if (rightVector.length !== leftMatrix.length) {
    console.log('error')
  }
  console.log(leftMatrix.length)

  // 相加为1的约束
  const addedbvSum1: {[bvkey: string]: boolean} = {}
  for (const eKey of eKeys) {
    const binaryVariables = binaryVariablesOfEdge[eKey]
    for (const binaryVariable of binaryVariables) {
      const parameters: number[] = new Array(MAX_COL).fill(0)
      const bvKey1 = binaryVariable.key
      const bvKey2 = `${binaryVariable.jgid}#${binaryVariable.igid}#${binaryVariable.eKey}`

      if ((!addedbvSum1[bvKey1]) && (!addedbvSum1[bvKey2])) {
        addedbvSum1[bvKey1] = true
        addedbvSum1[bvKey2] = true

        const bvKeyIndex1 = variableIndex[bvKey1]
        const bvKeyIndex2 = variableIndex[bvKey2]

        // console.log(bvKeyIndex1, bvKeyIndex2)

        parameters[bvKeyIndex1] = 1
        parameters[bvKeyIndex2] = 1

        leftMatrix.push(parameters)
        rightVector.push(1) // = TODO
        constraintsCount += 1
      }
    }
  }

  console.log('leftMatrix length', leftMatrix.length)
  console.log('rightVector length', rightVector.length)
  console.log('constraintsCount', constraintsCount)

  // 交叉相等的约束
  // const addedCEquality: {[ckey: string]: boolean} = {}
  // for (const c of crossings) {
  //   const parameters: number[] = new Array(MAX_COL).fill(0)

  //   const cKey1 = c.key
  //   const cKey2 = `${c.jgid}#${c.jge1}#${c.jge2}#${c.igid}#${c.ige1}#${c.ige2}#${c.nid}`

  //   if ((!addedCEquality[cKey1]) && (!addedCEquality[cKey2])) {
  //     const cIndex1 = variableIndex[cKey1]
  //     const cIndex2 = variableIndex[cKey2]
  //     addedCEquality[cKey1] = true
  //     addedCEquality[cKey2] = true

  //     // console.log(cIndex1, cIndex2)
  //     // console.log(cKey1)
  //     // console.log(cKey2)

  //     parameters[cIndex1] = 1
  //     parameters[cIndex2] = -1

  //     parameters)
  //     rightVector.push(0) // = TODO
  //   }
  // }

  // console.log(leftMatrix.length)

  // objectives
  const objectives: number[] = new Array(MAX_COL).fill(0)
  for (const c of crossings) {
    const cKey = c.key
    const cIndex = variableIndex[cKey]
    objectives[cIndex] = c.cost
  }

  const ret = {
    leftMatrix,
    rightVector,
    objectives,
    division,
    decision: NUMBER_OF_DECISIONS
  }

  const regardedNetworksOfEdgeArray: {[eKey: string]: string[]} = {}
  for (const eKey in regardedNetworksOfEdge) {
    const ids = Array.from(regardedNetworksOfEdge[eKey])
    regardedNetworksOfEdgeArray[eKey] = ids
  }

  return {
    ret,
    variableIndex,
    regardedNetworksOfEdgeArray
  }
}
