// eslint-disable-next-line no-use-before-define
import React from 'react'
import './App.css'
import MapCon from './containers/MapCon'
import SelectorCon from './components/Selector/Selector'
function App () {
  return (
    <div className="main">
      <MapCon />
      <SelectorCon/>
    </div>
  )
}

export default App
