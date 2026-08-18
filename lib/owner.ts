import type { Session } from "next-auth";

/** Donos por e-mail (Google) OU por ID do Discord.
 *  Pode sobrescrever via env OWNER_EMAIL / OWNER_DISCORD_ID (separados por vírgula). */
const OWNER_EMAILS = (process.env.OWNER_EMAIL || "paulosergioviegas06@gmail.com")
  .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
const OWNER_DISCORD_IDS = (process.env.OWNER_DISCORD_ID || "936468622962982984")
  .split(",").map(s => s.trim()).filter(Boolean);

export function isOwner(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (email && OWNER_EMAILS.includes(email)) return true;
  const discordId = (session as any)?.discordUser?.id as string | undefined;
  if (discordId && OWNER_DISCORD_IDS.includes(discordId)) return true;
  return false;
}
