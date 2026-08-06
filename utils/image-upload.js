// Client-side image preparation for the Hive image server (images.hive.blog).
//
// Phone photos are often several MB and sometimes HEIC. Uploading them as-is
// fails two ways: (1) the signing buffer is the whole image, so a multi-MB photo
// becomes a huge message that Keychain can choke on, and (2) the image server
// rejects oversized files. Downscaling to a sane max dimension + JPEG re-encode
// fixes both and matches what PeakD/Ecency do. Small, already-web-sized images
// are left untouched so the previously-working path is unchanged.

const MAX_DIM = 1920 // longest edge after downscale
const SKIP_UNDER_BYTES = 1.6 * 1024 * 1024 // leave small images alone
const JPEG_QUALITY = 0.85

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('Could not read the file.'))
  reader.readAsDataURL(file)
})

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('decode-failed'))
  img.src = src
})

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(blob => resolve(blob), type, quality)
})

// Returns { dataUrl, blob, name } for an upload-ready JPEG, or null to signal
// "use the original file unchanged" (non-raster, animated GIF, or already small).
// Throws with a user-facing message when a format genuinely can't be handled
// (e.g. HEIC on a browser that can't decode it) so the caller can report it.
export async function maybeDownscaleImage (file) {
  if (typeof document === 'undefined') { return null }
  const type = file?.type || ''
  if (!type.startsWith('image/') || type === 'image/gif') { return null }
  if (typeof file.size === 'number' && file.size <= SKIP_UNDER_BYTES) { return null }

  const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '')

  let img
  try {
    img = await loadImage(await readAsDataUrl(file))
  } catch {
    if (isHeic) {
      throw new Error('HEIC photos aren’t supported here. In your iPhone camera settings choose “Most Compatible”, or share the photo as JPEG.')
    }
    // Can't decode for some other reason — let the caller try the original bytes.
    return null
  }

  const longest = Math.max(img.width, img.height)
  const scale = Math.min(1, MAX_DIM / longest)
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
  if (!blob) { return null }

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg'

  return { dataUrl, blob, name }
}
