const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvReady(): boolean { return !!(URL && TOKEN); }

async function redis(cmd: any[]): Promise<any> {
  if (!kvReady()) throw new Error("Banco (KV) não configurado.");
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}

export async function kvSet(k: string, v: any) { return redis(["SET", k, JSON.stringify(v)]); }
export async function kvGet<T = any>(k: string): Promise<T | null> { const r = await redis(["GET", k]); return r ? JSON.parse(r) : null; }
export async function kvDel(k: string) { return redis(["DEL", k]); }
export async function kvSAdd(k: string, m: string) { return redis(["SADD", k, m]); }
export async function kvSRem(k: string, m: string) { return redis(["SREM", k, m]); }
export async function kvSMembers(k: string): Promise<string[]> { return (await redis(["SMEMBERS", k])) || []; }
