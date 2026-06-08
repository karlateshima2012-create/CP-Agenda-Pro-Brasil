# Relatório de Arquitetura — CP Agenda Pro

Este documento serve como referência de arquitetura, stack tecnológico e processo de deploy do projeto **CP Agenda Pro**. Deve ser consultado antes de qualquer nova atualização ou implementação para garantir a consistência técnica e a segurança do sistema.

## 1. Frontend
- **Framework**: React 19
- **Linguagem**: TypeScript
- **Bundler**: Vite 6 (Build gera um único JS bundle com hash no nome `index-HASH.js`. Utiliza `base: './'` para compatibilidade com subdiretórios).
- **Estilo**: Tailwind CSS 4
- **Ícones**: Lucide React
- **HTTP**: Axios (via wrapper customizado `apiClient`)
- **Gerenciamento de Estado**: React puro (`useState` / `useEffect`). Sem bibliotecas externas como Redux ou Zustand.
- **Roteamento**: SPA de página única. A troca de telas/abas é feita via estado, sem react-router.
- **Gráficos/UI Extras**: Nenhuma biblioteca externa pesada. Gráficos de barras são construídos com CSS puro.
- **Otimização**: `console.log` e debuggers são removidos automaticamente no build de produção.

## 2. Backend
- **Linguagem**: PHP 8.3 Vanilla (Sem framework)
- **Roteamento**: Roteador manual. `index.php` recebe as requisições, extrai o path e direciona via `switch` para o módulo correto (auth, me, services, appointments, admin, public).
- **Banco de Dados**: MySQL (conexão via PDO).
- **ORM**: Nenhum. As queries SQL são diretas e usam obrigatoriamente *prepared statements*.
- **Autenticação**: Sessions nativas do PHP (cookies configurados para 30 dias, `httponly`, `secure`, `samesite=Lax`).
- **E-mail**: PHPMailer.
- **Análise Estática**: PHPStan (via Larastan), sendo um passo crítico de bloqueio no CI.
- **Monitoramento**: Bot no Telegram envia alertas críticos em tempo real.

## 3. Banco de Dados (Multi-tenant)
O sistema opera em um banco de dados único. O isolamento de dados entre clientes (inquilinos) é feito estritamente pela coluna **`account_id`** presente em todas as tabelas.

| Tabela | Função |
|---|---|
| `cp_agenda_accounts` | Dados da empresa, plano, branding, `last_access_at` |
| `cp_agenda_users` | Login, controle de acesso (role) e senha (hash) |
| `cp_agenda_services` | Catálogo de serviços de cada profissional |
| `cp_agenda_availability` | Configuração de horários (armazenado via JSON) |
| `cp_agenda_blocked_dates` | Exceções e bloqueios da agenda |
| `cp_agenda_appointments` | Agendamentos ativos (uso de soft delete) |
| `cp_agenda_appointments_archive`| Histórico de agendamentos arquivados |
| `cp_agenda_clients` | CRM / Clientes fidelizados |

- **Migrations**: Ficam em `backend/database/migrations/`. São arquivos SQL puros numerados sequencialmente. O script `migrate.php` é idempotente e usa a tabela `migrations` para rastrear o histórico.

## 4. Infraestrutura e Deploy
- **Hospedagem**: Hostinger (Shared Hosting) utilizando Apache/LiteSpeed.
- **Domínio**: `cpagendapro.creativeprintjp.com`
- **Caminho no Servidor**: `domains/creativeprintjp.com/public_html/cpagendapro/`
- **Cachê e Rotas (.htaccess)**: `no-cache` para HTML, cache imutável (1 ano) para assets cacheados por Hash. Regra de *catch-all* para direcionar a SPA para o `index.html`.

### Pipeline de Deploy (GitHub Actions)
Qualquer push na branch `main` executa automaticamente a seguinte esteira:
1. Checkout do código.
2. Build do Frontend (`npm install` -> `npm run build` gerando a pasta `dist/`).
3. Build do Backend (instalação de dependências PHP via Composer).
4. Análise Estática (PHPStan). **Bloqueia o deploy em caso de erros de tipagem**.
5. Limpeza de dependências (Composer `--no-dev`).
6. Geração do `.env` injetando os GitHub Secrets.
7. Empacotamento em `dist.zip` e `backend.zip`.
8. Verificação de porta/SSH (`nc`) com a Hostinger.
9. Upload (SCP) dos pacotes para o servidor.
10. Execução via SSH: Descompacta, roda as migrações (`php migrate.php`), substitui o Frontend e finaliza.
*Nota: Todos os segredos operam exclusivamente pelos GitHub Secrets.*

## 5. Diretrizes de Segurança
- **CORS**: Allowlist estrita. Somente o domínio oficial e `localhost` são aceitos.
- **Sessões**: Estritamente protegidas por `httponly`, `secure` e `samesite=Lax`.
- **SQL Injection**: Tolerância zero. O sistema todo exige consultas parametrizadas via PDO.
- **Exposição de Dados**: Jamais usar `SELECT *`. Os endpoints precisam selecionar explicitamente quais colunas serão devolvidas. Senhas e tokens nunca vão para o frontend.
- **Qualidade de Código**: O CI roda PHPStan que bloqueia automaticamente o deploy se existirem anomalias de tipos no PHP.
- **Ambiente Limpo**: `DEBUG_MODE=false` bloqueia saída de erros em produção (logando-os isoladamente), mantendo os consoles e endpoints inviolados.
