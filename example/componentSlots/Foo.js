import { h, renderSlot } from '../../lib/mini-vue.esm.js'
const Foo = {
  render(props, { slots }) {
    console.log('this.$slots.header', this.$slots.header);

    // 在子组件中如何使用父组件传过来的props呢？
    // 作用域插槽如何处理？
    // 既然children是一个对象 那么array的作用是什么?
    return h('div', {}, [
      // h('p', {}, renderSlot(slots, 'header', { age: 18 }) ),
      h('p', {}, 'Foo'),
      h('p', {}, this.$slots.footer)
    ])
  },

  setup() {
    return {}
  }
}

export default Foo
