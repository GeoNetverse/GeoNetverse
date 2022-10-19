import Map from '../components/Map/Map'
import { connect } from 'react-redux'
import { singlePoint } from '../store/models'
import { bindActionCreators, Dispatch } from 'redux'
import { selectPath, setLevel } from '../store/actions'

const mapStateToProps = (state: any) => {
  return {
    state: state
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    selectPath: bindActionCreators(selectPath, dispatch),
    setLevel: bindActionCreators(setLevel, dispatch)
  }
}

const MapCon = connect(mapStateToProps, mapDispatchToProps)(Map)
export default MapCon
