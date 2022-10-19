type GlobalScaleFunction = (v: number, zoom: number) => number
export const globalScale: GlobalScaleFunction = (v: number, zoom: number) => Math.pow(2, zoom) * v / 8000 / zoom
// 7500 for airvis viscas, 4300 for aircas, 10000 for nyc, 8000 for zhengzhou

// export const globalScale: GlobalScaleFunction = (v: number, zoom: number) => 20 * v / 3000
// export const globalScale: GlobalScaleFunction = (v: number) => 20 * v / 100
