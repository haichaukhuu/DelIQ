import 'dotenv/config';
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export const config = {
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    deliqUrl: required('DELIQ_SUPABASE_URL'),
    deliqKey: required('DELIQ_SUPABASE_SECRET_KEY'),
    platformUrl: required('PLATFORM_SUPABASE_URL'),
    platformKey: required('PLATFORM_SUPABASE_SECRET_KEY'),
};
