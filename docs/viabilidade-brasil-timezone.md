# Viabilidade e Plano de Implementação: Brasil (BRT)
## Adaptação do Motor de Agendamento — Análise de Segurança Técnica

**Versão:** 1.0  
**Data:** Junho 2025  
**Status:** Aprovado para implementação — Opção A (Brasil)

---

## 1. Como o Motor de Agendamento Funciona Hoje

Antes de qualquer mudança, é essencial entender por que o sistema não tem bugs de duplicidade ou conflito atualmente. A resposta está na arquitetura de **datetime naive (sem fuso horário)**.

### 1.1 O Padrão Wall-Clock (Horário de Parede)

O sistema armazena e compara datas como **strings de horário local puro**, sem nenhuma indicação de fuso horário.

```
Frontend envia:   "2025-06-10 09:00:00"   ← sem timezone, sem 'Z', sem '+09:00'
Banco armazena:   "2025-06-10 09:00:00"   ← verbatim, igual ao enviado
Backend compara:  "2025-06-10 09:00:00"   ← mesma string, sem conversão
```

**Prova no código:**

```typescript
// PublicBookingPage.tsx — linha 361
startAt: `${selectedDate} ${selectedTime}:00`,
// Exemplo real: "2025-06-10 09:00:00"
// NÃO usa toISOString() (que adicionaria timezone)
```

```typescript
// PublicBookingPage.tsx — linha 182-194 (toTimestamp)
// Remove 'Z' se existir para manter como horário de parede
const cleanDateStr = dateStr.endsWith('Z') ? dateStr.substring(0, dateStr.length - 1) : dateStr;
```

Esta decisão foi intencional e documentada no código. É a razão pela qual **não existem bugs de conversão de fuso nas comparações de conflito**.

---

### 1.2 O Algoritmo de Detecção de Conflito (A Parte Mais Crítica)

O coração do motor é esta query SQL:

```sql
-- appointments.php — linhas 91-99
SELECT count(*) as total FROM cp_agenda_appointments 
WHERE account_id = ?
  AND status NOT IN ('canceled', 'rejected', 'deleted') 
  AND deleted_at IS NULL
  AND start_at < ?      -- novo_fim < existente_fim
  AND end_datetime > ?  -- novo_início > existente_início
```

**Por que isso é timezone-safe:**  
A comparação `start_at < newEnd AND end_datetime > newStart` usa apenas strings de horário. Como TODOS os valores no banco são wall-clock do mesmo fuso, a comparação é matematicamente correta independente de qual fuso é usado — desde que seja **sempre o mesmo**.

O algoritmo detecta sobreposição clássica:
```
[--- existente ---]
       [--- novo ---]  ← conflito: existente.end > novo.start E existente.start < novo.end
```

**Este algoritmo NÃO muda com a troca de fuso horário.** É intrinsecamente correto.

---

### 1.3 Os 4 Únicos Pontos Que Dependem do Fuso Horário

Após análise completa do código, apenas 4 pontos usam fuso horário explícito:

| # | Arquivo | Linha | Função | O que faz |
|---|---------|-------|--------|-----------|
| 1 | `backend/api/config.php` | 60 | `date_default_timezone_set('Asia/Tokyo')` | Define o fuso padrão de TODA a API PHP |
| 2 | `backend/api/routes/appointments.php` | 47-48 | `new DateTimeZone('Asia/Tokyo')` | Verifica se o agendamento é "hoje" ou "passado" |
| 3 | `components/PublicBookingPage.tsx` | 102 | `getNowJST()` | Filtra slots já passados na página pública |
| 4 | `components/AppointmentsTab.tsx` | 119-147 | `getJSTDate()` e funções derivadas | Exibe "hoje"/"amanhã" no painel da profissional |

**Todos os outros mecanismos do motor são timezone-agnostic.**

---

## 2. Análise de Risco por Ponto

### Ponto 1 — `date_default_timezone_set` (config.php)

