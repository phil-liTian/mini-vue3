import { defineConfig } from 'vitest/config'
import path from 'path'

console.log('as------------');

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /@mini-vue\/([\w-]*)/,
        replacement: path.resolve(__dirname, "packages") + "/$1/src"
      }
    ]
  }
})

