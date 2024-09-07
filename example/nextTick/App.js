import { h, ref, reactive, getCurrentInstance } from '../../lib/mini-vue.esm.js'

const App = {

  setup() {
    const instance = getCurrentInstance()
    const count = ref(1)
    const changeCount = () => {
      for(let i = 0; i < 100; i++) {
        count.value = i
      }
      console.log('instance', instance);
    }
    
    return {
      count,
      changeCount
    }
  },
  render() {
    return h('div', {}, [
      h('div', {}, 'count: ' + this.count),
      h('button', { onClick: this.changeCount }, 'update')
    ])
  },
}

export default App
