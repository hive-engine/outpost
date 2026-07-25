// POST /api/v1/csp-violation — CSP report logging, ported from legacy.
import { defineEventHandler, readBody, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  let report

  try {
    const body = await readBody(event)
    report = body && body['csp-report']
  } catch {
    //
  }

  if (report) {
    try {
      const value = `${report['document-uri']} :: ${report['blocked-uri']}`

      console.log(`CSP Violation: ${value} UA: ${getHeader(event, 'user-agent')}`)
    } catch {
      //
    }
  }

  return ''
})
