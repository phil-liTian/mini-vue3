1. 响应式原理剖析及核心api实现
  响应式原理核心API基于TDD思想开发

实现响应式原理的核心api为
```js
new Proxy(target, {})
```

```js
// effect 是响应式对象收集的内容, 当响应式对象发生变化的时候effect会再次执行
export function effect(fn, options: any = {}) {
  const scheduler = options.scheduler
  const _effect = new ReactiveEffect(fn, scheduler)
  extend(_effect, options)
  _effect.run()
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}
```

在响应式对象被get的时候会进行依赖收集, 被set的时候会将收集到的对象拿出来依次更新

依赖收集
```js
export function track(target, key) {
  if ( !isTracking() ) return
  let depsMap = targetMap.get(target)
  if ( !depsMap ) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let deps = depsMap.get(key)
  if ( !deps ) {
    deps = new Set()
    depsMap.set(key, deps)
  }
  // deps.add(activeEffect)
  // // 反向收集deps，便于在stop方法中清空当前deps中的effect
  // activeEffect.deps.push(deps)
  trackEffects(deps)
}
```

派发更新
```js
export function trigger(target, key, value) {
  const depsMap = targetMap.get(target)
  if ( !depsMap ) return
  const deps = depsMap.get(key)
  triggerEffects(deps)
}
```

实现的核心api有
```js
 1. reactive 包含嵌套reactive对象, 即reactive对象的元素还是一个对象
 2. isReactive
 3. readonly 嵌套的readonly对象, 即readonly对象的元素还是一个对象
 4.  shallowReadonly 
 5. isReadonly
 6. onStop的实现
 7. scheduler的实现
 8. ref实现, 清晰理解ref对象为什么要通过.value来获取值
 9. isRef  判断是不是ref对象
 10. unRef  判断是不是ref对象, 如果是ref对象则返回ref对象中的value, 否则返回本身
 11. proxyRefs  将ref对象中的value暴露出来, 方便在模板中直接使用ref对象
 12. computed 利用schedule实现一个lazy computed 懒更新
```

2. 运行时核心流程实现

实现组件代理对象, 将setup返回的对象挂载到render函数的this上, 可以通过this直接访问setup返回的对象
```js
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

    },

    set({ _: instance }, key, value) {
      
      const { setupState } = instance
      if ( key in setupState ) {
        setupState[key] = value
      }
      return true
    }
  }
```

shapFlags实现标记组件类型及children类型、slots类型等

```js
export const enum ShapeFlags {
  ELEMENT = 1,
  STATEFUL_COMPONENT = 1 << 1,
  TEXT_CHILDREN = 1 << 2,
  ARRAY_CHILDREN = 1 << 3,
  SLOTS_CHILDREN = 1 << 4
}
```

使用原型链的概念实现跨级组件通讯的核心api

```js
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
```

双端diff算法实现



实现的核心api有
```js
  1. createApp 实现app实例的创建
  2. createRenderer 实现自定义渲染器
  3. createVNode 实现虚拟dom的创建
  4. renderSlots 实现slots的实现
  5. createTextVNode 实现文本节点的创建
  6. getCurrentInstance 实现获取当前实例
  7. h 实现虚拟dom的创建
  8. provide & inject 实现跨级组件通讯
```

