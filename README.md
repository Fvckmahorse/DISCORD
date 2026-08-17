# Zoiudo AI — construtor de servidor do Discord

Descreva seu servidor em português e a IA monta a estrutura (categorias, canais,
cargos e permissões). Você aplica com um clique.

- **Fase 1** — o "cérebro" (texto → estrutura → prévia). *(protótipo HTML separado)*
- **Fase 2 (este projeto)** — login com Google + conexão do Discord + listar seus
  servidores + adicionar o bot.
- **Fase 3 (próxima)** — o bot cria a estrutura de verdade, com confirmação.

---

## Como rodar

### 0) Pré-requisitos
- Node.js 18+ instalado.

### 1) Instalar
```bash
npm install
```

### 2) Criar as credenciais (suas contas)

> Regra de ouro: **ID** pode ser público. **Secret** e **Token** NUNCA vão para
> chat, código ou GitHub — só entram no arquivo `.env.local` (local) e nas
> Environment Variables da Vercel (produção).

**a) Google (login):**
1. https://console.cloud.google.com → crie um projeto.
2. "APIs e serviços" → "Tela de permissão OAuth" (tipo: Externo).
3. "Credenciais" → "Criar credenciais" → "ID do cliente OAuth" → tipo "App da Web".
4. Em *Authorized redirect URIs* adicione:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://SEU-APP.vercel.app/api/auth/callback/google`
5. Copie o **Client ID** → `AUTH_GOOGLE_ID` e o **Client Secret** → `AUTH_GOOGLE_SECRET`.

**b) Discord (login + bot):**
1. https://discord.com/developers/applications → "New Application".
2. Aba **OAuth2**: copie o **Client ID** → `AUTH_DISCORD_ID` e `NEXT_PUBLIC_DISCORD_CLIENT_ID`;
   e o **Client Secret** → `AUTH_DISCORD_SECRET`.
   Em *Redirects* adicione:
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://SEU-APP.vercel.app/api/auth/callback/discord`
3. Aba **Bot**: crie o bot, clique em *Reset Token* e copie → `DISCORD_BOT_TOKEN`.

**c) Segredo do Auth.js:**
```bash
npx auth secret      # copia o valor para AUTH_SECRET
```

### 3) Configurar variáveis
Copie `.env.example` para `.env.local` e preencha os valores.

### 4) Rodar local
```bash
npm run dev
# abre http://localhost:3000
```

### 5) Publicar na Vercel (grátis)
1. Suba o projeto num repositório no GitHub.
2. https://vercel.com → "Add New… → Project" → importe o repositório.
3. Em *Settings → Environment Variables*, cole as MESMAS variáveis do `.env.example`
   (com os valores reais). Ajuste `NEXTAUTH_URL` para a URL da Vercel.
4. Deploy. Depois, volte no Google e no Discord e confirme que os *redirect URIs*
   com a URL final `https://SEU-APP.vercel.app/...` estão cadastrados.

---

## O que já funciona nesta fase
- Entrar com Google.
- Conectar o Discord (escopos mínimos: `identify`, `guilds`).
- Listar apenas os servidores onde você é **dono** ou tem **Gerenciar Servidor**.
- Botão "Adicionar bot" (abre a tela oficial do Discord).

## O que NÃO faz ainda (Fase 3)
- Criar categorias/canais/cargos de verdade. Isso vem a seguir, com a prévia da
  Fase 1 + confirmação antes de aplicar.

## Segurança
- Segredos só no backend (nunca no navegador).
- O bot pede o mínimo de permissões (Gerenciar Canais/Cargos, Ver Canais, Enviar).
- OAuth2 oficial — o site nunca age "como sua conta pessoal" (isso é proibido pelo
  Discord); quem executa é o bot.
