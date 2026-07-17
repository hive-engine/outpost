// Convert an axios (or any) error into a plain, serializable Error.
// Raw axios errors carry deep native request/response objects; if one leaks into
// SSR-serialized state the payload breaks. Reduce to message + statusCode.
// (Same guard we ship in production on the Nuxt 2 build.)
export function cleanError (error) {
  const message =
    (error && error.response && error.response.data && error.response.data.message) ||
    (error && error.message) ||
    'Request failed'

  const err = new Error(message)

  err.statusCode = (error && error.response && error.response.status) || (error && error.code) || 500

  return err
}
