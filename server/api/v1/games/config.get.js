// GET /api/v1/games/config — public arcade tokenomics parameters (fee, pot
// account, free-entry allowance, payout shape). The client uses these to render
// the UI and build the entry transfer; the server stays the source of truth.
import { defineEventHandler } from 'h3'
import { arcadePublicConfig } from '../../../utils/arcade'

export default defineEventHandler(() => arcadePublicConfig())
