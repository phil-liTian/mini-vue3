import { isObject } from "@mini-vue/shared"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { publicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"
import { proxyRefs } from "@mini-vue/reactivity"

let currentInstance = {}
export function createComponentInstance(vnode, parent) {
  
  let component = {
    isMounted: false,
    vnode, // virture Dom
    type: vnode.type, // 组件类型 可以是对象或者string类型
    setupState: {}, // 存储setup的返回值
    ctx: {}, // 组件实例上下文对象
    props: {}, // 组件props
    emit: () => {},
    slots: {},
    parent, // 父级组件
    provides: parent ? parent.provides : {} // 实现跨级组件通讯
  }

  component.ctx = {
    _: component
  }

  component.emit = emit.bind(null, component) as any

  return component
}

export function setupComponent(instance) {
  const { props, children } = instance.vnode
  initProps(instance, props)
  
  initSlots(instance, children)
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  const { setup } = instance.type
  // 增加代理对象, 实现可直接通过this访问setup的返回值
  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers)

  if ( setup ) {
    setCurrentInstance(instance)
    const setupResult = setup()
    handleSetupResult(instance, setupResult)
    setCurrentInstance(null)
  }
}

function handleSetupResult(instance: any, setupResult: any) {
  // 还有可能是一个函数
  if ( isObject(setupResult) ) {
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const component = instance.type

  if ( component.render ) {
    instance.render = component.render
  }
}


function setCurrentInstance(instance) {
  currentInstance = instance
}

export function getCurrentInstance() {
  return currentInstance
}
