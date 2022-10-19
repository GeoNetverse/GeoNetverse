import { singlePoint, Line } from './store/models'
export const pointData: singlePoint[] = [
  {
    id: 1,
    radius: 200,
    position: [48.858222, 2.2945]
  },
  {
    id: 2,
    radius: 100,
    position: [48.861111, 2.336389]
  },
  {
    id: 3,
    radius: 150,
    position: [48.853, 2.3498]
  },
  {
    id: 4,
    radius: 250,
    position: [48.8738, 2.295]
  },
  {
    id: 5,
    radius: 180,
    position: [48.886694, 2.343]
  },
  {
    id: 6,
    radius: 170,
    position: [48.86, 2.326389]
  }
]

export const lineData: Line[] = [
  {
    points: [1, 2, 3]
  },
  {
    points: [1, 3, 2]
  },
  {
    points: [3, 4, 5]
  },
  {
    points: [1, 4, 6]
  }
]
