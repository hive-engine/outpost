// FontAwesome — replaces @nuxtjs/fontawesome (no Nuxt 3 build).
// Registers the same icon set as the legacy nuxt.config and exposes the
// component under the same name the templates already use: <fa-icon />.
import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faUsers, faLink, faMapMarkedAlt, faCheck, faArrowRight, faPlus, faHeart,
  faHeartBroken, faTimes, faUndo, faRedo, faPencilAlt, faCircleNotch,
  faSortAmountDown, faCommentAlt, faRetweet, faRedoAlt, faEllipsisH, faAngleUp,
  faAngleDown, faAngleRight, faAngleLeft, faVideo, faMusic, faTags, faList,
  faShoppingCart, faCartPlus, faCartArrowDown, faChevronUp, faChevronDown,
  faShoppingBasket, faExclamationCircle, faSync, faPercent, faLongArrowAltUp,
  faLongArrowAltDown, faInfoCircle, faBars, faExternalLinkAlt, faEye, faReply,
  faImage, faBolt, faFire, faArrowUp, faThumbsDown, faPlay, faFilm, faBell, faAt,
  faBookmark, faSearch
} from '@fortawesome/free-solid-svg-icons'
import {
  faMoon, faSun, faTimesCircle, faComments, faCommentAlt as farCommentAlt,
  faBookmark as farBookmark, faHeart as farHeart, faThumbsDown as farThumbsDown
} from '@fortawesome/free-regular-svg-icons'

export default defineNuxtPlugin((nuxtApp) => {
  // CSS is injected via app.scss; avoid double-injection flicker
  config.autoAddCss = false

  library.add(
    faUsers, faLink, faMapMarkedAlt, faCheck, faArrowRight, faPlus, faHeart,
    faHeartBroken, faTimes, faUndo, faRedo, faPencilAlt, faCircleNotch,
    faSortAmountDown, faCommentAlt, faRetweet, faRedoAlt, faEllipsisH, faAngleUp,
    faAngleDown, faAngleRight, faAngleLeft, faVideo, faMusic, faTags, faList,
    faShoppingCart, faCartPlus, faCartArrowDown, faChevronUp, faChevronDown,
    faShoppingBasket, faExclamationCircle, faSync, faPercent, faLongArrowAltUp,
    faLongArrowAltDown, faInfoCircle, faBars, faExternalLinkAlt, faEye, faReply,
    faImage, faBolt, faFire, faArrowUp, faThumbsDown, faPlay, faFilm, faBell, faAt,
    faBookmark, faSearch,
    faMoon, faSun, faTimesCircle, faComments, farCommentAlt, farBookmark, farHeart, farThumbsDown
  )

  nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
})
