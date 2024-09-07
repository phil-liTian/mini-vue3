import { h, ref, reactive } from '../../lib/mini-vue.esm.js'
import { prevChild, nextChild } from './dataSource.js'

// const prevChildren = [h('div', {}, 'A'), h('div', {}, 'B')]
// const nextChildren = 'newChildren'



const App = {
  render() {

    // TextToText
    // return h('div', {}, this.isChanged ? 'new-children' : 'old-children')

    // ArrayToText
    // return h('div', {}, this.isChanged ? nextChildren : prevChildren)

    // TextToArray
    // return h('div', {}, this.isChanged ? prevChildren : nextChildren)

    return h('div', {}, this.isChanged ? nextChild : prevChild)
  },

  setup() {
    const isChanged = ref(false)
    window.isChanged = isChanged
    
    return {
      isChanged
    }
  }
}

export default App
