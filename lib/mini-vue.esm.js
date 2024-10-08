const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        component: null,
        children,
        el: null,
        key: props && props.key,
        shapeFlag: getShapeFlag(type), // 添加标识 是否元素，还是组件, children 是string还是array, 或者是插槽
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // vnode是一个组件而不是元素的
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOTS_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(children) {
    return createVNode(Text, {}, children);
}
// 给不同类型组件增加标识
function getShapeFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createAppApi(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlot(slots, name, props = {}) {
    const slot = slots[name];
    if (slot) {
        // 子组件中通过props将参数传递给父组件
        const slotContent = slot(props);
        // 返回的slotContent是一个数组由normlizeSlotValue处理得到
        // 这里会多创建一个div标签
        // return createVNode('div', {}, slotContent)
        // processFragment 直接mountChildren, 绕过创建type的过程
        return createVNode(Fragment, {}, slotContent);
    }
}

const extend = Object.assign;
const isObject = value => value !== null && typeof value === 'object';
const hasChanged = (val, newVal) => !Object.is(val, newVal);
const hasOwn = (key, obj) => Object.prototype.hasOwnProperty.call(obj, key);
// 首字母换成大写
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
// 将 kebab-case风格命名的事件名转换成驼峰命名
const camelize = (str) => str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '');
// 转换成事件明
const toHandleKey = (str) => str ? camelize(`on${capitalize(str)}`) : '';

function emit(instance, event, ...args) {
    const props = instance.props;
    // event add => onAdd
    // event add-demo => onAddDemo
    // 添加on
    const handler = props[toHandleKey(event)];
    if (handler) {
        handler();
    }
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    '$el': instance => instance.vnode.el,
    '$props': instance => instance.props,
    "$slots": instance => instance.slots
};
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(key, setupState)) {
            return setupState[key];
        }
        if (hasOwn(key, props)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
    set({ _: instance }, key, value) {
        const { setupState } = instance;
        if (key in setupState) {
            setupState[key] = value;
        }
        return true;
    }
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOTS_CHILDREN */) {
        normalizeObjectSlots(instance.slots, children);
    }
}
const normalizeObjectSlots = (slots, children) => {
    for (const key in children) {
        const slot = children[key];
        if (typeof slot === 'function') {
            slots[key] = props => normlizeSlotValue(slot(props));
        }
    }
};
const normlizeSlotValue = value => {
    // 组件的children只支持text和array, 当前value是一个函数, 需转换成数组处理
    return Array.isArray(value) ? value : [value];
};

let activeEffect;
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.active = true;
        this.deps = [];
        this._fn = fn;
    }
    // 清空当前depsMap里面的deps
    stop() {
        if (this.active) {
            if (this.onStop) {
                this.onStop();
            }
            cleanUpEffect(this);
            this.active = false;
            shouldTrack = false;
        }
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        // 顺序切忌不可调整
        activeEffect = this;
        // fn为effect方法中的回调函数, 在此处会进行依赖收集和派发更新操作
        // 收集的activeEffect为当前effect,一旦调换顺序会导致取值失败
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
}
function cleanUpEffect(effect) {
    effect.deps.map(dep => dep.delete(effect));
    effect.deps.length = 0;
}
const targetMap = new Map();
/**
 * 依赖收集: 存储target、key的映射关系
 * targetMap 存储target
 * depsMap 存储key、effect的映射关系
 * deps 存储effect
 *
 * @param target
 * @param key
 */
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
    }
    // deps.add(activeEffect)
    // // 反向收集deps，便于在stop方法中清空当前deps中的effect
    // activeEffect.deps.push(deps)
    trackEffects(deps);
}
function trackEffects(deps) {
    if (!isTracking())
        return;
    deps.add(activeEffect);
    // 反向收集deps，便于在stop方法中清空当前deps中的effect
    activeEffect.deps.push(deps);
}
// 返回结果代表是否可进行依赖收集
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
/**
 * 派发更新
 * 当值发生变化时，通知对应的effect执行
 * @param target
 * @param key
 * @param value
 * @returns
 */
