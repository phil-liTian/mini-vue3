import { ShapeFlags } from "@mini-vue/shared"

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type), // 添加标识 是否元素，还是组件, children 是string还是array, 或者是插槽
  }

  if ( typeof children === 'string' ) {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if ( Array.isArray(children) ) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // vnode是一个组件而不是元素的
  if ( vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ) {
    if ( typeof children === 'object' ) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  }

  return vnode
}

export function createTextVNode(children) {
  console.log('children', createVNode(Text, {}, children));
  
  return createVNode(Text, {}, children)
}


// 给不同类型组件增加标识
function getShapeFlag(type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}
