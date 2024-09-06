import { ShapeFlags } from "@mini-vue/shared"


export function initSlots(instance, children) {
  const { vnode } = instance

  if ( vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN ) {
    normalizeObjectSlots(instance.slots, children)
  }
}

const normalizeObjectSlots = (slots, children) => {
  for (const key in children) {
    const slot = children[key]
    if ( typeof slot === 'function' ) {
      slots[key] = props => normlizeSlotValue(slot(props))
    }
  }
}

const normlizeSlotValue = value => {
  // 组件的children只支持text和array, 当前value是一个函数, 需转换成数组处理
  return Array.isArray(value) ? value : [value]
}

