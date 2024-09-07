import { h, ref, reactive } from '../../lib/mini-vue.esm.js'

const App = {
  render() {
    return h('div', {}, )

    // return h('div', { foo: this.obj.foo, bar: this.obj.bar },
    //   [
    //   h('button', {
    //     onClick: () => {
    //       this.obj.foo = 'foo-new'
    //       console.log('this.obj', this.obj);
          
    //     }
    //   }, 'update'),
    //   h('button', {
    //     onClick: () => {
    //       this.obj.foo = undefined
    //     }
    //   }, 'set undefined'),
    //   h('button', { 
    //     onClick: this.changeObj 
    //   }, 'set foo')
    // ])
  },

  setup() {
    const state = ref({ count: 1 })
    const count = ref(1)
    
    let obj = ref({
      foo: 'foo',
      bar: 'bar'
    })
    const changeObj = () => {
      obj.value = {
        foo: 'foo-new'
      }
    }
    return {
      count,
      state,
      obj,
      changeObj
    }
  }
}

export default App
