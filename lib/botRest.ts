const API = "https://discord.com/api/v10";
export async function bot(path: string, method: string = "GET", body?: any): Promise<any> {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error((data as any)?.message || `HTTP ${res.status}`); e.status = res.status; e.data = data; throw e; }
  return data;
}
export function snowflakeDate(id: string): Date {
  return new Date(Number(BigInt(id) >> 22n) + 1420070400000);
}
