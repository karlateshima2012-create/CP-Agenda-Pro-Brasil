# Arquitetura VPS — CP Agenda Pro Brasil

**Data:** 08/06/2026  
**Contexto:** Projeto greenfield hospedado em VPS próprio  
**Objetivo:** SaaS multi-tenant de agendamento para o mercado brasileiro  

---

## Decisão Arquitetural em Uma Linha

> **Bun + Hono + PostgreSQL 16 (RLS) + Redis + Caddy — tudo em Docker Compose numa VPS no Brasil.**

---

## 1. Escolha da VPS

### Opção A — Oracle Cloud Free Tier *(Recomendado para começar)*

| Item | Valor |
|---|---|
| Custo | **Grátis para sempre** |
| Região | São Paulo (GRU) |
| CPU | 4 vCPUs ARM Ampere |
| RAM | 24 GB |
| Armazenamento | 200 GB SSD |
| Bandwidth | 10 TB/mês |
| Limitação | ARM — algumas imagens Docker precisam de `--platform linux/arm64` |

> Suficiente para rodar todo o stack + PostgreSQL + Redis com margem.

### Opção B — Hostinger KVM4 *(Recomendado para produção paga)*

| Item | Valor |
|---|---|
| Custo | ~R$ 45–70/mês |
| Região | São Paulo |
| CPU | 4 vCPUs x86 |
| RAM | 8 GB |
| Armazenamento | 50 GB NVMe |
| Banda | Ilimitada |

### Opção C — Contabo VPS S *(Mais barato da Europa com latência aceitável)*

| Item | Valor |
|---|---|
| Custo | ~$8/mês |
| Região | Alemanha (latência ~180ms do BR — não ideal) |

**Decisão:** Oracle Cloud Free Tier para MVP → Hostinger KVM4 quando pagar clientes.

---

## 2. Stack Completo

```
┌───────────────────────────────────────────────────────────────┐
│  VPS — Ubuntu 24.04 LTS (São Paulo)                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Caddy 2.8                                              │  │
│  │  ├── HTTPS automático (Let's Encrypt)                   │  │
│  │  ├── Serve React build estático (/ → /srv/dist)         │  │
│  │  └── Proxy /api/* → API container :3000                 │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │  API — Bun 1.x + Hono 4 (TypeScript)                    │  │
│  │  ├── /api/auth          (login, logout, reset)          │  │
│  │  ├── /api/me            (perfil, configurações)         │  │
│  │  ├── /api/services      (catálogo de serviços)          │  │
│  │  ├── /api/availability  (horários + bloqueios)          │  │
│  │  ├── /api/appointments  (gerenciar agendamentos)        │  │
│  │  ├── /api/book          (booking público — transação)   │  │
│  │  ├── /api/public        (dados públicos sem auth)       │  │
│  │  ├── /api/clients       (CRM)                           │  │
│  │  ├── /api/admin         (painel super_admin)            │  │
│  │  └── /api/events        (SSE realtime)                  │  │
│  └───────────┬─────────────────────────┬───────────────────┘  │
│              │                         │                      │
│  ┌───────────▼────────┐   ┌────────────▼────────────────────┐ │
│  │  PostgreSQL 16      │   │  Redis 7 (Valkey)               │ │
│  │  + Row-Level        │   │  ├── Sessions (JWT refresh)     │ │
│  │    Security (RLS)   │   │  ├── Rate limiting              │ │
│  │  multi-tenant       │   │  └── Cache de disponibilidade   │ │
│  └────────────────────┘   └─────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
         │                          │
  Cloudflare R2              Resend + Telegram
  (imagens/uploads)          (email + notificações)
  10 GB free, CDN global
```

---

## 3. Por Que Este Stack?

### Bun em vez de Node.js

| | Node.js 22 | **Bun 1.x** |
|---|---|---|
| Startup time | ~100ms | ~5ms |
| TypeScript | Precisa tsc/tsx | **Nativo** |
| Bundle/Build | Precisa esbuild/rollup | **Nativo** |
| Performance | Boa | **3× mais rápido** |
| npm packages | ✅ | ✅ (100% compatível) |
| Estabilidade 2026 | ✅ | ✅ (v1.x LTS) |

### Hono em vez de Express/Fastify

- **3× mais rápido** que Express em benchmarks
- TypeScript nativo (sem `@types/...`)
- Middleware de CORS, auth, validação incluídos
- API idêntica ao que o Bun espera
- Bundle tiny (~15KB)

### PostgreSQL em vez de MySQL

