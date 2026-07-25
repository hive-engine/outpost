// Shared "is the Hive network reachable?" flag. Tripped when critical SSR data
// can't be fetched because the Hive RPC / SCOT nodes are unreachable, so the UI
// can show a clear "it's the Hive network, not us" banner instead of silently
// rendering empty. Survives SSR→client via useState.
export const useHiveStatus = () => useState('hive-network-down', () => false)
