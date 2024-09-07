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
核心: 先从左侧比较,锁定第一个不同元素的下标;再从右侧比较, 锁定比较对象的最大下标.缩小需要操作移动、删除、增加等行为的元素下表的范围, 采用最长递增子序列的算法实现最小移动，实现最优解
```js 
// 处理中间乱序的部分
let s1 = i, s2 = i, patched = 0, toBePatched = e2 - i + 1;
let moved = false;
let maxIndexSoFar = 0;

// 先处理元素删除逻辑(在老的结构里面有, 新的结构里面没有;则删除), 使用map结构存储在新结构了里面key跟index的map结构, 遍历查看在老的结构里面有没有，如果在老结构里面有新结构里面没有则删除
const keyToNewIndexMap = new Map()
for (let i = s2; i <= e2; i++) {
  const nextChild = c2[i]
  keyToNewIndexMap.set(nextChild.key, i)
}

// 新结构的index在老结构中index的映射关系
let newIndexToOldIndexMap = new Array(toBePatched).fill(0)

for (let i = s1; i <= e1; i++) {
  // 删除逻辑优化点:
  // 1.如果新结构里面的节点处理完成了，老结构里面还有未处理的都都删除, 无需在继续比较了
  if ( patched >= toBePatched ) {
    hostRemove(c1[i].el)
    continue
  }

  let newIndex = keyToNewIndexMap.get(c1[i].key)
  if ( !newIndex ) {
    hostRemove(c1[i].el)
  } else {
    // 优化点3: 在新节点中的顺序相较老节点顺序发生变化, 则需要计算最长递增子序列
    if ( newIndex > maxIndexSoFar ) {
      maxIndexSoFar = newIndex
    } else {
      moved = true
    }

    newIndexToOldIndexMap[newIndex - s2] = i + 1
    patch(c1[i], c2[newIndex], container, parentComponent, anchor);
    patched++
  }
}

// 获取最长递增子序列 => [1,2]
// 要确保anchor元素是已经确定了位置的元素, 所以此处采用倒叙实现
const newCreasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
let j = newCreasingNewIndexSequence.length - 1

for (let i = toBePatched - 1; i >= 0; i--) {
  const nextIndex = s2 + i
  const nextChild = c2[nextIndex]
  const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null

  if ( newIndexToOldIndexMap[i] === 0) {
    patch(null, nextChild, container, parentComponent, anchor)
  } else if ( moved ) {
    // 优化点2: 如果 j < 0 则后续比较的元素都是需要插入的
    if ( j < 0 && newCreasingNewIndexSequence[j] !== i ) {
      // 如果新节点不在newCreasingNewIndexSequence中，则需要移动
      hostInsert(nextChild.el, container, anchor)
    } else {
      j--
    }
  }
}
```

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
// 还有一些相关功能: 组件代理对象、$emit、$props、$slots实现
```