- **Row-Level Security (RLS)**: isolamento de tenant no nível do banco
- `TIMESTAMPTZ` nativo — sem bugs de timezone
- `JSONB` com indexação — melhor que JSON do MySQL
- `UUID` nativo como PK
- Melhor performance em queries complexas (admin stats)
- Suporte a window functions, CTEs recursivos

### Redis (Valkey) para Sessões e Rate Limit

- **JWT Access Token:** 15 minutos (stateless)
- **JWT Refresh Token:** 30 dias, armazenado no Redis
- **Rate Limiting:** contador por IP/email no Redis (atômico, sem race condition)
- Evita o problema atual de rate limiting em arquivo (condição de corrida)

### Caddy em vez de Nginx

- SSL automático via ACME/Let's Encrypt com **zero configuração**
- Serve arquivos estáticos + proxy reverso em um arquivo simples
- Auto-renova certificados

### Cloudflare R2 para Imagens

| | Armazenamento local na VPS | **Cloudflare R2** |
|---|---|---|
| CDN | Não | **Global (PoP em SP)** |
| Custo | Espaço da VPS | **10 GB grátis** |
| Backup | Manual | **Replicado** |
| URL pública | Precisa servir pelo Caddy | **URL direta com cache** |
| Egress | — | **Grátis** |

---

## 4. Estrutura de Pastas do Projeto

```
cp-agenda-pro-br/
│
├── docker-compose.yml          # Orquestração de todos os serviços
├── docker-compose.dev.yml      # Override para dev local
├── Caddyfile                   # Config do proxy reverso
├── .env.example                # Template de variáveis
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: build → test → deploy VPS
│
├── frontend/                   # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts          # Funções de API (fetch tipado)
│   │   │   └── auth.ts         # Gerenciamento de JWT no cliente
│   │   ├── components/         # Mesmos componentes atuais
│   │   ├── utils/
│   │   │   └── availability.ts # Motor de slots (idêntico ao atual)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSSE.ts       # Server-Sent Events (realtime)
│   │   │   └── useAppointments.ts
│   │   ├── types/
│   │   │   └── index.ts        # Tipos compartilhados
│   │   ├── constants.ts        # Adaptado para BR (tel, moeda, tz)
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── api/                        # Bun + Hono (TypeScript)
│   ├── src/
│   │   ├── index.ts            # Entry point + Hono app
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verify middleware
│   │   │   ├── cors.ts
│   │   │   ├── rateLimit.ts    # Rate limit via Redis
│   │   │   └── tenant.ts       # SET LOCAL app.account_id no PG
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── me.ts
│   │   │   ├── services.ts
│   │   │   ├── availability.ts
│   │   │   ├── appointments.ts
│   │   │   ├── book.ts         # Booking público (transação)
│   │   │   ├── public.ts
│   │   │   ├── clients.ts
│   │   │   ├── admin.ts
│   │   │   └── events.ts       # SSE realtime
│   │   ├── db/
│   │   │   ├── client.ts       # Pool PostgreSQL (postgres.js)
│   │   │   ├── schema.ts       # Drizzle schema (TypeScript)
│   │   │   └── migrations/     # SQL migrations versionadas
│   │   ├── services/
│   │   │   ├── email.ts        # Resend
│   │   │   ├── telegram.ts
│   │   │   └── storage.ts      # Cloudflare R2
│   │   └── lib/
│   │       ├── jwt.ts
│   │       ├── password.ts
│   │       └── errors.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
└── database/
    ├── schema.sql              # Schema completo (referência)
    ├── seed.sql                # Dados de teste
    └── migrations/             # Histórico de migrations
        └── 0001_initial.sql
```

---

## 5. Docker Compose

```yaml
# docker-compose.yml
services:

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./frontend/dist:/srv:ro        # Build do React
      - caddy_data:/data               # Certificados SSL
    depends_on: [api]

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://cpagenda:${DB_PASSWORD}@postgres:5432/cpagenda
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
      R2_BUCKET: ${R2_BUCKET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      APP_URL: https://cpagendapro.com.br
      NODE_ENV: production
      TZ: America/Sao_Paulo
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cpagenda
      POSTGRES_USER: cpagenda
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      TZ: America/Sao_Paulo
      PGTZ: America/Sao_Paulo
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
      - ./database/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cpagenda"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  caddy_data:
```

---

## 6. Caddyfile

```caddyfile
cpagendapro.com.br {
    # API — proxy para o container Hono
    handle /api/* {
        reverse_proxy api:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
        }
    }

    # Frontend — serve React SPA com fallback para index.html
    handle {
        root * /srv
        try_files {path} /index.html
        file_server {
            precompressed gzip br
        }
    }

    # Compressão
    encode gzip zstd

    # Headers de segurança
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        X-XSS-Protection "1; mode=block"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}
```

---

