import Vue from 'vue'

export default (ctx, inject) => {
  const bus = new Vue()
  inject('eventBus', bus)
}
