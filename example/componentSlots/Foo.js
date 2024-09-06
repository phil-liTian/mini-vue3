import { h, renderSlot, getCurrentInstance } from '../../lib/mini-vue.esm.js'
const Foo = {
  name: 'Foo',
  render(props, { slots }) {
    // console.log('slots-->', renderSlot(slots));
    // 作用域插槽如何处理？
    // 既然children是一个对象 那么array的作用是什么?
    return h('div', { id: '12' }, [
      renderSlot(slots, 'header', { name: 'jack' }),
      h('div', {}, 'Foo'),
      // renderSlot(slots, 'footer')
    ])
  },

  setup() {
    console.log('getCurrentInstance-->', getCurrentInstance());
    return {}
  }
}

export default Foo
