import { kvGet, kvSet, kvDel, kvReady } from "./kv";

export type WelcomeConfig = {
  channelId: string;          // canal escolhido (vazio = desativado)
  title: string;              // título do embed
  message: string;            // corpo (usa {membro}, {servidor})
  color: string;              // hex sem #
  enabled: boolean;
};

const key = (guildId: string) => `welcome:${guildId}`;

export async function getWelcome(guildId: string): Promise<WelcomeConfig | null> {
  if (!kvReady()) return null;
  return kvGet<WelcomeConfig>(key(guildId));
}
export async function setWelcome(guildId: string, cfg: WelcomeConfig) {
  await kvSet(key(guildId), cfg);
}
export async function clearWelcome(guildId: string) {
  await kvDel(key(guildId));
}

/** Monta o payload do embed, substituindo as variáveis. */
export function buildWelcomeEmbed(cfg: WelcomeConfig, opts: { memberId?: string; memberName?: string; guildName?: string }) {
  const mention = opts.memberId ? `<@${opts.memberId}>` : (opts.memberName || "novo membro");
  const sub = (s: string) => (s || "")
    .replace(/\{membro\}/g, mention)
    .replace(/\{servidor\}/g, opts.guildName || "o servidor")
    .replace(/\{nome\}/g, opts.memberName || "novo membro");
  const color = parseInt((cfg.color || "7C6CFF").replace("#", ""), 16) || 0x7c6cff;
  return {
    embeds: [{
      title: sub(cfg.title || "Bem-vindo(a)! 🎉"),
      description: sub(cfg.message || "Olá {membro}, seja bem-vindo(a) a **{servidor}**!"),
      color,
    }],
    allowed_mentions: { parse: ["users"] },
  };
}
