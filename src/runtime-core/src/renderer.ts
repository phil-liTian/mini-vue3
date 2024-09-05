import { isObject } from "@mini-vue/shared"
import { ShapeFlags } from "@mini-vue/shared"
import { createComponentInstance, setupComponent } from "./components"
import { shallowReadonly } from "../../reactivity/reactive"

export function render(vnode, container) {
  patch(vnode, container)
}

function patch(vnode, container) {
  if ( vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ) {
    processComponent(vnode, container)
  } else {
    processElement(vnode, container)
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container)
}

function mountElement(vnode: any, container: any) {
  const { type, props, children } = vnode
  const el = vnode.el = document.createElement(type)
  
  for (const key in props) {
    const isOn = key => /^on[A-Z]/.test(key)
    if ( isOn(key) ) {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, props[key])
    }

    el.setAttribute(key, props[key])
  }

  if ( vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN ) {
    mountChildren(vnode, el)
  } else if ( vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN ) {
    el.textContent = children
  }

  container.appendChild(el)
}


function mountChildren(vnode, container) {
  vnode.children.forEach(child => patch(child, container))
}

function processComponent(vnode: any, container: any) {
  // TODO updateComponent
  mountComponent(vnode, container)
}

function mountComponent(initialVNode: any, container: any) {
  const instance = createComponentInstance(initialVNode)
  setupComponent(instance)

  setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance, initialVNode, container) {
  const { proxy, props, emit } = instance
  const subTree = instance.render.call(proxy, shallowReadonly(props), { emit })
  // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
  patch(subTree, container)
  initialVNode.el = subTree.el
}
