export const indexScreenNodes = (screenNodes: ScreenNode[]) => {
  const screenNodeIndex: {[nid: string]: ScreenNode} = {}
  for (const node of screenNodes) {
    screenNodeIndex[node.nid] = node
  }
  return screenNodeIndex
}
