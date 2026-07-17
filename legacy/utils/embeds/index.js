import * as youtube from './youtube'
import * as threespeak from './threespeak'
import * as dtube from './dtube'
import * as mixcloud from './mixcloud'
import * as soundcloud from './soundcloud'
import * as vimeo from './vimeo'

const supportedProviders = {
  youtube,
  threespeak,
  dtube,
  mixcloud,
  soundcloud,
  vimeo
}

const getProviderIds = () => {
  return Object.keys(supportedProviders)
}

const getProviderById = (id) => {
  return supportedProviders[id] || null
}

const callProviderMethod = (provider, methodName, ...parms) => {
  const method = provider[methodName] || null

  if (method && typeof method === 'function') {
    return method(...parms)
  }

  return false
}

const getProviderSandboxConfig = (provider) => {
  const sandboxConfig = provider.sandboxConfig || {}

  return sandboxConfig
}

const getIframeDimensions = (large) => {
  return {
    width: large ? '640' : '480',
    height: large ? '360' : '270'
  }
}

export const validateIframeUrl = (url, large = true, width = null, height = null) => {
  if (!url) {
    return {
      validUrl: false
    }
  }

  const supportedProviders = getProviderIds()

  for (let pi = 0; pi < supportedProviders.length; pi += 1) {
    const provider = getProviderById(supportedProviders[pi])

    const validUrl = callProviderMethod(provider, 'validateIframeUrl', url)

    let iframeDimensions

    iframeDimensions = callProviderMethod(provider, 'getIframeDimensions', large, url, width, height)

    if (!iframeDimensions) {
      iframeDimensions = getIframeDimensions(large)
    }

    if (validUrl !== false) {
      const sandboxConfig = getProviderSandboxConfig(provider)

      return {
        pi,
        sandboxAttributes: sandboxConfig.sandboxAttributes || [],
        useSandbox: sandboxConfig.useSandbox,
        width: iframeDimensions.width.toString(),
        height: iframeDimensions.height.toString(),
        validUrl
      }
    }
  }

  return {
    validUrl: false
  }
}

export function generateMd (section, idx, large, createElement) {
  let markdown = null
  const supportedProvidersIds = getProviderIds()
  const regexString = `^([A-Za-z0-9\\?\\=\\_\\-\\/\\.]+) (${supportedProvidersIds.join('|')})\\s?(.*?) ~~~`

  const regex = new RegExp(regexString)
  const match = section.match(regex)

  if (match && match.length >= 3) {
    const id = match[1]
    const type = match[2]
    const metadataString = match[3]
    let metadata
    if (!metadataString.includes('metadata:')) {
      metadata = match[3] ? parseInt(match[3]) : 0
    } else {
      metadata = metadataString.substring(9)
    }

    const provider = getProviderById(type)

    if (provider) {
      let iframeDimensions = callProviderMethod(provider, 'getIframeDimensionsFn', large)

      if (!iframeDimensions) {
        iframeDimensions = getIframeDimensions(large)
      }

      markdown = callProviderMethod(provider, 'genIframeMd',
        idx,
        id,
        iframeDimensions.width,
        iframeDimensions.height,
        metadata,
        createElement
      )
    } else {
      console.error('MarkdownViewer unknown embed type', type)
    }

    if (match[3]) {
      section = section.substring(
        `${id} ${type} ${metadataString} ~~~`.length
      )
    } else {
      section = section.substring(`${id} ${type} ~~~`.length)
    }

    return {
      section,
      markdown
    }
  }

  return null
}

export const EmbeddedPlayerEmbedNode = (child, links, images) => {
  const supportedProviders = getProviderIds()

  for (let pi = 0; pi < supportedProviders.length; pi += 1) {
    const provider = getProviderById(supportedProviders[pi])

    if (typeof provider.embedNode === 'function') {
      const newChild = provider.embedNode(child, links, images)

      if (newChild) {
        child = newChild
      }
    }
  }

  return child
}

export const preprocessHtml = (html) => {
  const supportedProviders = getProviderIds()

  for (let pi = 0; pi < supportedProviders.length; pi += 1) {
    const provider = getProviderById(supportedProviders[pi])

    if (typeof provider.preprocessHtml === 'function') {
      html = provider.preprocessHtml(html)
    }
  }

  return html
}
