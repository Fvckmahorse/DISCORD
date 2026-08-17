export const runtime = "nodejs";

/* Diagnóstico seguro: mostra SE cada variável existe e o tamanho dela,
   NUNCA o valor. Ajuda a achar variável faltando/vazia/errada. */
export async function GET() {
  const has = (v?: string) => !!(v && v.trim().length > 0);
  const len = (v?: string) => (v ? v.length : 0);
  const g = process.env.AUTH_GOOGLE_ID || "";
  return Response.json({
    AUTH_SECRET: { set: has(process.env.AUTH_SECRET), len: len(process.env.AUTH_SECRET) },
    AUTH_GOOGLE_ID: { set: has(process.env.AUTH_GOOGLE_ID), len: len(g), endsOk: g.endsWith(".apps.googleusercontent.com") },
    AUTH_GOOGLE_SECRET: { set: has(process.env.AUTH_GOOGLE_SECRET), len: len(process.env.AUTH_GOOGLE_SECRET) },
    AUTH_DISCORD_ID: { set: has(process.env.AUTH_DISCORD_ID), len: len(process.env.AUTH_DISCORD_ID) },
    AUTH_DISCORD_SECRET: { set: has(process.env.AUTH_DISCORD_SECRET), len: len(process.env.AUTH_DISCORD_SECRET) },
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    AUTH_URL: process.env.AUTH_URL || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    // extras (não sensíveis)
    NEXT_PUBLIC_DISCORD_CLIENT_ID: { set: has(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) },
    DISCORD_BOT_TOKEN: { set: has(process.env.DISCORD_BOT_TOKEN) },
    DISCORD_PUBLIC_KEY: { set: has(process.env.DISCORD_PUBLIC_KEY) },
    GEMINI_API_KEY: { set: has(process.env.GEMINI_API_KEY) },
  });
}
