import { ShapeFlags } from "@mini-vue/shared"


export function initSlots(instance, children) {
  const { vnode } = instance
  if ( vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN ) {
    instance.slots = children
    let slots = {}
    for (const key in children) {
      console.log('key', key);
      console.log('key', children[key]);
      const value = children[key]
      if ( typeof value === 'function' ) {
        slots[key] = props => value(props)
      }
    }
    instance.slots = slots
  }

}
