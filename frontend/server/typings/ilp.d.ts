interface Crossing {
  igid: string,
  ige1: string, // eKey
  ige2: string, // eKey
  jgid: string,
  jge1: string, // eKey
  jge2: string, // eKey
  nid: string,
  cost: number,
  key: string,
  type: number,
  t?: number
}

interface BinaryVariable {
  igid: string,
  jgid: string,
  eKey: string,
  key: string
}
