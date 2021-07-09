export const getEstimatedVoteValue = ({ userData, vp, weight, tribeConfig, tribeInfo }) => {
  const rshares = (userData.staked_tokens * 10 ** tribeInfo.precision * Math.min(weight, 10000) * vp) / (10000 * 100)

  const value = ((Math.max(0, rshares) ** tribeConfig.author_curve_exponent) * tribeInfo.reward_pool) / tribeInfo.pending_rshares

  return (value / (10 ** tribeInfo.precision)).toFixed(tribeInfo.precision)
}
