import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

function client(url: string, key: string, schema: string): SupabaseClient<any, any, any, any, any> {
  return createClient(url, key, {
    db: { schema },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export let deliqDb = client(config.deliqUrl, config.deliqKey, 'deliq');
export let platformDb = client(config.platformUrl, config.platformKey, 'operations');
export let platformCommercialDb = client(config.platformUrl, config.platformKey, 'commercial');
export let platformCoreDb = client(config.platformUrl, config.platformKey, 'core');

export function overrideClients(clients: Partial<{
  deliqDb: SupabaseClient;
  platformDb: SupabaseClient;
  platformCommercialDb: SupabaseClient;
  platformCoreDb: SupabaseClient;
}>): void {
  if (clients.deliqDb) deliqDb = clients.deliqDb;
  if (clients.platformDb) platformDb = clients.platformDb;
  if (clients.platformCommercialDb) platformCommercialDb = clients.platformCommercialDb;
  if (clients.platformCoreDb) platformCoreDb = clients.platformCoreDb;
}

/*
 * These clients deliberately use service-role credentials and are never
 * imported by the frontend. The source platform is read-only from this API.
 */
export type DbClient = SupabaseClient;

export function assertQuery<T>(
  result: { data: T | null; error: { message: string } | null },
): NonNullable<T> {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === null) {
    throw new Error('Database returned no data');
  }
  return result.data as NonNullable<T>;
}
