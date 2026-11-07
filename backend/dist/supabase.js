import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
function client(url, key, schema) {
    return createClient(url, key, {
        db: { schema },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
export const deliqDb = client(config.deliqUrl, config.deliqKey, "deliq");
export const platformDb = client(config.platformUrl, config.platformKey, "operations");
export const platformCommercialDb = client(config.platformUrl, config.platformKey, "commercial");
export const platformCoreDb = client(config.platformUrl, config.platformKey, "core");
export function assertQuery(result) {
    if (result.error) {
        throw new Error(result.error.message);
    }
    if (result.data === null) {
        throw new Error("Database returned no data");
    }
    return result.data;
}
