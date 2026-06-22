# APEX Performance Management System - Setup Local

## Requisitos
- Node.js 22+
- pnpm 10+
- PostgreSQL 14+ (ou Supabase)

## Instalação Local

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Configurar Banco de Dados
```bash
# Edite .env.local com suas credenciais do Supabase
# DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Execute as migrações
pnpm db:push
```

### 3. Iniciar o Servidor de Desenvolvimento
```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
apex_performance_system/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários e configurações
│   │   └── App.tsx        # Componente raiz
│   └── public/            # Arquivos estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Definição das rotas tRPC
│   ├── db.ts              # Funções de banco de dados
│   └── _core/             # Configurações internas
├── drizzle/               # Schema e migrações do banco
│   ├── schema.ts          # Definição das tabelas
│   └── migrations/        # Arquivos de migração
├── shared/                # Código compartilhado
├── package.json           # Dependências
├── tsconfig.json          # Configuração TypeScript
├── vite.config.ts         # Configuração Vite
└── drizzle.config.ts      # Configuração Drizzle ORM
```

## Scripts Disponíveis

```bash
pnpm dev              # Inicia servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Inicia servidor de produção
pnpm test             # Executa testes
pnpm db:push          # Sincroniza schema com banco
pnpm format           # Formata código
pnpm check            # Verifica tipos TypeScript
```

## Variáveis de Ambiente

Principais variáveis necessárias:
- `DATABASE_URL`: Connection string PostgreSQL
- `JWT_SECRET`: Chave para assinar JWTs
- `VITE_APP_ID`: ID da aplicação OAuth
- `NODE_ENV`: environment (development/production)

## Funcionalidades

- ✅ Dashboard estratégico com KPIs
- ✅ Avaliação contínua com 5 indicadores
- ✅ Plano de carreira N1-N5
- ✅ Sistema de bandeiras de faturamento
- ✅ Histórico de avaliações
- ✅ Placar geral com exportação PDF
- ✅ Gestão de colaboradores
- ✅ Administração de usuários
- ✅ Responsivo (mobile-friendly)

## Testes

```bash
pnpm test
```

## Deploy

Veja `DEPLOY_GUIDE.md` para instruções de deploy em produção.
