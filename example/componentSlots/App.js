
import { h } from '../../lib/mini-vue.esm.js'
import Foo from './Foo.js'

const App = {
  render(props) {
    return h(Foo, {}, {
      header: ({ age = 1 }) => 'Header',
      Footer: ({ age = 100 }) => 'Footer'
    })
  },

  setup() {
    
  }
}

export default App
