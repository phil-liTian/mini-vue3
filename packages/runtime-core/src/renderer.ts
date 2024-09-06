import { isObject } from "@mini-vue/shared"
import { ShapeFlags } from "@mini-vue/shared"
import { createComponentInstance, setupComponent } from "./components"
import { shallowReadonly, effect } from "@mini-vue/reactivity"
import { Fragment, Text } from "./vnode"
import { createAppApi } from "./createApp"


export function createRenderer(options) {

  const { 
    createElement: hostCreateElement,
    insert: hostInsert,
    patchProp: hostPatchProp,
    setElementText: hostSetElementText
  } = options

  function render(vnode, container) {
    patch(null, vnode, container, null)
  }

  function patch(n1, n2, container, parentComponent) {
    
    switch(n2.type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break;
      case Text: 
        processText(n2, container)
        break
      default:
        if ( n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ) {
          processComponent(n1, n2, container, parentComponent)
        } else {
          if ( !n1 ) {
            processElement(n1, n2, container, parentComponent)
          } else {
            // 执行更新逻辑
            updateElement(n1, n2, container, parentComponent)
          }
        }
    }
  }

  function processFragment(n1, n2, container, parentComponent) {
    const { children } = n2
    
    mountChildren(children, container, parentComponent)
  }

  function processText(n2, container) {
    const textNode = document.createTextNode(n2.children)
    container.appendChild(textNode)
  }

  function processElement(n1, n2: any, container: any, parentComponent) {
    mountElement(n1, n2, container, parentComponent)
  }

  function updateElement(n1, n2, container, parentComponent) {
    console.log('n1', n1);
    
    // 更新element
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    const el = n2.el = n1.el
    console.log('n1', n1, n2);
    console.log('oldProps-->', oldProps, newProps);
    // 更新props
    patchProps(el, oldProps, newProps)

    // 更新children
    // patchChildren(n1, n2, container, parentComponent)
  }

  function patchProps(el, oldProps, newProps) {
    // 处理属性(更新属性)
    // 新增，删除、设置成undefined则是删除
    for (const key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]
      if ( prevProp !== nextProp ) {
        hostPatchProp(el, key, prevProp, nextProp)
      }
    }

    // oldProps中存在 在newProps中不存在则移除
    console.log('oldProps', oldProps);
    
    for (const key in oldProps) {
      console.log('key', key);
      
      if ( !(key in newProps) ) {
        console.log('key', key);
        
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  function patchChildren(n1, n2, container, parentComponent) {
    // TODO
    const { children: c1, shapeFlag: prevShapeFlag } = n1
    const { children: c2, shapeFlag } = n2
    if ( shapeFlag & ShapeFlags.TEXT_CHILDREN ) {
      if ( prevShapeFlag & ShapeFlags.ARRAY_CHILDREN  ) {
        unMountChildren(c1, container)
      }

      if ( c1 !== c2 ) {
        // 更新elementText
        hostSetElementText(container, c2)
      }

    } else {
      if ( prevShapeFlag & ShapeFlags.TEXT_CHILDREN ) {
        hostSetElementText(container, '')
        mountChildren(c2, container, parentComponent)
      } else {
        // TODO: ArrayToArray
        patchKeyedChildren(c1, c2, container, parentComponent)
      }
    }
  }

  // dom diff
  function patchKeyedChildren(c1, c2, container, parentComponent) {

  }

  function mountElement(n1, n2: any, container: any, parentComponent) {
    const { type, props, children } = n2
    const el = n2.el = hostCreateElement(type)
    
    for (const key in props) {
      // const isOn = key => /^on[A-Z]/.test(key)
      // if ( isOn(key) ) {
      //   const eventName = key.slice(2).toLowerCase()
      //   el.addEventListener(eventName, props[key])
      // }

      // el.setAttribute(key, props[key])
      hostPatchProp(el, key, null, props[key])
    }

    if ( n2.shapeFlag & ShapeFlags.ARRAY_CHILDREN ) {
      mountChildren(n2.children, el, parentComponent)
    } else if ( n2.shapeFlag & ShapeFlags.TEXT_CHILDREN ) {
      el.textContent = children
    }

    // container.appendChild(el)
    hostInsert(el, container)
  }

  function unMountChildren(children, container) {
    // children.forEach(child => )
  }


  function mountChildren(children, container, parentComponent) {
    children.forEach(child => patch(null, child, container, parentComponent))
  }

  function processComponent(n1, n2: any, container: any, parentComponent) {
    // TODO updateComponent
    mountComponent(n2, container, parentComponent)
  }

  function mountComponent(initialVNode: any, container: any, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent)
    setupComponent(instance)

    setupRenderEffect(instance, initialVNode, container)
  }

  function setupRenderEffect(instance, initialVNode, container) {
    const { proxy, props, emit, slots } = instance
    effect(() => {
      if ( !instance.isMounted ) {
        // 初次加载 执行挂载逻辑
        const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots })
        // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
        patch(null, subTree, container, instance)
        initialVNode.el = subTree.el
        instance.subTree = subTree
        instance.isMounted = true
      } else {
        console.log('update');
        
        // 执行更新逻辑
        const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots })
        // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
        // 原来的节点 跟现在的最新节点比较
        const prevSubTree = instance.subTree
        patch(prevSubTree, subTree, container, instance)
        instance.subTree = subTree
        initialVNode.el = subTree.el
      }
      
    })
  }


  return {
    createApp: createAppApi(render)
  }
}


