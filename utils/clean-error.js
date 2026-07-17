// Convert an axios (or any) error into a plain, serializable Error.
//
// A raw axios error carries circular request/response objects (ClientRequest,
// transformRequest, httpAdapter, ...). If such an error propagates uncaught out of
// asyncData/fetch during SSR, Nuxt serializes it into window.__NUXT__.error and
// @nuxt/devalue throws "Maximum call stack size exceeded", shipping a broken payload
// so the page never hydrates (visible but non-interactive: can't log in/upvote/comment).
// Reducing every error to message + statusCode keeps serialization safe.
export function cleanError (error) {
  const message =
    (error && error.response && error.response.data && error.response.data.message) ||
    (error && error.message) ||
    'Request failed'

  const err = new Error(message)

  err.statusCode = (error && error.response && error.response.status) || (error && error.code) || 500

  return err
}
