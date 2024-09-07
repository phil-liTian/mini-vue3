import { h, ref, reactive } from '../../lib/mini-vue.esm.js'

const Child = {
  setup() {
    return {
    }
  },
  render(props) {
    return h('div', {}, `child:${this.$props.msg}`)
  }
}


const App = {

  setup() {
    const count = ref(1)
    const msg = ref('123')
    const changeCount = () => {
      count.value ++
      // msg.value = '456'
    }
    
    return {
      count,
      msg,
      changeCount
    }
  },
  render() {
    return h('div', {}, [
      h(Child, { msg: this.count }),
      h('div', {}, 'count: ' + this.count),
      h('button', { onClick: this.changeCount }, 'update')
    ])
  },
}

export default App
