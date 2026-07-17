export const getEstimatedVoteValue = ({ currentRshares, userData, vp, weight, tribeConfig, tribeInfo }) => {
  const rshares = (userData.staked_tokens * Math.min(weight, 100) * vp) / (10000 * 100)

  const authorCurve = tribeConfig.author_curve_exponent
  const rewardPool = tribeInfo.reward_pool
  const pendingClaims = tribeInfo.pending_rshares

  const applyCurve = (rshares) => {
    return ((Number(rshares) ** authorCurve) * rewardPool) / pendingClaims
  }

  const value = applyCurve(parseFloat(currentRshares) + Math.abs(rshares)) - applyCurve(parseFloat(currentRshares))

  return value.toFixed(tribeInfo.precision)
}
