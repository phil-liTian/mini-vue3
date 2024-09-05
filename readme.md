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



