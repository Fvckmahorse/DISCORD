import type { Session } from "next-auth";

/** E-mail do dono. Pode ser trocado pela env OWNER_EMAIL na Vercel;
 *  se não existir, usa este padrão. */
const OWNER = (process.env.OWNER_EMAIL || "paulosergioviegas06@gmail.com").toLowerCase();

export function isOwner(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  return !!email && email === OWNER;
}
