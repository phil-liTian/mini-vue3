import { getCurrentInstance } from "@mini-vue/runtime-core";

export function provider(key, value) {
  const currentInstance: any = getCurrentInstance()

  // 可以实现将祖先节点的providers提供给后代组件, 但是如果后代节点中有组件覆盖了, 那么在当前节点获取的providers将会被直接覆盖, 导致当前组件的数据源丢失
  // currentInstance.provides[key] = value

  if ( currentInstance ) {
    let { provides } = currentInstance
    const parentProviders = currentInstance.parent?.provides
    // 不需要每次provider的时候都处理原型链指向的问题, 只需要在初始化的处理即可
    
    if ( provides === parentProviders ) {
      // 采用原型链继承, 实现provides的继承
      provides = currentInstance.provides = Object.create(parentProviders)
    }

    provides[key] = value
  }
}

export function inject(key, defaultValue){
  const currentInstance: any = getCurrentInstance()
  if ( currentInstance ) {
    const parentProvides = currentInstance.parent?.provides
    
    if ( !parentProvides ) return
    if ( key in parentProvides ) {
      return parentProvides[key]
    } else {
      if ( typeof defaultValue === 'function' ) {
        return defaultValue()
      }
      return defaultValue || ''
    }
  }
}