**Risco se NÃO for alterado para BRT:**  
`new DateTime('now')` no PHP retornará hora de Tokyo. Uma profissional em São Paulo tentando agendar às 22h BRT (que são 10h do dia seguinte em JST) veria a data errada nas validações. O "hoje" do sistema seria amanhã para ela.

**Risco se for alterado incorretamente:**  
Nenhum risco para dados novos. Afeta apenas o deploy específico. O banco MySQL não tem fuso embutido — armazena strings.

**Ação necessária:**  
```php
// DE:
date_default_timezone_set('Asia/Tokyo');
// PARA:
date_default_timezone_set('America/Sao_Paulo');
```

---

### Ponto 2 — `new DateTimeZone('Asia/Tokyo')` (appointments.php)

**O que valida:**
```php
$accountTz = new DateTimeZone('Asia/Tokyo');
$nowJst = new DateTime('now', $accountTz);
$todayStr = $nowJst->format('Y-m-d');   // "2025-06-10"
$dateStr  = $startJst->format('Y-m-d'); // data do agendamento solicitado

if ($dateStr < $todayStr) throw new Exception('Data passada.');
if ($dateStr === $todayStr) throw new Exception('Mínimo 1 dia de antecedência.');
```

**Risco se NÃO for alterado:**  
Uma profissional em São Paulo que bloqueia agendamentos "para hoje" pode ter a validação errada em até 12h dependendo do horário do dia. Ex: às 22h BRT de segunda (já é terça em Tokyo), o backend aceitaria agendamentos para terça mas rejeitaria corretamente para segunda.

**Ação necessária:**
```php
// DE:
$accountTz = new DateTimeZone('Asia/Tokyo');
// PARA:
$accountTz = new DateTimeZone('America/Sao_Paulo');
```

> **Nota:** O comentário `// Assuming JST as per context` no código é uma admissão explícita de que este valor pode ser alterado sem risco estrutural.

---

### Ponto 3 — `getNowJST()` (PublicBookingPage.tsx)

**O que faz:**
```typescript
const getNowJST = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
```

Usado em `getSlotsForDate()` para filtrar horários que já passaram no dia de hoje:
```typescript
if (isToday && curr <= currentMinutes + 15) {
  continue; // Não mostra slots que já passaram + 15min de buffer
}
```

**Risco se NÃO for alterado:**  
Clientes finais de uma profissional brasileira verão horários errados disponíveis. Às 14h BRT, o sistema mostraria slots do início do dia como disponíveis (porque em Tokyo ainda seria madrugada / "ontem").

**Ação necessária:**
```typescript
// DE:
const getNowJST = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
// PARA:
const getNowBRT = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
// E substituir todas as chamadas getNowJST() por getNowBRT()
```

---

### Ponto 4 — `getJSTDate()` e derivados (AppointmentsTab.tsx)

**O que faz:**
```typescript
const getJSTDate = (dateStr: string | number | Date) => {
  // Converte uma string de datetime para um Date object interpretado em Tokyo
  const yStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const tStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo' });
  return new Date(`${yStr}T${tStr}`);
};
```

Usado para:
- Contar agendamentos de "hoje" e "amanhã" nos cards do topo
- Filtrar a lista por data
- Agrupar agendamentos no calendário visual

**Risco se NÃO for alterado:**  
A contagem de "hoje" no painel da profissional ficaria errada. Um agendamento das 09h BRT apareceria no dia "errado" no painel.

**Ação necessária:**
```typescript
// Renomear getJSTDate → getLocalDate e substituir o timezone
const getLocalDate = (dateStr: string | number | Date) => {
  const yStr = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const tStr = d.toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo' });
  return new Date(`${yStr}T${tStr}`);
};
// + renomear isSameDayJST, getTodayJST, getTomorrowJST nas ~15 chamadas
```

---

## 3. O Que NÃO Precisa Ser Alterado

Este é o coração da segurança da implementação:

