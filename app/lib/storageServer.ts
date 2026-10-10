export type StorageEnv = { RCM_STORAGE_URL?: string; RCM_STORAGE_KEY?: string };
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function storageApi(request:Request, env:StorageEnv) {
  const configured = Boolean(env.RCM_STORAGE_URL && env.RCM_STORAGE_KEY && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.RCM_STORAGE_URL));
  if (request.method==="GET") return json({configured});
  if (request.method!=="POST") return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const origin=request.headers.get("Origin");
  if (origin!==new URL(request.url).origin || !request.headers.get("Content-Type")?.startsWith("application/json")) return json({ok:false,error:"REQUEST_NOT_ALLOWED"},403);
  if (!configured) return json({ok:false,error:"ONLINE_NOT_CONFIGURED"},503);
  const raw=await request.text();
  if (raw.length>750000) return json({ok:false,error:"REQUEST_TOO_LARGE"},413);
  let data:Record<string,unknown>;
  try { data=JSON.parse(raw); } catch { return json({ok:false,error:"INVALID_REQUEST"},400); }
  if (!data || typeof data!=="object" || Array.isArray(data) || typeof data.resume_code!=="string" || !/^[A-Za-z0-9_-]{32,160}$/.test(data.resume_code) || !["create_session","load_session","save_case"].includes(String(data.action))) return json({ok:false,error:"INVALID_REQUEST"},400);
  try {
    const response=await fetch(env.RCM_STORAGE_URL!,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,key:env.RCM_STORAGE_KEY}),signal:AbortSignal.timeout(25000)});
    if (!response.ok) return json({ok:false,error:"GOOGLE_CONNECTION_ERROR"},502);
    const result=await response.json();
    return json(result);
  } catch { return json({ok:false,error:"GOOGLE_CONNECTION_ERROR"},502); }
}
