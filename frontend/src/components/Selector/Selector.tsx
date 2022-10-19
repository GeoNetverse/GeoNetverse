// eslint-disable-next-line no-use-before-define
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import 'leaflet/dist/leaflet.css'
import store from '../../store'
import { switchOpen, SwitchOpenSelectAction, selectPath, SelectPathAction, setLevel, SetLevelAction } from '../../store/actions'
import Switch from 'react-switch'
import './Selector.css'
import 'antd/lib/switch/style/index.css'

interface props {
    state: any;
    switchOpen: () => SwitchOpenSelectAction;
    selectPath: (pathInfo: { finfo: [string, string], cinfo: [string, string][]}) => SelectPathAction;
    setLevel: (level: number) => SetLevelAction;
}

interface state {
  dictFS: { [key: string]: {'f': string, 'c':string[] | never[], 'level': number} }
}

class Selector extends Component<props, state> {
  constructor (props: any) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }

  componentDidMount () {
    store.subscribe(() => this.setState({}))
  }

  handleChange (checked: boolean) {
    this.props.switchOpen()
  }

  render () {
    const { openSelect, level } = this.props.state
    const { switchOpen, selectPath } = this.props
    const { dictFS } = this.props.state

    const list: [string, string][] = []
    this.props.state.selectedPaths.forEach((value: string, key: string) => {
      if (((dictFS[key].level >= level) || dictFS[key].c.length === 0) &&
          ((!this.props.state.selectedPaths.has(dictFS[key].f) ||
              (dictFS[dictFS[key].f].level < level)))) { list.push([key, value]) }
    })

    return (
        <div className='selector'>
          <div className='switch_container'>
            <div className='text_switch'>Pinning:</div>
            <div className='split_line_l'/>
            <Switch className='select_switch'
                    onChange={this.handleChange}
                    checked={openSelect}
                    checkedIcon={false}
                    uncheckedIcon={false}
                    onColor='#48AFF1'
                    height={20}
                    width={45}
            />
          </div>
          <div className='selected_path_list'>
            <div className='text_switch'>Pinned:</div>
            <div className='split_line_l'/>
            {
              list.length > 0
                ? list.map((p, index) => (
                    <div
                        key={'color' + index}
                        className='color_block' style={{
                          background: p[1]
                        }
                        }
                    >
                      <svg
                        onClick={() => {
                          const children: [string, string][] = []
                          if (dictFS[p[0]].c.length > 0) {
                            console.log(dictFS[p[0]].c)
                            dictFS[p[0]].c.forEach((c: string) => {
                              children.push([c, 'any'])
                            })
                          }
                          console.log(children)
                          selectPath({ finfo: [p[0], p[1]], cinfo: children })
                          this.setState({})
                        }}
                        width="24" height="24" viewBox="0 0 24 24" fill="white"
                        strokeLinecap="round" strokeLinejoin="round"
                        className="disSelect">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#999999" strokeWidth="2"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="black" strokeWidth="1"/>
                        <line x1="18" y1="6" x2="6" y2="18" stroke="black" strokeWidth="1"/>
                      </svg>
                    </div>
                ))
                : <div className='text_switch' style={
                  {
                    color: '#999999'
                  }}
                >
                empty</div>
            }
          </div>
        </div>
    )
  }
}

const mapStateToProps = (state: any): { state: any } => {
  return {
    state: state
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    switchOpen: bindActionCreators(switchOpen, dispatch),
    selectPath: bindActionCreators(selectPath, dispatch),
    setLevel: bindActionCreators(setLevel, dispatch)
  }
}

const SelectorCon = connect(mapStateToProps, mapDispatchToProps)(Selector)

export default SelectorCon
