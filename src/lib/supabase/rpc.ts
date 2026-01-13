import { supabase } from '@/integrations/supabase/client';
import type { DebugFlags } from '@/lib/debugFlags';
import { getDebugFlags } from '@/lib/debugFlags';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function supabaseRpc<TData = any>(
  fn: string,
  args: Record<string, any> | undefined,
  opts?: { debugFlags?: DebugFlags }
): Promise<{ data: TData | null; error: any | null }> {
  const flags = opts?.debugFlags ?? getDebugFlags();

  if (import.meta.env.DEV && flags?.forceLatencyMs && flags.forceLatencyMs > 0) {
    await sleep(flags.forceLatencyMs);
  }

  if (import.meta.env.DEV && flags?.forceError) {
    return {
      data: null,
      error: {
        message: '[DEV] Forced server error',
        code: 'DEV_FORCE_ERROR',
        details: 'Disabled in production builds.',
      },
    };
  }

  if (import.meta.env.DEV && flags?.forceConflict && fn === 'batch_upsert_cost_items') {
    const items = Array.isArray((args as any)?.p_items) ? (args as any).p_items : [];
    const now = new Date().toISOString();
    return {
      data: (items.map((it: any) => ({
        id: it?.id,
        success: false,
        error: 'CONFLICT',
        server_updated_at: now,
      })) as any) as TData,
      error: null,
    };
  }

  return await (supabase as any).rpc(fn, args);
}


