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
    setElementText: hostSetElementText,
    remove: hostRemove
  } = options

  function render(vnode, container) {
    patch(null, vnode, container, null, null)
  }

  function patch(n1, n2, container, parentComponent, anchor) {
    
    switch(n2.type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break;
      case Text: 
        processText(n2, container)
        break
      default:
        if ( n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ) {
          processComponent(n1, n2, container, parentComponent, anchor)
        } else {
          if ( !n1 ) {
            processElement(n1, n2, container, parentComponent, anchor)
          } else {
            // 执行更新逻辑
            updateElement(n1, n2, container, parentComponent, anchor)
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

  function processElement(n1, n2: any, container: any, parentComponent,anchor) {
    mountElement(n1, n2, container, parentComponent, anchor)
  }

  function updateElement(n1, n2, container, parentComponent, anchor) {
    // 更新element
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    const el = n2.el = n1.el
    // 更新props
    patchProps(el, oldProps, newProps)

    // 更新children, 父级容器应该是el
    patchChildren(n1, n2, el, parentComponent, anchor)
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
    for (const key in oldProps) {
      if ( !(key in newProps) ) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
    let i = 0, e1 = c1.length - 1, e2 = c2.length - 1;

    // 是否是相同节点
    function isSameNodeType (n1, n2) {
      return n1.type === n2.type && n1.key === n2.key

    }

    // 左侧对比
    while ( i <= e1 && i <= e2 ) {
      if ( isSameNodeType(c1[i], c2[i]) ) {
        patch(c1[i], c2[i], container, parentComponent, anchor)
      } else {
        // 
        break
      }
      i++
    }

    // 右侧对比
    while ( i <= e1 && i <= e2 ) {
      if ( isSameNodeType(c1[e1], c2[e2]) ) {
        patch(c1[e1], c2[e2], container, parentComponent, anchor)
      } else {
        // 
        break
      }
      e1--
      e2--
    }

    // 新的比旧的长 需要创建
    if ( i > e1 && i <= e2 ) {
      // 如果在前面插入的话，当前api(appendChild)则无法满足需求了
      const anchorIndex = e2 + 1
      const anchor = anchorIndex < c2.length ? c2[anchorIndex].el : null 
      // insert有可能是多个
      // i = 0, e1 = -1, e2 = 1
      // i可能有多个 所以此时需要循环。
      while(i <= e2) {
        patch(null, c2[i], container, parentComponent, anchor)
        i++
      }
    } else if ( i > e2 && i <= e1 ) {
      // 新的比旧的短 需要删除
      while( i <= e1 ) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
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
    }
  }

  function mountElement(n1, n2: any, container: any, parentComponent, anchor) {
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
    hostInsert(el, container, anchor)
  }

  function unMountChildren(children, container) {
    children.forEach(child => hostRemove(child))
  }


  function mountChildren(children, container, parentComponent) {
    children.forEach(child => patch(null, child, container, parentComponent, null))
  }

  function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
    // TODO updateComponent
    mountComponent(n2, container, parentComponent, anchor)
  }

  function mountComponent(initialVNode: any, container: any, parentComponent, anchor) {
    const instance = createComponentInstance(initialVNode, parentComponent)
    setupComponent(instance)

    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  function setupRenderEffect(instance, initialVNode, container, anchor) {
    const { proxy, props, emit, slots } = instance
    effect(() => {
      if ( !instance.isMounted ) {
        // 初次加载 执行挂载逻辑
        const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots })
        // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
        patch(null, subTree, container, instance, null)
        initialVNode.el = subTree.el
        instance.subTree = subTree
        instance.isMounted = true
      } else {
        // 执行更新逻辑
        const subTree = instance.render.call(proxy, shallowReadonly(props), { emit, slots })
        // patch之后 subTree就会挂载上真实DOM,将真实DOM挂载到组件对象上, 在render函数中即可直接取到该对象
        // 原来的节点 跟现在的最新节点比较
        const prevSubTree = instance.subTree
        patch(prevSubTree, subTree, container, instance, anchor)
        instance.subTree = subTree
        initialVNode.el = subTree.el
      }
      
    })
  }


  return {
    createApp: createAppApi(render)
  }
}

function getSequence(arr: number[]): number[] {
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
        } else {
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