function trigger(target, key, value) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    triggerEffects(deps);
}
function triggerEffects(deps) {
    for (const effect of deps) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const scheduler = options.scheduler;
    // 
    const _effect = new ReactiveEffect(fn, scheduler);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
/**
 * stop清空当前depsMap里面的deps
 * @param runner effect返回的runner函数
 */
function stop(runner) {
    runner.effect.stop();
}

const createGetter = (isReadonly = false, isShallow = false) => {
    return function get(target, key) {
        // 依赖收集
        if (!isReadonly) {
            track(target, key);
        }
        const res = Reflect.get(target, key);
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        if (isShallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
};
const createSetter = () => {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 派发更新
        trigger(target, key);
        return res;
    };
};
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set: (target, key, value) => {
        console.warn(`${String(key)} is readonly, not allowed to set`);
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet });

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function isReactive(value) {
    return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */]);
}
function createActiveObject(target, baseHandlers) {
    return new Proxy(target, baseHandlers);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.deps = new Set();
    }
    get value() {
        // 收集依赖
        trackRefValue(this.deps);
        return this._value;
    }
    set value(newValue) {
        if (!hasChanged(this._rawValue, newValue))
            return;
        this._rawValue = newValue;
        this._value = convert(newValue);
        triggerEffects(this.deps);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(value) {
    return !!(value && value.__v_isRef);
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(value) {
    return new Proxy(value, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            const oldValue = target[key];
            if (isRef(oldValue) && !isRef(value)) {
                return target[key].value = value;
            }
            return Reflect.set(target, key, value);
        }
    });
}
function triggerRefValue(dep) {
    triggerEffects(dep);
}
function trackRefValue(dep) {
    trackEffects(dep);
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this.deps = new Set();
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty)
                return;
            this._dirty = true;
            triggerRefValue(this.deps);
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this.effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImpl(getter);
}

let currentInstance = {};
function createComponentInstance(vnode, parent) {
    let component = {
        isMounted: false,
        vnode, // virture Dom
        type: vnode.type, // 组件类型 可以是对象或者string类型
        setupState: {}, // 存储setup的返回值
        ctx: {}, // 组件实例上下文对象
        props: {}, // 组件props
        emit: () => { },
        slots: {},
        parent, // 父级组件
        provides: parent ? parent.provides : {} // 实现跨级组件通讯
    };
    component.ctx = {
        _: component
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    initProps(instance, props);
    initSlots(instance, children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const { setup } = instance.type;
    // 增加代理对象, 实现可直接通过this访问setup的返回值
    instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers);
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
        setCurrentInstance(null);
    }
}
function handleSetupResult(instance, setupResult) {
    // 还有可能是一个函数
    if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    if (component.render) {
        instance.render = component.render;
    }
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
function getCurrentInstance() {
    return currentInstance;
}

function provider(key, value) {
    var _a;
    const currentInstance = getCurrentInstance();
    // 可以实现将祖先节点的providers提供给后代组件, 但是如果后代节点中有组件覆盖了, 那么在当前节点获取的providers将会被直接覆盖, 导致当前组件的数据源丢失
    // currentInstance.provides[key] = value
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProviders = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 不需要每次provider的时候都处理原型链指向的问题, 只需要在初始化的处理即可
        if (provides === parentProviders) {
            // 采用原型链继承, 实现provides的继承
            provides = currentInstance.provides = Object.create(parentProviders);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (!parentProvides)
            return;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue || '';
        }
    }
}