## 7. API: Hono Entry Point

```typescript
// api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

import { authRoutes }         from './routes/auth'
import { meRoutes }           from './routes/me'
import { servicesRoutes }     from './routes/services'
import { availabilityRoutes } from './routes/availability'
import { appointmentsRoutes } from './routes/appointments'
import { bookRoutes }         from './routes/book'       // público, sem auth
import { publicRoutes }       from './routes/public'     // público, sem auth
import { clientsRoutes }      from './routes/clients'
import { adminRoutes }        from './routes/admin'
import { eventsRoutes }       from './routes/events'     // SSE

const app = new Hono()

// Middleware global
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: ['https://cpagendapro.com.br', 'http://localhost:5173'],
  credentials: true,
}))

// Health check
app.get('/api/ping', (c) => c.json({ msg: 'PONG', version: '1.0.0' }))

// Rotas
app.route('/api/auth',         authRoutes)
app.route('/api/me',           meRoutes)
app.route('/api/services',     servicesRoutes)
app.route('/api/availability', availabilityRoutes)
app.route('/api/appointments', appointmentsRoutes)
app.route('/api/book',         bookRoutes)
app.route('/api/public',       publicRoutes)
app.route('/api/clients',      clientsRoutes)
app.route('/api/admin',        adminRoutes)
app.route('/api/events',       eventsRoutes)

export default {
  port: 3000,
  fetch: app.fetch
}
```

---

## 8. Auth: JWT Stateless + Refresh Token no Redis

```
Login:
  1. Verifica email/password (bcrypt)
  2. Gera ACCESS TOKEN  (JWT, 15min, payload: {userId, accountId, role})
  3. Gera REFRESH TOKEN (JWT, 30 dias, armazenado no Redis)
  4. Envia access em JSON + refresh em cookie httpOnly

Request autenticado:
  1. Lê Authorization: Bearer <access_token>
  2. Verifica assinatura + expiração
  3. Extrai {userId, accountId, role} do payload
  4. Passa para o handler

Refresh (token expirado):
  POST /api/auth/refresh
  1. Lê refresh_token do cookie httpOnly
  2. Verifica no Redis se ainda é válido
  3. Emite novo access token

Logout:
  1. Remove refresh token do Redis
  2. Limpa cookie
```

---

## 9. Multi-Tenancy com PostgreSQL RLS

```typescript
// api/src/middleware/tenant.ts
// Antes de cada query autenticada, define o contexto do tenant no PostgreSQL

export async function withTenant<T>(
  accountId: string,
  fn: (db: typeof pgPool) => Promise<T>
): Promise<T> {
  const client = await pgPool.connect();
  try {
    // SET LOCAL: válido apenas nesta transação
    await client.query(
      `SET LOCAL app.current_account_id = $1`, 
      [accountId]
    );
    return await fn(client as any);
  } finally {
    client.release();
  }
}
```

```sql
-- RLS: O banco garante isolamento independente do código
CREATE POLICY "tenant_isolation"
ON appointments
FOR ALL
USING (
  account_id = current_setting('app.current_account_id', true)::uuid
);

-- Se o código esquecer de filtrar, o banco retorna 0 rows.
-- Impossível vazar dados entre tenants.
```

---

## 10. Realtime: Server-Sent Events (SSE)

SSE é mais simples que WebSocket em VPS (sem protocolo de upgrade, funciona com Caddy diretamente):

```typescript
// api/src/routes/events.ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { requireAuth } from '../middleware/auth'

const events = new Hono()

// Map de conexões ativas: accountId → Set<controller>
const connections = new Map<string, Set<ReadableStreamDefaultController>>()

// Endpoint que o dashboard assina
events.get('/', requireAuth, async (c) => {
  const { accountId } = c.get('jwtPayload')

  return streamSSE(c, async (stream) => {
    if (!connections.has(accountId)) connections.set(accountId, new Set())
    connections.get(accountId)!.add(stream as any)

    await stream.writeSSE({ data: 'connected', event: 'ready' })

    // Mantém vivo com heartbeat a cada 30s
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: '', event: 'ping' }).catch(() => {})
    }, 30_000)

    stream.onAbort(() => {
      clearInterval(heartbeat)
      connections.get(accountId)?.delete(stream as any)
    })
  })
})

// Chamado internamente quando um novo agendamento é criado
export function notifyAccount(accountId: string, event: string, data: object) {
  const subs = connections.get(accountId)
  if (!subs) return
  const payload = JSON.stringify(data)
  subs.forEach(ctrl => {
    (ctrl as any).writeSSE({ data: payload, event }).catch(() => {})
  })
}

export { events as eventsRoutes }
```

