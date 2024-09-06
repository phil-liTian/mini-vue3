import { h, provider, inject } from '../../lib/mini-vue.esm.js'
const Provider = {
  name: 'Provider',

  render() {

    return h('div', {}, [
      h('h4', {}, 'provider'),
      h(Provider2)
    ])
  },
  setup() {
    provider('foo', 'foo1')
  }
}

const Provider2 = {
  name: 'Provider2',

  render() {

    return h('div', {}, [
      h('h4', {}, 'provider2:' + this.foo), // foo1
      h(Customer)
    ])
  },
  setup() {
    provider('foo', 'foo2')
    const foo = inject('foo')

    return {
      foo
    }
  }
}


const Customer = {
  name: 'Customer',
  render() {
    return h('div', {}, [
      h('h4', {}, 'customer:' + this.foo) // foo2
    ])
  },
  setup() {
    const foo = inject('foo')
    return {
      foo
    }
  }
}

const App = {
  render() {
    return h('div', {}, [h(Provider)])
  },
  setup() {

  }
}

export default App
