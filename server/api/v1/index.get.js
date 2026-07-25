// GET /api/v1 — health check, ported from legacy app.get('/').
import { defineEventHandler } from 'h3'

export default defineEventHandler(() => ({ success: true }))
