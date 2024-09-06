import { hasOwn } from "@mini-vue/shared"

const publicPropertiesMap = {
  '$el': instance => instance.vnode.el,
  '$props': instance => instance.props,
  "$slots": instance => instance.slots
}

export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance
    
    if ( hasOwn(key, setupState) ) {
      return setupState[key]
    }
    
    if ( hasOwn(key, props)) {
      return props[key]
    }

    const publicGetter = publicPropertiesMap[key]
    
    if ( publicGetter ) {
      return publicGetter(instance)
    }

  }
}