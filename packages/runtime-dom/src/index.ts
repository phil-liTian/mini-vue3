import { createRenderer } from '@mini-vue/runtime-core'
export * from '@mini-vue/runtime-core'
export * from '@mini-vue/reactivity'


function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, oldProp, newProp) {
   const isOn = key => /^on[A-Z]/.test(key)
  if ( isOn(key) ) {
    const eventName = key.slice(2).toLowerCase()
    el.addEventListener(eventName, newProp)
  } else {
    if ( newProp === undefined || newProp === null ) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, newProp)
    }
  }
}

function insert(el, container, anchor = null) {
  // container.appendChild(el)
  container.insertBefore(el, anchor)
}

function remove(child) {
  const parent = child.parentNode
  if ( parent ) {
    parent.removeChild(child)
  }
}

function setElementText(el, str) {
  el.textContent = str
}


const endureRenderer = () => {
  return createRenderer({
    createElement,
    patchProp,
    insert,
    setElementText,
    remove
  })
}

export const createApp = (...args) => {
  // @ts-ignore
  return endureRenderer().createApp(...args)
}
