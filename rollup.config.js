
import typescript from '@rollup/plugin-typescript';
export default {
  input: './packages/index.ts',
  output: [
    {
      format: 'es',
      file: 'lib/mini-vue.esm.js'
    },
    {
      format: 'cjs',
      file: 'lib/mini-vue.cjs.js'
    }
  ],
  plugins: [typescript()],
  onwarn: (msg, warn) => {
    if ( !/Circular/.test(msg) ) {
      warn(msg)
    }
  }
}