# Guia de Deploy - APEX Performance Management System

Este guia descreve como fazer o deploy do sistema APEX em produção usando:
- **Backend**: Railway
- **Frontend**: Vercel
- **Database**: Supabase (PostgreSQL)

---

## 1. Preparação Inicial

### 1.1 Clonar o Repositório
```bash
git clone <seu-repositorio-url>
cd apex_performance_system
```

### 1.2 Instalar Dependências Localmente
```bash
pnpm install
```

---

## 2. Configurar Supabase (PostgreSQL)

### 2.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova organização e projeto
3. Anote a **Connection String** (DATABASE_URL)

### 2.2 Executar Migrações
```bash
# Configure a variável de ambiente localmente
export DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Execute as migrações
pnpm db:push
```

### 2.3 Variáveis de Ambiente do Supabase
Copie estas informações do painel do Supabase:
- `DATABASE_URL`: Connection string PostgreSQL
- `JWT_SECRET`: Gere uma chave segura (use `openssl rand -base64 32`)

---

## 3. Deploy do Backend no Railway

### 3.1 Criar Conta no Railway
1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub

### 3.2 Conectar Repositório
1. Clique em "New Project"
2. Selecione "Deploy from GitHub"
3. Conecte seu repositório

### 3.3 Configurar Variáveis de Ambiente
No painel do Railway, adicione as seguintes variáveis:

```
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
JWT_SECRET=sua-chave-secreta-aqui
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=seu-owner-id
OWNER_NAME=Seu Nome
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-chave-api
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua-chave-frontend
VITE_APP_TITLE=APEX Performance Management
VITE_APP_LOGO=https://seu-logo-url.com/logo.png
NODE_ENV=production
```

### 3.4 Deploy Automático
O Railway fará deploy automático a cada push para a branch principal.

---

## 4. Deploy do Frontend no Vercel

### 4.1 Criar Conta no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub

### 4.2 Importar Projeto
1. Clique em "New Project"
2. Selecione seu repositório
3. Configure o framework como "Vite"

### 4.3 Configurar Variáveis de Ambiente
No painel do Vercel, adicione:

```
VITE_APP_ID=seu-app-id
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua-chave-frontend
VITE_APP_TITLE=APEX Performance Management
VITE_APP_LOGO=https://seu-logo-url.com/logo.png
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=seu-website-id
```

### 4.4 Configurar Build
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install --frozen-lockfile`

### 4.5 Deploy
Clique em "Deploy" - o Vercel fará deploy automático.

---

## 5. Conectar Backend e Frontend

### 5.1 Configurar CORS no Backend (Railway)
Adicione a URL do Vercel ao CORS no arquivo `server/_core/index.ts`:

```typescript
const allowedOrigins = [
  'https://seu-dominio-vercel.vercel.app',
  'https://seu-dominio-customizado.com'
];
```

### 5.2 Configurar URL da API no Frontend
No arquivo `client/src/lib/trpc.ts`, configure a URL do Railway:

```typescript
const apiUrl = process.env.NODE_ENV === 'production' 
  ? 'https://seu-backend-railway.railway.app/api/trpc'
  : 'http://localhost:3000/api/trpc';
```

---

## 6. Domínios Customizados

### 6.1 Railway (Backend)
1. No painel do Railway, vá para "Settings"
2. Clique em "Custom Domain"
3. Adicione seu domínio (ex: `api.apex.com`)
4. Configure os registros DNS conforme indicado

### 6.2 Vercel (Frontend)
1. No painel do Vercel, vá para "Settings" > "Domains"
2. Adicione seu domínio (ex: `apex.com`)
3. Configure os registros DNS conforme indicado

---

## 7. Variáveis de Ambiente Necessárias

### Backend (Railway)
```
DATABASE_URL              # PostgreSQL do Supabase
JWT_SECRET               # Chave para assinar JWTs
VITE_APP_ID              # ID da aplicação
OAUTH_SERVER_URL         # URL do servidor OAuth
OWNER_OPEN_ID            # ID do proprietário
OWNER_NAME               # Nome do proprietário
BUILT_IN_FORGE_API_URL   # URL da API Forge
BUILT_IN_FORGE_API_KEY   # Chave da API Forge
NODE_ENV                 # production
```

### Frontend (Vercel)
```
VITE_APP_ID                      # ID da aplicação
VITE_OAUTH_PORTAL_URL            # URL do portal OAuth
VITE_FRONTEND_FORGE_API_URL      # URL da API Forge
VITE_FRONTEND_FORGE_API_KEY      # Chave da API Forge
VITE_APP_TITLE                   # Título da aplicação
VITE_APP_LOGO                    # URL do logo
VITE_ANALYTICS_ENDPOINT          # Endpoint de analytics
VITE_ANALYTICS_WEBSITE_ID        # ID do website
```

---

## 8. Monitoramento e Logs

### Railway
1. Acesse o painel do Railway
2. Clique no seu projeto
3. Vá para "Logs" para ver logs em tempo real

### Vercel
1. Acesse o painel do Vercel
2. Clique no seu projeto
3. Vá para "Deployments" para ver histórico
4. Clique em um deployment para ver logs

---

## 9. Troubleshooting

### Erro: "DATABASE_URL not found"
- Verifique se a variável está configurada no Railway
- Reinicie o deployment

### Erro: "CORS error"
- Adicione a URL do Vercel ao CORS no backend
- Verifique se o backend está rodando

### Erro: "Module not found"
- Execute `pnpm install --frozen-lockfile` localmente
- Verifique se o `pnpm-lock.yaml` está no repositório

### Erro: "Build failed"
- Verifique os logs do build no Vercel/Railway
- Certifique-se de que todas as dependências estão instaladas

---

## 10. Próximos Passos

1. **Testar em Produção**: Acesse a URL do Vercel e teste todas as funcionalidades
2. **Configurar Backups**: Configure backups automáticos no Supabase
3. **Monitoramento**: Configure alertas no Railway e Vercel
4. **SSL/TLS**: Ambas as plataformas fornecem SSL grátis automaticamente

---

## Suporte

Para dúvidas sobre:
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