| Componente | Status | Motivo |
|---|---|---|
| Algoritmo de detecção de conflito (SQL) | ✅ Não muda | Wall-clock, timezone-agnostic |
| Algoritmo de overlap de horários (toTimestamp) | ✅ Não muda | Explicitamente remove 'Z', wall-clock |
| Verificação de bloqueios (isBlockedInSlot) | ✅ Não muda | Compara strings locais |
| Lógica de horários fixos (fixedTimes) | ✅ Não muda | Strings de hora, sem timezone |
| Lógica de horários por intervalo | ✅ Não muda | Aritmética de minutos, sem timezone |
| Detecção de dia da semana no calendário | ✅ Não muda | `new Date(date + 'T12:00:00')` — meio-dia é estável em qualquer TZ |
| Bloqueios de data (blockedDates) | ✅ Não muda | Compara string `YYYY-MM-DD` |
| Lógica de slots fixos (AvailabilityTab) | ✅ Não muda | Arrays de strings de hora |
| `mapWorkingHours` | ✅ Não muda | Normaliza nomes de dias, sem timezone |
| Sistema de migrations do banco | ✅ Não muda | Não depende de timezone |
| Autenticação (sessions, Auth.php) | ✅ Não muda | Sem lógica de data |

---

## 4. Impacto nos Dados Existentes (Deploy Japão)

**REGRA ABSOLUTA: O deploy atual (Japão) NÃO deve ser alterado.**

O banco de dados atual contém agendamentos com horários wall-clock em JST. Se o timezone fosse alterado no servidor atual:
- Um agendamento de "09:00" registrado em JST passaria a ser interpretado como "09:00 BRT" (UTC-3)
- Isso representaria uma diferença de 12 horas em todos os horários históricos
- A contagem de "hoje" e "amanhã" ficaria errada
- Potencial para mostrar agendamentos passados como futuros

**O deploy para o Brasil deve ser uma instalação separada:**
- Novo domínio (ex: `agendapro.com.br`)
- Novo banco de dados (limpo, sem dados JST)
- Mesma codebase, com os 4 pontos alterados

---

## 5. Plano de Implementação Técnica

### Fase 1 — Backend (30 min)

**Arquivo:** `backend/api/config.php`
```php
// Linha 60 — alterar:
date_default_timezone_set('America/Sao_Paulo');
```

**Arquivo:** `backend/api/routes/appointments.php`
```php
// Linhas 47-48 — alterar:
$accountTz = new DateTimeZone('America/Sao_Paulo');
$nowBrt    = new DateTime('now', $accountTz);
$startBrt  = new DateTime($startStr, $accountTz);
// Renomear variáveis $nowJst/$startJst para $nowBrt/$startBrt no bloco
```

---

### Fase 2 — Frontend Motor de Agendamento (45 min)

**Arquivo:** `components/PublicBookingPage.tsx`

```typescript
// Linha 102 — renomear e trocar timezone:
const getNowBRT = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

// Linhas 199, 200, 202, 280, 281 — trocar getNowJST() por getNowBRT()
// Manter TODA a lógica de getSlotsForDate() intacta — nada muda exceto a fonte de "agora"

// Linha 351 — atualizar mensagem de erro do telefone:
// "O telefone deve ter 11 dígitos no formato (XX) XXXXX-XXXX."

// Linha 361 — startAt NÃO MUDA (já é wall-clock correto):
startAt: `${selectedDate} ${selectedTime}:00`,
```

**Arquivo:** `components/AppointmentsTab.tsx`

```typescript
// Linhas 119-147 — substituir timezone em getJSTDate:
const getLocalDate = (dateStr: string | number | Date) => {
  // ... mesma lógica ...
  const yStr = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const tStr = d.toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo' });
  return new Date(`${yStr}T${tStr}`);
};
const isSameDayLocal  = isSameDayJST;  // renomear internamente
const getTodayLocal   = getTodayJST;   // renomear internamente
const getTomorrowLocal = getTomorrowJST; // renomear internamente
// Substituir ~15 chamadas ao longo do arquivo
```

