import { base44 } from '@/api/base44Client';

// SDK pass-through — mirrors Base44 compat layer behavior
export const InvokeLLM = base44.integrations.Core?.InvokeLLM;
