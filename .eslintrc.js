module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  extends: [
    '@nuxtjs',
    'plugin:nuxt/recommended'
  ],
  plugins: [
  ],
  rules: {
    'no-console': 0,
    'vue/no-v-html': 0
  },
  globals: {
    $nuxt: 'readonly'
  }
}
