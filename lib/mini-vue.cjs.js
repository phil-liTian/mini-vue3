'use strict';

const extend = Object.assign;
const isObject = value => value !== null && typeof value === 'object';
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
    }
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOTS_CHILDREN */) {
        instance.slots = children;
        let slots = {};
        for (const key in children) {
            console.log('key', key);
            console.log('key', children[key]);
            const value = children[key];
            if (typeof value === 'function') {
                slots[key] = props => value(props);
            }
        }
        instance.slots = slots;
    }
}

function createComponentInstance(vnode) {
    let component = {
        vnode, // virture Dom
        type: vnode.type, // 组件类型 可以是对象或者string类型
        setupState: {}, // 存储setup的返回值
        ctx: {}, // 组件实例上下文对象
        props: {}, // 组件props
        emit: () => { },
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
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // 还有可能是一个函数
    if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    if (component.render) {
        instance.render = component.render;
    }
}

const targetMap = new Map();
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

const createGetter = (isReadonly = false, isShallow = false) => {
    return function get(target, key) {
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
function createActiveObject(target, baseHandlers) {
    return new Proxy(target, baseHandlers);
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
    else {
        processElement(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, props, children } = vnode;
    const el = vnode.el = document.createElement(type);
    for (const key in props) {
        const isOn = key => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, props[key]);
        }
        el.setAttribute(key, props[key]);
    }
    if (vnode.shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    else if (vnode.shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    container.appendChild(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(child => patch(child, container));
}
function processComponent(vnode, container) {
    // TODO updateComponent
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const { proxy, props, emit } = instance;
    const subTree = instance.render.call(proxy, shallowReadonly(props), { emit });
    // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
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
// 给不同类型组件增加标识
function getShapeFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlot(slots, name, props = {}) {
    const slot = slots[name];
    if (slot) {
        const slotContent = slot(props);
        return createVNode('div', {}, slotContent);
    }
}

exports.createApp = createApp;
exports.h = h;
exports.renderSlot = renderSlot;
