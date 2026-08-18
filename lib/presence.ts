import { kvGet, kvSet, kvReady } from "./kv";

export type Presence = {
  status: "online" | "idle" | "dnd" | "invisible";
  activityType: "playing" | "listening" | "watching" | "competing";
  activityText: string;
};
const KEY = "bot:presence";
const DEFAULT: Presence = { status: "online", activityType: "watching", activityText: "o servidor | /cmds" };

export async function getPresence(): Promise<Presence> {
  if (!kvReady()) return DEFAULT;
  return (await kvGet<Presence>(KEY)) || DEFAULT;
}
export async function setPresence(p: Presence) { await kvSet(KEY, p); }
