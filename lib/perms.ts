export const P: Record<string, bigint> = {
  KICK_MEMBERS: 1n<<1n, BAN_MEMBERS: 1n<<2n, ADMINISTRATOR: 1n<<3n, MANAGE_CHANNELS: 1n<<4n,
  MANAGE_GUILD: 1n<<5n, VIEW_CHANNEL: 1n<<10n, SEND_MESSAGES: 1n<<11n, MANAGE_MESSAGES: 1n<<13n,
  MANAGE_NICKNAMES: 1n<<27n, MANAGE_ROLES: 1n<<28n, MODERATE_MEMBERS: 1n<<40n,
  CREATE_PUBLIC_THREADS: 1n<<35n,
};
export function memberHas(permStr: string, bit: bigint): boolean {
  const v = BigInt(permStr || "0");
  return (v & P.ADMINISTRATOR) === P.ADMINISTRATOR || (v & bit) === bit;
}