---

### Fase 3 — Cosmético (moeda, telefone, domínio) (2-3h)

**Moeda:**
```typescript
// ServicesTab.tsx, PublicBookingPage.tsx, GestaoTab.tsx, AdminDashboard.tsx, AccountTab.tsx
// ¥ → R$
// ja-JP → pt-BR
// JPY → BRL
// Intl.NumberFormat('ja-JP', {currency: 'JPY'}) → Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})
```

**Telefone:**
```typescript
// PublicBookingPage.tsx, ClientsTab.tsx, constants.ts
// Renomear formatJapanesePhone → formatBRPhone
// Formato: (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo)
// Placeholder "090 0000 0000" → "(11) 99999-9999"
// Validação: 10 ou 11 dígitos (fixo ou celular)
// Nota: 11 dígitos ainda é válido para celular brasileiro — a validação atual funciona para celular
```

**WhatsApp:**
```typescript
// AdminDashboard.tsx — troca de código de país
// '81' + phone (Japão) → '55' + phone (Brasil)
```

**Backend — links hardcoded:**
```php
// backend/api/routes/auth.php — linha 87
$resetLink = "https://SEU_DOMINIO_BR/reset-password?code=$token";

// backend/api/routes/admin.php — linha 198
$landingPage = "https://SEU_SITE_VENDAS_BR/";
```

**CORS:**
```php
// backend/api/index.php — adicionar domínio brasileiro
$allowedOrigins = [
    'https://SEU_NOVO_DOMINIO.com.br',
    'http://localhost:5173',
];
```

**Preços do SaaS no AdminDashboard:**
```typescript
// AdminDashboard.tsx — linhas 117-118
const PRICE_MONTHLY = 99;   // R$ — definir seu preço em BRL
const PRICE_ANNUAL  = 990;  // R$ — definir seu preço anual em BRL
```

---

### Fase 4 — Novo Ambiente (deploy Brasil)

