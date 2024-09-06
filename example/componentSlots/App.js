
import { h, createTextVNode, getCurrentInstance } from '../../lib/mini-vue.esm.js'
import Foo from './Foo.js'

const App = {
  name: 'App',
  render(props) {
    return h(Foo, {}, {
      header: ({ name }) => h('p', {}, 'header:' + name),
      // default: h('p', {}, 'default'),
      footer: () => h('p', {}, 'footer')
    })
    
    // return createTextVNode('children')
  },

  setup() {
    console.log('getCurrentInstance--->', getCurrentInstance());

    // return 
  }
}

export default App
