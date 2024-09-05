
import { h } from '../lib/mini-vue.esm.js'
import { Foo } from './Foo.js'
const App = {
  render(props) {
    window.$self = this

    // return h('div', {}, [
    //   h('p', { class: 'red' }, 'hello'),
    //   h('p', { class: 'blue' }, 'mini-vue')
    // ])

    // return h('div', {
    //   a: '122',
    //   onClick: () => {
    //     console.log('click')
    //   }
    // }, 'hi ' + this.msg + this.a)

    return h(Foo, { 
      a: 123, 
      onAdd: () => { console.log('onAdd clicked')},
      onAddDemo: () => { console.log('onAddDemo clicked')}
    })
  },

  setup() {
    return {
      msg: 'vue'
    }
  }
}

export default App