```typescript
// No hook do React (frontend):
useEffect(() => {
  const es = new EventSource('/api/events', { withCredentials: true })
  
  es.addEventListener('new_appointment', (e) => {
    const appt = JSON.parse(e.data)
    setAppointments(prev => [appt, ...prev])
    playNotificationSound()
  })
  
  return () => es.close()
}, [])
```

---

## 11. Cloudflare R2 — Upload de Imagens

```typescript
// api/src/services/storage.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

export async function uploadImage(
  accountId: string,
  type: 'cover' | 'profile' | 'service',
  file: File,
  serviceId?: string
): Promise<string> {
  const ext  = file.name.split('.').pop()
  const key  = `${accountId}/${type}${serviceId ? `/${serviceId}` : ''}.${ext}`
  const body = Buffer.from(await file.arrayBuffer())

  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET!,
    Key:         key,
    Body:        body,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  // Retorna URL pública via domínio customizado do R2
  return `https://media.cpagendapro.com.br/${key}`
}
```

---

## 12. CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build frontend
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd frontend && npm ci && npm run build

      # Type-check API
      - run: cd api && bun install && bun run type-check

      # Deploy para VPS via SSH
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key:      ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/cpagenda

            # Atualiza código
            git pull origin main

            # Copia build do frontend (via SCP, feito antes)
            # Rebuild e sobe containers
            docker compose build api
            docker compose up -d --no-deps api caddy

            # Roda migrations
            docker compose exec api bun run db:migrate

            # Verifica se subiu
            sleep 3
            curl -f http://localhost:3000/api/ping || exit 1
```

---

## 13. Backup Automatizado

```bash
# /opt/cpagenda/scripts/backup.sh
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
FILE="/tmp/backup_${DATE}.sql.gz"

# Dump do banco dentro do container
docker exec cpagenda-postgres-1 \
  pg_dump -U cpagenda cpagenda | gzip > "$FILE"

# Upload para Cloudflare R2 (usando rclone)
rclone copy "$FILE" r2:cpagenda-backups/postgres/

# Remove local
rm "$FILE"

echo "Backup $DATE concluído"
```

```bash
# crontab -e
0 3 * * * /opt/cpagenda/scripts/backup.sh >> /var/log/cpagenda-backup.log 2>&1
```

---

## 14. Monitoramento

| O Que | Como | Custo |
|---|---|---|
| Uptime do servidor | UptimeRobot (ping a cada 5min) | Grátis |
| Erros de API | Logs do Hono → Telegram bot (igual ao atual) | Grátis |
| Logs estruturados | `docker compose logs -f api` ou stdout JSON | Grátis |
| Métricas de banco | `pg_stat_activity` + query no admin | Grátis |
| Alertas críticos | Monitor.ts equivalente em TypeScript | Grátis |

---

## 15. Custo Total

### MVP (Oracle Free)

| Serviço | Custo/mês |
|---|---|
| Oracle Cloud VPS (São Paulo) | **R$ 0** |
| Cloudflare R2 (10 GB storage) | **R$ 0** |
| Resend (3.000 emails/dia) | **R$ 0** |
| Domínio `.com.br` (RegistroBR) | R$ 4/mês (~R$40/ano) |
| **Total** | **R$ 4/mês** |

### Produção (Hostinger KVM4)

| Serviço | Custo/mês |
|---|---|
| Hostinger VPS KVM4 (São Paulo) | R$ 70 |
| Cloudflare R2 | R$ 0–10 |
| Resend | R$ 0–25 |
| Domínio | R$ 4 |
| **Total** | **~R$ 80–110/mês** |

---

## 16. Comparativo com Stack Atual

| Critério | Stack Atual (PHP+MySQL+Hostinger) | Stack Novo (Bun+PG+VPS) |
|---|---|---|
| Multi-tenant isolation | Código (vulnerável) | **Banco (RLS, garantido)** |
| Auth | Sessões PHP em arquivo | **JWT + Redis** |
| Realtime | Polling 15s | **SSE instantâneo** |
| Imagens | URLs externas (sem gestão) | **R2 com CDN** |
| Latência frontend | ~250ms (JP→BR) | **~15ms (CDN BR)** |
| Latência API | ~300ms | **~3ms (VPS São Paulo)** |
| TypeScript | Só no frontend | **End-to-end** |
| Tipo de hosting | Shared (limitado) | **VPS dedicado** |
| Custo MVP | ~R$ 50/mês | **R$ 4/mês** |
| Rate limiting | Arquivo (race condition) | **Redis (atômico)** |

---

*Documento de arquitetura VPS. Pronto para iniciar implementação.*  
*Próximo passo: Schema PostgreSQL completo com RLS.*
