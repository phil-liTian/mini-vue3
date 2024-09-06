import { createVNode, Fragment } from "../vnode"

export function renderSlot(slots, name: string, props = {}) {
  const slot = slots[name]

  if (slot) {
    // 子组件中通过props将参数传递给父组件
    const slotContent = slot(props)
    // 返回的slotContent是一个数组由normlizeSlotValue处理得到
    // 这里会多创建一个div标签
    // return createVNode('div', {}, slotContent)
    // processFragment 直接mountChildren, 绕过创建type的过程
    return createVNode(Fragment, {}, slotContent)
  }
}
