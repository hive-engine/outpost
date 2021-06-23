<script>
import { Remarkable } from 'remarkable'
import sanitize from 'sanitize-html'
import HtmlReady from '@/utils/HtmlReady'
import sanitizeConfig from '@/utils/sanitize-config'
import { generateMd as EmbeddedPlayerGenerateMd } from '@/utils/embeds'

const remarkable = new Remarkable({
  html: true,
  breaks: true,
  typographer: false,
  quotes: '“”‘’'
})

const remarkableToSpec = new Remarkable({
  html: true,
  breaks: false,
  typographer: false,
  quotes: '“”‘’'
})

export default {
  name: 'MarkdownViwer',

  props: {
    className: { type: String, default: 'markdown-viewer' },
    text: { type: String, default: '' },
    large: { type: Boolean, default: true },
    highQualityPost: { type: Boolean, default: true },
    noImage: { type: Boolean },
    hideImages: { type: Boolean, default: false },
    breaks: { type: Boolean, default: true }
  },

  render (h) {
    let { text } = this

    let html = false

    const m = text.match(/^<html>([\S\s]*)<\/html>$/)

    if (m && m.length === 2) {
      html = true
      text = m[1]
    } else {
      html = /^<p>[\S\s]*<\/p>/.test(text)
    }

    text = text.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)')

    let renderer = remarkableToSpec
    if (this.breaks === true) {
      renderer = remarkable
    }

    let renderedText = html ? text : renderer.render(text)

    // If content isn't wrapped with an html element at this point, add it.
    if (!renderedText.indexOf('<html>') !== 0) {
      renderedText = '<html>' + renderedText + '</html>'
    }

    if (renderedText) {
      renderedText = HtmlReady(renderedText, { hideImages: this.hideImages }).html
    }

    let cleanText = renderedText

    try {
      cleanText = sanitize(
        renderedText,
        sanitizeConfig({
          large: this.large,
          highQualityPost: this.highQualityPost,
          noImage: this.noImage && this.allowNoImage
        })
      )
    } catch (e) {
      cleanText = ''
      console.error(e)
    }

    let idx = 0
    const sections = []

    function checksum (s) {
      let chk = 0x12345678
      const len = s.length
      for (let i = 0; i < len; i += 1) {
        chk += s.charCodeAt(i) * (i + 1)
      }

      return (chk & 0xFFFFFFFF).toString(16)
    }

    // HtmlReady inserts ~~~ embed:${id} type ~~~
    for (let section of cleanText.split('~~~ embed:')) {
      const embedMd = EmbeddedPlayerGenerateMd(section, idx, this.large, h)

      if (embedMd) {
        const { section: newSection, markdown } = embedMd
        section = newSection

        sections.push(h('div', { key: `embed-${idx}`, class: 'embed-responsive embed-responsive-16by9' }, [markdown]))

        if (section === '') {
          continue
        }
      }

      sections.push(h('div', { key: checksum(section), domProps: { innerHTML: section } }))

      idx += 1
    }

    return h('div', { class: 'markdown-view' }, sections)
  }
}
</script>

<style>

</style>
