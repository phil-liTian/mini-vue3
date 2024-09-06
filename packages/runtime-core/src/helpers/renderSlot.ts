import { createVNode } from "../vnode"

export function renderSlot(slots, name: string, props = {}) {
  const slot = slots[name]

  if (slot) {
    const slotContent = slot(props)
    return createVNode('div', {}, slotContent)
  }
}
