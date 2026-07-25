export default async function (to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition
  }

  const findEl = (hash, x) => {
    return document.querySelector(`#${CSS.escape(hash)}`) ||
      new Promise((resolve, reject) => {
        if (x > 50) {
          return resolve()
        }
        setTimeout(() => { resolve(findEl(hash, ++x || 1)) }, 100)
      })
  }

  if (to.hash) {
    try {
      const el = await findEl(to.hash.replace('#', ''))

      el.classList.add('highlighted')

      if ('scrollBehavior' in document.documentElement.style) {
        return window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
      } else {
        return window.scrollTo(0, el.offsetTop)
      }
    } catch {
    //
    }
  }

  return { x: 0, y: 0 }
}
