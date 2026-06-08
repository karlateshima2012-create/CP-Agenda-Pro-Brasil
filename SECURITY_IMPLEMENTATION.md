# 🛡️ CP Agenda Pro — Implementação do Plano de Segurança

**Data de início:** 30 de Abril de 2026  
**Data de conclusão:** 30 de Abril de 2026  
**Commit:** `f99535a` — `security: implement all 3 sprint security fixes`

---

## 🚨 SPRINT EMERGENCIAL — Vulnerabilidades Críticas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ✅ | C-1 | Senha SMTP movida para variáveis de ambiente | `Mail.php`, `.env.example`, `deploy.yml` |
| ✅ | C-2 | `debug_env.php` e `debug_query.php` removidos do repositório | `backend/api/` |
| ✅ | C-3 | `force_fix.php` removido do repositório | `backend/api/` |

---

## 🟠 SPRINT 1 — Vulnerabilidades Altas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ✅ | A-4 | `SELECT *` substituído por colunas explícitas | `me.php` |
| ✅ | A-5 | Rate limiting implementado no login (10/15min) e reset (5/10min) | `auth.php` |
| ✅ | A-6 | Contas bloqueadas/expiradas retornam apenas status, sem dados | `public.php` |
| ✅ | A-7 | Validação completa de campos obrigatórios na criação de usuários | `admin.php` |

---

## 🟡 SPRINT 2 — Qualidade e Boas Práticas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ✅ | M-8 | `console.log` substituído por utilitário condicional `log.*` | `App.tsx`, `PublicBookingPage.tsx`, `src/logger.ts` (novo) |
| ✅ | M-10 | Headers de segurança HTTP adicionados (CSP, X-Frame, nosniff) | `backend/api/.htaccess` |
| ✅ | M-11 | Tipagem TypeScript melhorada — `any` substituído por interfaces | `src/api.ts` |
| ✅ | B-12 | `error_log` com dados sensíveis removido | `admin.php` |

---

## 📓 Log de Execução

### 30 Abr 2026 — Sprint Emergencial

**[C-1] Senha SMTP hardcoded → Variáveis de Ambiente**
- `backend/api/lib/Mail.php`: Todas as credenciais agora lidas via `get_config_var()`. Adicionada verificação de credenciais vazias com `error_log` de aviso.
- `backend/.env.example`: Padronizado para usar `SMTP_PASSWORD` (consistente com o código). Adicionado `SMTP_FROM_NAME`.
- `.github/workflows/deploy.yml`: Adicionados 4 novos secrets SMTP (`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_FROM_NAME`) injetados automaticamente no `.env` de produção.
- ⚠️ **Ação manual necessária:** Adicionar os 4 secrets no painel do GitHub (`Settings > Secrets > Actions`) e girar a senha no painel da Hostinger.

**[C-2] Arquivos de debug removidos**
- `backend/api/debug_env.php` → **deletado** (expunha versão PHP e caminhos internos)
- `backend/api/debug_query.php` → **deletado** (expunha todos os e-mails e roles sem autenticação)

**[C-3] Script de manipulação de dados removido**
- `backend/api/force_fix.php` → **deletado** (executava UPDATE no banco sem autenticação)

---

### 30 Abr 2026 — Sprint 1

**[A-4] SELECT * → Colunas Explícitas**
- `backend/api/routes/me.php`: Substituído `SELECT *` por lista de 13 colunas específicas. Campos internos como índices e metadados do banco não são mais expostos.

**[A-5] Rate Limiting**
- `backend/api/routes/auth.php`: Implementado `checkRateLimit()` baseado em arquivo (funciona sem Redis/APCu no Hostinger compartilhado).
  - Login: máx. **10 tentativas por IP** em 15 minutos → HTTP 429
  - Reset de senha: máx. **5 tentativas por e-mail** em 10 minutos → retorna resposta genérica (não revela se o e-mail existe)

**[A-6] Dados de Contas Bloqueadas**
- `backend/api/routes/public.php`: Bloco `if` que estava vazio foi implementado. Contas com `status !== 'active'` agora retornam apenas `{ status, name }` — serviços, horários e agendamentos são ocultados.

