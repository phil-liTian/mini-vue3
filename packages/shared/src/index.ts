export * from './shapeFlags'

export const extend = Object.assign

export const isObject = value => value !== null && typeof value === 'object'

export const hasChanged = (val, newVal) => !Object.is(val, newVal);

export const hasOwn = (key, obj) => Object.prototype.hasOwnProperty.call(obj, key)

// 首字母换成大写
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

// 将 kebab-case风格命名的事件名转换成驼峰命名
const camelize = (str: string) => str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')

// 转换成事件明
export const toHandleKey = (str: string) => str ? camelize(`on${capitalize(str)}`) : ''
