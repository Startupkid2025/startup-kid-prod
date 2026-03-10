import { base44 } from '@/api/base44Client';

// SDK pass-through — mirrors Base44 compat layer behavior
export const deleteOldCoinLogs = base44.functions.deleteOldCoinLogs;