**[A-7] Validação de Criação de Usuários**
- `backend/api/routes/admin.php`: Adicionados 5 checks antes de inserir no banco:
  1. Campos obrigatórios presentes (`email`, `password`, `companyName`, `ownerName`)
  2. Formato de e-mail válido (`filter_var FILTER_VALIDATE_EMAIL`)
  3. Senha com mínimo de 8 caracteres
  4. Duplicidade de e-mail verificada no banco
  5. `error_log` com dados do usuário **removido** [B-12]

---

### 30 Abr 2026 — Sprint 2

**[M-8] Logger Condicional**
- `src/logger.ts` → **criado**: Exporta `log.info()`, `log.warn()`, `log.error()`, `log.debug()` — silenciosos em produção.
- `App.tsx`: 8 chamadas `console.log/error` substituídas por `log.*`. Versão do build agora lida via `import.meta.env.VITE_APP_VERSION`.
- `components/PublicBookingPage.tsx`: 2 `console.log` que expunham dados completos de disponibilidade **removidos**.

**[M-10] Headers de Segurança HTTP**
- `backend/api/.htaccess` reescrito com:
  - `X-Content-Type-Options: nosniff` — impede MIME sniffing
  - `X-Frame-Options: DENY` — impede clickjacking
  - `X-XSS-Protection: 1; mode=block` — proteção legacy
  - `Referrer-Policy: strict-origin-when-cross-origin` — controla vazamento de URL
  - `X-Powered-By` → **removido** (não expõe versão do PHP)
  - `Content-Security-Policy` — restringe origens de scripts, estilos, fontes e imagens

**[M-11] TypeScript Typing**
- `src/api.ts` completamente reescrito:
  - Interface genérica `ApiResponse<T>` substituindo `Promise<any>`
  - Interfaces tipadas: `LoginCredentials`, `CreateUserPayload`, `BookingPayload`, `ProfileUpdatePayload`
  - Todos os métodos com tipos de retorno explícitos
  - Parâmetros `any` substituídos por tipos importados de `types.ts`

---

## ⚠️ Ação Manual Necessária

> [!IMPORTANT]  
> Os GitHub Secrets de SMTP precisam ser configurados manualmente no repositório.

Acesse: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Valor |
|-------------|-------|
| `SMTP_USER` | `suporte@creativeprintjp.com` |
| `SMTP_PASSWORD` | *(senha atual do e-mail)* |
| `SMTP_FROM` | `suporte@creativeprintjp.com` |
| `SMTP_FROM_NAME` | `CP Agenda Pro` |

Após configurar, o próximo deploy injetará automaticamente essas variáveis no `.env` de produção.


---

## 🚨 SPRINT EMERGENCIAL — Vulnerabilidades Críticas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ⏳ | C-1 | Mover senha SMTP para variável de ambiente | `Mail.php`, `.env.example`, `deploy.yml` |
| ⏳ | C-2 | Remover `debug_env.php` e `debug_query.php` do repositório | `backend/api/` |
| ⏳ | C-3 | Remover `force_fix.php` do repositório | `backend/api/` |

---

## 🟠 SPRINT 1 — Vulnerabilidades Altas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ⏳ | A-4 | Substituir `SELECT *` por colunas explícitas | `me.php` |
| ⏳ | A-5 | Implementar rate limiting no login e reset de senha | `auth.php` |
| ⏳ | A-6 | Bloquear retorno de dados em contas inativas | `public.php` |
| ⏳ | A-7 | Validação de campos obrigatórios na criação de usuários | `admin.php` |

---

## 🟡 SPRINT 2 — Qualidade e Boas Práticas

| Status | ID | Tarefa | Arquivo |
|--------|-----|--------|---------|
| ⏳ | M-8 | Substituir `console.log` por utilitário condicional | `App.tsx`, `PublicBookingPage.tsx` |
| ⏳ | M-10 | Adicionar headers de segurança HTTP | `.htaccess` (raiz) |
| ⏳ | M-11 | Melhorar tipagem TypeScript (remover `any` desnecessário) | `App.tsx`, `src/api.ts` |
| ⏳ | B-12 | Remover `error_log` com dados de criação de usuário | `admin.php` |

---

## 📓 Log de Execução

*Atualizações serão adicionadas aqui conforme cada tarefa for concluída.*
