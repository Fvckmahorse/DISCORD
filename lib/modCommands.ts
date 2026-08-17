/* Definições (registro) dos slash commands de moderação/membros/info.
   default_member_permissions faz o Discord já esconder o comando de quem não tem a permissão. */
import { P } from "./perms";

const U = 6, ROLE = 8, CH = 7, STR = 3, INT = 4; // tipos de option
const perm = (bit: bigint) => bit.toString();

export const MOD_COMMANDS: any[] = [
  // ── canais ──
  { name: "lock", description: "Bloqueia o envio de mensagens no canal atual", default_member_permissions: perm(P.MANAGE_CHANNELS) },
  { name: "unlock", description: "Desbloqueia o canal atual", default_member_permissions: perm(P.MANAGE_CHANNELS) },
  { name: "slowmode", description: "Define o modo lento do canal (ex.: 5s, 1m, off)", default_member_permissions: perm(P.MANAGE_CHANNELS),
    options: [{ type: STR, name: "tempo", description: "5s, 30s, 1m, 10m, 1h ou off", required: true }] },
  { name: "clear", description: "Apaga as últimas mensagens do canal", default_member_permissions: perm(P.MANAGE_MESSAGES),
    options: [{ type: INT, name: "quantidade", description: "1 a 100", required: true, min_value: 1, max_value: 100 }] },
  { name: "purge", description: "Apaga mensagens de um usuário no canal", default_member_permissions: perm(P.MANAGE_MESSAGES),
    options: [{ type: U, name: "usuario", description: "De quem apagar", required: true },
              { type: INT, name: "quantidade", description: "Quantas verificar (padrão 50)", required: false, min_value: 1, max_value: 100 }] },
  { name: "hide", description: "Esconde o canal de @everyone", default_member_permissions: perm(P.MANAGE_CHANNELS) },
  { name: "unhide", description: "Mostra o canal para @everyone", default_member_permissions: perm(P.MANAGE_CHANNELS) },
  { name: "rename", description: "Renomeia o canal atual", default_member_permissions: perm(P.MANAGE_CHANNELS),
    options: [{ type: STR, name: "nome", description: "Novo nome", required: true }] },
  { name: "topic", description: "Altera o tópico do canal (vazio limpa)", default_member_permissions: perm(P.MANAGE_CHANNELS),
    options: [{ type: STR, name: "texto", description: "Novo tópico", required: false }] },
  { name: "lockdown", description: "Bloqueia todos os canais de uma categoria", default_member_permissions: perm(P.MANAGE_CHANNELS),
    options: [{ type: CH, name: "categoria", description: "A categoria", required: true, channel_types: [4] }] },
  { name: "unlockdown", description: "Desbloqueia os canais de uma categoria", default_member_permissions: perm(P.MANAGE_CHANNELS),
    options: [{ type: CH, name: "categoria", description: "A categoria", required: true, channel_types: [4] }] },

  // ── membros ──
  { name: "kick", description: "Expulsa um membro", default_member_permissions: perm(P.KICK_MEMBERS),
    options: [{ type: U, name: "membro", description: "Quem", required: true }, { type: STR, name: "motivo", description: "Motivo", required: false }] },
  { name: "ban", description: "Bane um membro", default_member_permissions: perm(P.BAN_MEMBERS),
    options: [{ type: U, name: "membro", description: "Quem", required: true }, { type: STR, name: "motivo", description: "Motivo", required: false }] },
  { name: "unban", description: "Remove o banimento (por ID)", default_member_permissions: perm(P.BAN_MEMBERS),
    options: [{ type: STR, name: "usuario", description: "ID do usuário", required: true }] },
  { name: "timeout", description: "Aplica timeout num membro", default_member_permissions: perm(P.MODERATE_MEMBERS),
    options: [{ type: U, name: "membro", description: "Quem", required: true }, { type: STR, name: "tempo", description: "10m, 1h, 1d", required: true }, { type: STR, name: "motivo", description: "Motivo", required: false }] },
  { name: "untimeout", description: "Remove o timeout de um membro", default_member_permissions: perm(P.MODERATE_MEMBERS),
    options: [{ type: U, name: "membro", description: "Quem", required: true }] },
  { name: "nick", description: "Altera o apelido de um membro (vazio remove)", default_member_permissions: perm(P.MANAGE_NICKNAMES),
    options: [{ type: U, name: "membro", description: "Quem", required: true }, { type: STR, name: "nome", description: "Novo apelido", required: false }] },
  { name: "role", description: "Adiciona/remove um cargo de um membro", default_member_permissions: perm(P.MANAGE_ROLES),
    options: [{ type: U, name: "membro", description: "Quem", required: true }, { type: ROLE, name: "cargo", description: "Cargo", required: true }] },

  // ── informações (todos podem) ──
  { name: "serverinfo", description: "Mostra informações do servidor" },
  { name: "userinfo", description: "Mostra informações de um membro", options: [{ type: U, name: "membro", description: "Quem (padrão você)", required: false }] },
  { name: "avatar", description: "Mostra o avatar de um membro", options: [{ type: U, name: "membro", description: "Quem (padrão você)", required: false }] },
  { name: "roles", description: "Lista os cargos do servidor" },
  { name: "channelinfo", description: "Mostra informações do canal atual" },
  { name: "botinfo", description: "Mostra informações do bot" },
  { name: "cmds", description: "Lista todos os comandos do bot" },
];
