import { h } from '../lib/mini-vue.esm.js'
export const Foo = {
  render(props, { emit }) {
    return h('div', {
      onClick: () => {
        // emit('add')
        emit('add-demo')
      },
    }, 'foo' + this.a + props.a)
  },

  setup() {}
}