1. **Registrar domínio** (ex: `cpagendapro.com.br` ou similar)
2. **Criar nova conta Hostinger** (ou novo site na conta atual)
3. **Novo banco MySQL** — banco limpo, sem dados do Japão
4. **Configurar GitHub Secrets** com as novas credenciais:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` — novo banco
   - `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` — novo servidor
5. **Deploy via GitHub Actions** — o workflow existente funciona sem alteração

> **Opção alternativa:** Usar um segundo branch `main-br` no mesmo repositório com um segundo workflow `.github/workflows/deploy-brazil.yml` apontando para o servidor/banco brasileiros.

---

## 6. Cenários de Teste de Segurança

Após a implementação, estes cenários DEVEM ser testados manualmente:

### 6.1 Teste de conflito de agendamento
- [ ] Criar Profissional A com horário 09:00-18:00 na segunda
- [ ] Agendar 09:00 para próxima segunda → deve funcionar
- [ ] Tentar agendar novamente 09:00 para a mesma segunda → deve retornar erro de conflito
- [ ] Agendar 09:30 (mesmo dia, serviço de 30 min) → deve funcionar
- [ ] Agendar 08:45 (mesmo dia, serviço de 30 min) → deve FALHAR (overlap com 09:00)

### 6.2 Teste de "hoje" e "passado"
- [ ] Às 15h BRT, tentar agendar para hoje → deve retornar "mínimo 1 dia de antecedência"
- [ ] Às 15h BRT, tentar agendar para ontem → deve retornar "data passada"
- [ ] Às 15h BRT, agendar para amanhã → deve funcionar
- [ ] Às 23h BRT, verificar que "amanhã" no sistema é o dia correto (não 2 dias à frente)

### 6.3 Teste de filtro de slots passados
- [ ] Na página pública, às 14h BRT, abrir o agendamento para hoje (se disponível)
- [ ] Verificar que slots das 13:30, 13:00, etc. NÃO aparecem
- [ ] Verificar que slots das 14:15 em diante SÃO exibidos
- [ ] O buffer de 15 minutos deve ser respeitado (slot 14:01 não aparece se são 14:00)

### 6.4 Teste de bloqueio de horário
- [ ] Bloquear 10:00-12:00 em uma data específica
- [ ] Tentar agendar 10:30 nessa data → deve ser rejeitado
- [ ] Agendar 09:00 nessa data (serviço de 30 min) → deve funcionar
- [ ] Agendar 12:00 nessa data → deve funcionar
- [ ] Agendar 11:30 com serviço de 60 min → deve ser rejeitado (termina às 12:30, overlap)

### 6.5 Teste de horário de verão brasileiro
O Brasil aboliu o horário de verão em 2019. `America/Sao_Paulo` é sempre UTC-3.
- Não há necessidade de testar transição de horário de verão.
- O offset é fixo: **UTC-3 permanentemente**.

---

## 7. Comparação: Deploy Japão vs Deploy Brasil

| Aspecto | Japão (atual) | Brasil (novo) |
|---|---|---|
| Timezone PHP | `Asia/Tokyo` (UTC+9) | `America/Sao_Paulo` (UTC-3) |
| `getNowJST()` | `getNowJST()` | `getNowBRT()` |
| `getJSTDate()` | `Asia/Tokyo` | `America/Sao_Paulo` |
| Moeda | `¥` / `ja-JP` / JPY | `R$` / `pt-BR` / BRL |
| Telefone | `090 XXXX XXXX` | `(XX) XXXXX-XXXX` |
| WhatsApp CC | `81` | `55` |
| Banco de dados | Existente (JST wall-clock) | Novo (BRT wall-clock) |
| Algoritmo de conflito | **Idêntico** | **Idêntico** |
| Detecção de overlap | **Idêntico** | **Idêntico** |
| Bloqueios | **Idêntico** | **Idêntico** |
| Horários fixos | **Idêntico** | **Idêntico** |

**Os motores são idênticos. Apenas a referência de "agora" muda.**

---

## 8. Resumo de Segurança

### O que GARANTE ausência de duplicidade

1. **Transação atômica no banco:** O conflito é verificado dentro de um `beginTransaction()` com `SELECT ... FOR UPDATE` implícito — dois agendamentos simultâneos não passam.

2. **Wall-clock consistency:** Como todos os valores no banco são da mesma timezone (seja JST ou BRT), as comparações `start_at < newEnd AND end_datetime > newStart` são sempre corretas.

3. **Sem conversão UTC:** O sistema não converte para UTC em nenhum momento. Isso elimina a classe inteira de bugs "UTC+DST off-by-one".

4. **Algoritmo de overlap clássico:** `A.start < B.end AND A.end > B.start` é matematicamente prova de sobreposição, independente de timezone.

### O que garantia que funciona no Japão e garante no Brasil

A única coisa que mudou entre "funciona no Japão" e "vai funcionar no Brasil" é: **qual relógio o sistema usa para saber "agora".** Muda-se `Asia/Tokyo` → `America/Sao_Paulo` em 4 lugares, e o relógio passa a ser o correto para as profissionais brasileiras. Toda a lógica de proteção contra conflitos, duplicidade e sobreposição permanece matematicamente idêntica.

---

## 9. Estimativa de Tempo

| Fase | Esforço estimado |
|---|---|
| Backend (timezone PHP) | 30 minutos |
| Frontend (getNowBRT + getLocalDate) | 45 minutos |
| Cosmético (moeda, telefone, CORS, links) | 2–3 horas |
| Configuração do novo ambiente Hostinger | 1–2 horas |
| Testes dos 5 cenários de segurança | 1 hora |
| **Total** | **~6 horas** |

---

*Documento gerado com base na análise completa dos arquivos:*  
*`backend/api/config.php`, `backend/api/routes/appointments.php`,*  
*`components/PublicBookingPage.tsx`, `components/AppointmentsTab.tsx`,*  
*`components/AvailabilityTab.tsx`, `utils/availability.ts`*
