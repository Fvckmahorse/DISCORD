import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";

/**
 * Login com Google (identidade) + conexão do Discord (identify + guilds).
 * Estratégia JWT (sem banco): quando o usuário conecta o Discord, guardamos
 * o access_token do Discord DENTRO do token que já existe (o Google continua).
 *
 * Obs.: para "account linking" 100% robusto em produção, o ideal é um adapter
 * de banco (Prisma/Drizzle). Para o MVP, esta abordagem cobre o fluxo pedido.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: true,
  providers: [
    Google,
    Discord({
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+guilds",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        token.name = token.name ?? (profile as any)?.name;
        token.email = token.email ?? (profile as any)?.email;
        token.picture = token.picture ?? (profile as any)?.picture;
      }
      if (account?.provider === "discord") {
        token.discordConnected = true;
        token.discordAccessToken = account.access_token;
        token.discordUser = {
          id: (profile as any)?.id,
          username: (profile as any)?.username,
          global_name: (profile as any)?.global_name,
          avatar: (profile as any)?.avatar,
        };
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).discordConnected = !!token.discordConnected;
      (session as any).discordAccessToken = token.discordAccessToken;
      (session as any).discordUser = token.discordUser;
      return session;
    },
  },
  pages: {},
});
