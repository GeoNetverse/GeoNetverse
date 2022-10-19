import { singlePoint } from '../models'
import { pointData } from '../../data'

const initialState: Array<singlePoint> = pointData

const productsReducer = (
  state: singlePoint[] = initialState,
  action: { type: string; payload: any }
): singlePoint[] => {
  switch (action.type) {
    //   case SET_ALL_PLACES: {
    //     return { ...state, places: action.payload };
    //   }
    default: {
      return state
    }
  }
}

export default productsReducer
