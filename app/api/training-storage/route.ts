import { storageApi } from "../../lib/storageServer";

// Vercel serves the Lab without the Cloudflare worker, so the Google Sheets
// proxy also lives here. RCM_STORAGE_URL / RCM_STORAGE_KEY are server-only env vars.
export const dynamic = "force-dynamic";
const env = () => ({ RCM_STORAGE_URL: process.env.RCM_STORAGE_URL?.trim(), RCM_STORAGE_KEY: process.env.RCM_STORAGE_KEY?.trim() });
export function GET(request: Request) { return storageApi(request, env()); }
export function POST(request: Request) { return storageApi(request, env()); }
