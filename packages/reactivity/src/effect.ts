import { extend } from '@mini-vue/shared'
let activeEffect;
let shouldTrack = false

export class ReactiveEffect {
  private _fn: any;
  active = true;
  deps: Set<any>[] = [];
  public onStop?: () => void;

  constructor(fn, public scheduler?) {
    this._fn = fn
  }
  // 清空当前depsMap里面的deps
  stop() {
    if ( this.active ) {
      if ( this.onStop ) {
        this.onStop()
      }
      cleanUpEffect(this)
      this.active = false
      shouldTrack = false
    }
  }

  run() {
    if ( !this.active ) {
      return this._fn()
    }

    shouldTrack = true
    // 顺序切忌不可调整
    activeEffect = this
    // fn为effect方法中的回调函数, 在此处会进行依赖收集和派发更新操作
    // 收集的activeEffect为当前effect,一旦调换顺序会导致取值失败
    const result = this._fn()
    shouldTrack = false

    return result
  }
}

function cleanUpEffect(effect) {
  effect.deps.map(dep => dep.delete(effect))
  effect.deps.length = 0
}


const targetMap = new Map()
/**
 * 依赖收集: 存储target、key的映射关系
 * targetMap 存储target
 * depsMap 存储key、effect的映射关系
 * deps 存储effect
 * 
 * @param target 
 * @param key 
 */
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


export function trackEffects(deps)  {
  if ( !isTracking() ) return
  deps.add(activeEffect)
  // 反向收集deps，便于在stop方法中清空当前deps中的effect
  activeEffect.deps.push(deps)
}

// 返回结果代表是否可进行依赖收集
function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

/**
 * 派发更新
 * 当值发生变化时，通知对应的effect执行
 * @param target 
 * @param key 
 * @param value 
 * @returns 
 */
export function trigger(target, key, value) {
  const depsMap = targetMap.get(target)
  if ( !depsMap ) return
  const deps = depsMap.get(key)
  triggerEffects(deps)
}

export function triggerEffects(deps) {
  for (const effect of deps) {
    if ( effect.scheduler ) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn, options: any = {}) {
  const scheduler = options.scheduler
  // 
  const _effect = new ReactiveEffect(fn, scheduler)
  extend(_effect, options)
  _effect.run()
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}
/**
 * stop清空当前depsMap里面的deps
 * @param runner effect返回的runner函数
 */
export function stop(runner) {
  runner.effect.stop()
}