function shouldUpdateComponent(n1, n2) {
    const { props: prevProps } = n1;
    const { props: nextProps } = n2;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

let queue = [];
let isFlushPending = false;
let P = Promise.resolve();
function nextTick(fn) {
    return fn ? P.then(fn) : P;
}
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    flushJobs();
}
function flushJobs() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flush);
}
function flush() {
    isFlushPending = false;
    let job;
    while (job = queue.shift()) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, insert: hostInsert, patchProp: hostPatchProp, setElementText: hostSetElementText, remove: hostRemove } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n2, container);
                break;
            default:
                if (n2.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                else {
                    if (!n1) {
                        processElement(n1, n2, container, parentComponent, anchor);
                    }
                    else {
                        // 执行更新逻辑
                        updateElement(n1, n2, container, parentComponent, anchor);
                    }
                }
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        const { children } = n2;
        mountChildren(children, container, parentComponent);
    }
    function processText(n2, container) {
        const textNode = document.createTextNode(n2.children);
        container.appendChild(textNode);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        mountElement(n1, n2, container, parentComponent, anchor);
    }
    function updateElement(n1, n2, container, parentComponent, anchor) {
        // 更新element
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        const el = n2.el = n1.el;
        // 更新props
        patchProps(el, oldProps, newProps);
        // 更新children, 父级容器应该是el
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    function patchProps(el, oldProps, newProps) {
        // 处理属性(更新属性)
        // 新增，删除、设置成undefined则是删除
        for (const key in newProps) {
            const prevProp = oldProps[key];
            const nextProp = newProps[key];
            if (prevProp !== nextProp) {
                hostPatchProp(el, key, prevProp, nextProp);
            }
        }
        // oldProps中存在 在newProps中不存在则移除
        for (const key in oldProps) {
            if (!(key in newProps)) {
                hostPatchProp(el, key, oldProps[key], null);
            }
        }
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { children: c1, shapeFlag: prevShapeFlag } = n1;
        const { children: c2, shapeFlag } = n2;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unMountChildren(c1);
            }
            if (c1 !== c2) {
                // 更新elementText
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent);
            }
            else {
                // TODO: ArrayToArray
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0, e1 = c1.length - 1, e2 = c2.length - 1;
        // 是否是相同节点
        function isSameNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 左侧对比
        while (i <= e1 && i <= e2) {
            if (isSameNodeType(c1[i], c2[i])) {
                patch(c1[i], c2[i], container, parentComponent, anchor);
            }
            else {
                // 
                break;
            }
            i++;
        }
        // 右侧对比
        while (i <= e1 && i <= e2) {
            if (isSameNodeType(c1[e1], c2[e2])) {
                patch(c1[e1], c2[e2], container, parentComponent, anchor);
            }
            else {
                // 
                break;
            }
            e1--;
            e2--;
        }
        // 新的比旧的长 需要创建
        if (i > e1 && i <= e2) {
            // 如果在前面插入的话，当前api(appendChild)则无法满足需求了
            const anchorIndex = e2 + 1;
            const anchor = anchorIndex < c2.length ? c2[anchorIndex].el : null;
            // insert有可能是多个
            // i = 0, e1 = -1, e2 = 1
            // i可能有多个 所以此时需要循环。
            while (i <= e2) {
                patch(null, c2[i], container, parentComponent, anchor);
                i++;
            }
        }
        else if (i > e2 && i <= e1) {
            // 新的比旧的短 需要删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 处理中间乱序的部分
            let s1 = i, s2 = i, patched = 0, toBePatched = e2 - i + 1;
            let moved = false;
            let maxIndexSoFar = 0;
            // 先处理元素删除逻辑(在老的结构里面有, 新的结构里面没有;则删除), 使用map结构存储在新结构了里面key跟index的map结构, 遍历查看在老的结构里面有没有，如果在老结构里面有新结构里面没有则删除
            const keyToNewIndexMap = new Map();
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 新结构的index在老结构中index的映射关系
            let newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            for (let i = s1; i <= e1; i++) {
                // 删除逻辑优化点:
                // 1.如果新结构里面的节点处理完成了，老结构里面还有未处理的都都删除, 无需在继续比较了
                if (patched >= toBePatched) {
                    hostRemove(c1[i].el);
                    continue;
                }
                let newIndex = keyToNewIndexMap.get(c1[i].key);
                if (!newIndex) {
                    hostRemove(c1[i].el);
                }
                else {
                    // 优化点3: 在新节点中的顺序相较老节点顺序发生变化, 则需要计算最长递增子序列
                    if (newIndex > maxIndexSoFar) {
                        maxIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(c1[i], c2[newIndex], container, parentComponent, anchor);
                    patched++;
                }
            }
            // 获取最长递增子序列 => [1,2]
            // 要确保anchor元素是已经确定了位置的元素, 所以此处采用倒叙实现
            const newCreasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = newCreasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 优化点2: 如果 j < 0 则后续比较的元素都是需要插入的
                    if (j < 0 && newCreasingNewIndexSequence[j] !== i) {
                        // 如果新节点不在newCreasingNewIndexSequence中，则需要移动
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function mountElement(n1, n2, container, parentComponent, anchor) {
        const { type, props, children } = n2;
        const el = n2.el = hostCreateElement(type);
        for (const key in props) {
            // const isOn = key => /^on[A-Z]/.test(key)
            // if ( isOn(key) ) {
            //   const eventName = key.slice(2).toLowerCase()
            //   el.addEventListener(eventName, props[key])
            // }
            // el.setAttribute(key, props[key])
            hostPatchProp(el, key, null, props[key]);
        }
        if (n2.shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(n2.children, el, parentComponent);
        }
        else if (n2.shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        // container.appendChild(el)
        hostInsert(el, container, anchor);
    }
    function unMountChildren(children, container) {
        children.forEach(child => hostRemove(child));
    }
    function mountChildren(children, container, parentComponent) {
        children.forEach(child => patch(null, child, container, parentComponent, null));
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        // TODO updateComponent
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2, container) {
        // 组件实例
        const instance = n2.component = n1.component;
        instance.next = n2;
        if (shouldUpdateComponent(n1, n2)) {
            instance.update();
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        const { proxy, props, emit, slots } = instance;
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log('init');
                // 初次加载 执行挂载逻辑
                const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots });
                // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
                patch(null, subTree, container, instance, null);
                initialVNode.el = subTree.el;
                instance.subTree = subTree;
                instance.isMounted = true;
            }
            else {
                console.log('update');
                const { next, vnode } = instance;
                if (next) {
                    // next.el = vnode.el
                    updateComponentPreRender(instance, next);
                }
                // 执行更新逻辑
                const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots });
                // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
                // 原来的节点 跟现在的最新节点比较
                const prevSubTree = instance.subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
                instance.subTree = subTree;
                initialVNode.el = subTree.el;
            }
        }, {
            scheduler() {
                queueJob(instance.update);
            }
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        // instance.vnode = nextVNode
        instance.props = nextVNode.props;
    }
    return {
        createApp: createAppApi(render)
    };
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, oldProp, newProp) {
    const isOn = key => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, newProp);
    }
    else {
        if (newProp === undefined || newProp === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, newProp);
        }
    }
}
function insert(el, container, anchor = null) {
    // container.appendChild(el)
    container.insertBefore(el, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, str) {
    el.textContent = str;
}
const endureRenderer = () => {
    return createRenderer({
        createElement,
        patchProp,
        insert,
        setElementText,
        remove
    });
};
const createApp = (...args) => {
    // @ts-ignore
    return endureRenderer().createApp(...args);
};

export { Fragment, Text, computed, createApp, createAppApi, createComponentInstance, createRenderer, createTextVNode, createVNode, effect, getCurrentInstance, h, inject, isReactive, isReadonly, isRef, nextTick, provider, proxyRefs, reactive, readonly, ref, renderSlot, setupComponent, shallowReadonly, stop, unRef };
