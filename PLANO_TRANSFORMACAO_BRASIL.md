# Plano de Transformação — Motor de Agendamento para Operação Brasil

**Data:** 08/06/2026  
**Tipo:** Análise + Plano de Implementação  
**Escopo:** Fuso horário, formato de telefone, moeda e lógica de validação  
**Status:** Aguardando aprovação para execução  

---

## Resumo Executivo

O motor de agendamento atual foi construído e calibrado para operar no **Japão (JST, UTC+9)**. Para operar no Brasil, é necessário substituir 5 categorias de referências distribuídas em **6 arquivos** do projeto. Nenhuma mudança exige alteração de banco de dados, arquitetura ou fluxo de negócio — são adaptações de localização.

**Impacto estimado:** Baixo risco, mudanças cirúrgicas e localizadas.

---

## 1. Diagnóstico Completo — O Que Precisa Mudar

### 1.1 Inventário de Pontos de Mudança

| # | Arquivo | Linha(s) | Categoria | Descrição do Problema |
|---|---|---|---|---|
| 1 | `backend/api/config.php` | 60 | Timezone | `Asia/Tokyo` definido como timezone padrão do PHP |
| 2 | `backend/api/routes/appointments.php` | 47–48 | Timezone | `DateTimeZone('Asia/Tokyo')` na validação de "hoje" |
| 3 | `components/PublicBookingPage.tsx` | 102 | Timezone | `getNowJST()` usa `Asia/Tokyo` para calcular "agora" |
| 4 | `components/PublicBookingPage.tsx` | 64–70 | Telefone | `formatJapanesePhone` formata no padrão japonês |
| 5 | `components/PublicBookingPage.tsx` | 351–355 | Telefone | Validação exige 11 dígitos começando com `0` (padrão JP) |
| 6 | `components/PublicBookingPage.tsx` | 762–765 | Telefone | Placeholder `090 0000 0000` e `maxLength={13}` |
| 7 | `components/PublicBookingPage.tsx` | 538, 588 | Moeda | `¥ {price.toLocaleString()}` sem locale/moeda |
| 8 | `components/PublicBookingPage.tsx` | 800 | Moeda | `Intl.NumberFormat('ja-JP', { currency: 'JPY' })` |
| 9 | `components/AppointmentsTab.tsx` | 35–41 | Telefone | `normalizePhoneToE164JP` usa prefixo `81` (Japão) |
| 10 | `components/AppointmentsTab.tsx` | 43–52 | Timezone | `formatWhenJST` usa `Asia/Tokyo` para exibir datas |
| 11 | `constants.ts` | 3–16 | Telefone | `formatJapanPhone` formata no padrão japonês |
| 12 | `constants.ts` | 18–25 | Telefone | `normalizeForWhatsApp` adiciona prefixo `81` (JP) |
| 13 | `constants.ts` | 28–29 | Moeda | `DEFAULT_SERVICES` com preço `3000` (¥) |
| 14 | `constants.ts` | 51–52 | Timezone | `generateWhatsAppLink` usa `timeZone: 'Asia/Tokyo'` |

---

## 2. Categoria A — Fuso Horário

### Contexto Técnico

O sistema inteiro hoje age como se o "agora" fosse sempre horário japonês (JST, UTC+9). Isso afeta três comportamentos críticos:

1. **Validação de "hoje" no backend:** O sistema usa JST para decidir se uma data é "passada ou hoje" antes de salvar o agendamento.
2. **Geração de slots no frontend:** O calendário e os horários disponíveis são calculados com base no "agora" em JST.
3. **Exibição de datas para o profissional:** As mensagens de WhatsApp e os painéis mostram datas no fuso de Tóquio.

### O Fuso do Brasil

O Brasil possui quatro fusos oficiais. A escolha deve ser feita com base na região de operação:

| Fuso | Cidades Principais | Diferença UTC | Identificador IANA |
|---|---|---|---|
| **BRT** | São Paulo, Rio, BH, Curitiba | UTC-3 | `America/Sao_Paulo` |
| AMT | Manaus, Cuiabá, Campo Grande | UTC-4 | `America/Manaus` |
| ACT | Rio Branco | UTC-5 | `America/Rio_Branco` |
| FNT | Fernando de Noronha | UTC-2 | `America/Noronha` |

> **Recomendação:** Usar `America/Sao_Paulo` como padrão — cobre a maior parte do mercado brasileiro (SP, RJ, MG, PR, RS, SC, GO, DF, CE, BA, PE e outros).

> **Atenção — Horário de Verão:** O Brasil **suspendeu** o horário de verão em 2019 (Decreto 9.772/2019). O fuso `America/Sao_Paulo` está correto e não aplica DST atualmente.

---

### 2.1 Mudança: `backend/api/config.php` — Linha 60

**Problema:** Timezone padrão do PHP definido como Tokyo.

```php
// ANTES (linha 60):
date_default_timezone_set('Asia/Tokyo');
```

```php
// DEPOIS:
date_default_timezone_set('America/Sao_Paulo');
```

**Impacto:** Toda função de data/hora do PHP no backend passa a operar em BRT.  
**Risco:** Baixo — mudança de 1 linha, escopo bem delimitado.

---

### 2.2 Mudança: `backend/api/routes/appointments.php` — Linhas 47–48

**Problema:** A validação de "hoje" e "data passada" é feita criando um `DateTime` com fuso `Asia/Tokyo`.

```php
// ANTES (linhas 47–48):
$accountTz = new DateTimeZone('Asia/Tokyo'); // Assuming JST as per context
$nowJst = new DateTime('now', $accountTz);
$startJst = new DateTime($startStr, $accountTz);
```

```php
// DEPOIS:
$accountTz = new DateTimeZone('America/Sao_Paulo');
$nowBrt = new DateTime('now', $accountTz);
$startBrt = new DateTime($startStr, $accountTz);
```

> **Nota:** As variáveis `$nowJst` e `$startJst` usadas nas linhas seguintes (53–58) também precisam ser renomeadas para `$nowBrt` e `$startBrt` para manter consistência e evitar confusão futura.

**Impacto:** A regra de "não pode agendar hoje nem datas passadas" passa a ser comparada com o horário de Brasília.  
**Risco:** Médio — lógica de negócio crítica; requer teste após mudança.

---

### 2.3 Mudança: `components/PublicBookingPage.tsx` — Linha 102

**Problema:** A função `getNowJST()` retorna o momento atual convertido para Tokyo.

```typescript
// ANTES (linha 102):
const getNowJST = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
```

```typescript
// DEPOIS:
const getNowBRT = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
```

> **Nota:** Toda ocorrência de `getNowJST()` no arquivo (linhas 199, 280) deve ser substituída por `getNowBRT()`.

**Impacto:** O calendário passa a calcular "hoje" e o filtro de horários passados com base no horário de Brasília.  
**Risco:** Médio — central para a lógica de geração de slots.

---

### 2.4 Mudança: `components/AppointmentsTab.tsx` — Linhas 43–52

**Problema:** A função `formatWhenJST` formata datas usando `Asia/Tokyo`.

```typescript
// ANTES (linhas 43–52):
function formatWhenJST(startAt: string) {
  return new Date(startAt).toLocaleString('pt-BR', {
    timeZone: 'Asia/Tokyo',
    ...
  });
}
```

```typescript
// DEPOIS:
function formatWhenBRT(startAt: string) {
  return new Date(startAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

> **Nota:** A referência ao nome da função na linha 57 (`formatWhenJST(appt.startAt)`) também precisa ser atualizada para `formatWhenBRT(appt.startAt)`.

**Impacto:** As mensagens de WhatsApp geradas pelo profissional passarão a mostrar a data/hora correta em BRT.  
**Risco:** Baixo — apenas formatação visual.

---

### 2.5 Mudança: `constants.ts` — Linhas 51–52

**Problema:** `generateWhatsAppLink` usa `Asia/Tokyo` para formatar data e hora.

```typescript
// ANTES (linhas 51–52):
const date = new Date(appointment.startAt).toLocaleDateString('pt-BR', { timeZone: 'Asia/Tokyo' });
const time = new Date(appointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
```

```typescript
// DEPOIS:
const date = new Date(appointment.startAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const time = new Date(appointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
```

**Impacto:** Links de WhatsApp gerados pelo dashboard do profissional mostrarão datas em BRT.  
**Risco:** Baixo.

---

## 3. Categoria B — Formato de Telefone

### Contexto Técnico

O sistema possui **duas camadas** de lógica de telefone:

1. **Formatação visual** (o que o cliente vê enquanto digita)
2. **Normalização para WhatsApp** (prefixo do país para o link `wa.me`)

Ambas precisam mudar de padrão japonês para padrão brasileiro.

### Padrão Japonês (atual)
- **Formato:** `0XX XXXX XXXX` (11 dígitos, sempre começa com `0`)
- **WhatsApp:** Remove o `0` inicial, adiciona `81` → `81XXXXXXXXXX`
- **Validação:** Exatamente 11 dígitos

### Padrão Brasileiro (destino)
- **Celular:** `(DDD) 9XXXX-XXXX` → 11 dígitos
- **Fixo:** `(DDD) XXXX-XXXX` → 10 dígitos
- **WhatsApp:** Remove tudo que não é dígito, adiciona `55` → `55XXXXXXXXXXX`
- **Validação:** 10 ou 11 dígitos (fixo ou celular)

### Mapeamento de Formatos

| Tipo | Exemplo Digitado | Armazenado | WhatsApp |
|---|---|---|---|
| Celular (SP) | `(11) 91234-5678` | `11912345678` | `5511912345678` |
| Celular (RJ) | `(21) 98765-4321` | `21987654321` | `5521987654321` |
| Fixo (SP) | `(11) 3456-7890` | `1134567890` | `551134567890` |

---

### 3.1 Mudança: `constants.ts` — Linhas 3–25

**Problema:** `formatJapanPhone` e `normalizeForWhatsApp` usam padrão japonês.

```typescript
// ANTES:
export const formatJapanPhone = (value: string | undefined | null) => {
  if (!value || typeof value !== 'string') return '';
  const nums = value.replace(/\D/g, '');
  if (!nums) return '';
  if (nums.startsWith('0')) {
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)} ${nums.slice(3)}`;
    return `${nums.slice(0, 3)} ${nums.slice(3, 7)} ${nums.slice(7, 11)}`;
  } else {
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 2)} ${nums.slice(2)}`;
    return `${nums.slice(0, 2)} ${nums.slice(2, 6)} ${nums.slice(6, 10)}`;
  }
};

export const normalizeForWhatsApp = (phone: string | undefined | null) => {
  if (!phone || typeof phone !== 'string') return '';
  let nums = phone.replace(/\D/g, '');
  if (!nums) return '';
  if (nums.startsWith('0')) nums = nums.substring(1);
  if (!nums.startsWith('81')) nums = '81' + nums;
  return nums;
};
```

```typescript
// DEPOIS:
export const formatBrazilPhone = (value: string | undefined | null): string => {
  if (!value || typeof value !== 'string') return '';
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (!nums) return '';
  if (nums.length <= 2)  return `(${nums}`;
  if (nums.length <= 6)  return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
};

export const normalizeForWhatsApp = (phone: string | undefined | null): string => {
  if (!phone || typeof phone !== 'string') return '';
  let nums = phone.replace(/\D/g, '');
  if (!nums) return '';
  if (!nums.startsWith('55')) nums = '55' + nums;
  return nums;
};
```

> **Nota:** O nome `formatJapanPhone` deve ser substituído por `formatBrazilPhone` — verificar se há outras importações além de `constants.ts` e `PublicBookingPage.tsx`.

**Risco:** Médio — afeta formatação em dois componentes e a normalização do CRM.

---

### 3.2 Mudança: `components/PublicBookingPage.tsx` — Linhas 64–70 e 351–365

**Problema A:** `formatJapanesePhone` local formata no padrão japonês.

```typescript
// ANTES (linhas 64–70):
const formatJapanesePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3)  return digits;
  if (digits.length <= 7)  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
};
```

```typescript
// DEPOIS:
const formatBrazilPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2)  return `(${digits}`;
  if (digits.length <= 6)  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
```

**Problema B:** Validação exige exatamente 11 dígitos (padrão japonês).

```typescript
// ANTES (linhas 351–355):
if (rawPhoneDigits.length !== 11) {
  setErrorMsg('O telefone deve ter 11 dígitos no formato 0XX-XXXX-XXXX.');
  ...
}
```

```typescript
// DEPOIS:
if (rawPhoneDigits.length < 10 || rawPhoneDigits.length > 11) {
  setErrorMsg('O telefone deve ter 10 ou 11 dígitos. Ex: (11) 91234-5678');
  ...
}
```

**Problema C:** Placeholder e maxLength estão no padrão japonês.

```typescript
// ANTES (linhas 762–765):
maxLength={13}
placeholder="090 0000 0000"
```

```typescript
// DEPOIS:
maxLength={15}
placeholder="(11) 99999-9999"
```

**Problema D:** Contador de dígitos ainda referencia "11 dígitos".

```typescript
// ANTES (linhas 770–775):
{rawPhoneDigits.length}/11 dígitos
{rawPhoneDigits.length === 11 && ' ✓'}
```

```typescript
// DEPOIS:
{rawPhoneDigits.length}/11 dígitos
{(rawPhoneDigits.length === 10 || rawPhoneDigits.length === 11) && ' ✓'}
```

---

### 3.3 Mudança: `components/AppointmentsTab.tsx` — Linhas 35–41

**Problema:** `normalizePhoneToE164JP` usa prefixo japonês `81`.

```typescript
// ANTES (linhas 35–41):
function normalizePhoneToE164JP(phoneRaw: string) {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('81')) return digits;
  if (digits.startsWith('0')) return '81' + digits.slice(1);
  return digits;
}
```

```typescript
// DEPOIS:
function normalizePhoneToE164BR(phoneRaw: string) {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return '55' + digits;
}
```

> **Nota:** A chamada na linha 69 (`normalizePhoneToE164JP(phoneRaw)`) deve ser atualizada para `normalizePhoneToE164BR(phoneRaw)`.

---

## 4. Categoria C — Moeda

### Contexto Técnico

O sistema exibe preços de serviços em dois contextos:
1. Na página pública de booking (cards de serviço e tela de revisão)
2. Na barra de resumo inferior (total de serviços selecionados)

Atualmente, a moeda é Iene Japonês (¥ com `currency: 'JPY'`). A mudança para Real Brasileiro requer ajuste no símbolo, no locale de formatação e nos preços padrão.

---

### 4.1 Mudança: `components/PublicBookingPage.tsx` — Linhas 538, 588, 629, 800

**Problema A:** Preços exibidos com `¥` hardcoded.

```typescript
// ANTES (linhas 538 e 588):
<span>¥ {s.price.toLocaleString()}</span>
```

```typescript
// DEPOIS:
<span>R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
```

**Problema B:** Barra de resumo usa ¥ sem locale.

```typescript
// ANTES (linha 629):
<b>¥ {totalPrice.toLocaleString()}</b>
```

```typescript
// DEPOIS:
<b>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
```

**Problema C:** Tela de revisão (Etapa 4) usa `Intl.NumberFormat` com `ja-JP` e `JPY`.

```typescript
// ANTES (linha 800):
{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalPrice)}
```

```typescript
// DEPOIS:
{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
```

---

### 4.2 Mudança: `constants.ts` — Linha 28–29

**Problema:** Serviço padrão tem preço `3000` (valor em ienes).

```typescript
// ANTES:
export const DEFAULT_SERVICES: Service[] = [
  { id: 1, name: "Corte Masculino", description: "Corte moderno.", duration: 45, price: 3000 },
];
```

```typescript
// DEPOIS:
export const DEFAULT_SERVICES: Service[] = [
  { id: 1, name: "Corte Masculino", description: "Corte moderno.", duration: 45, price: 45 },
];
```

> **Decisão de negócio:** O preço padrão de R$ 45 é apenas um exemplo razoável para o mercado brasileiro. Deve ser ajustado conforme o segmento do cliente.

---

## 5. Resumo das Mudanças por Arquivo

### `backend/api/config.php`
| Linha | Mudança |
|---|---|
| 60 | `Asia/Tokyo` → `America/Sao_Paulo` |

### `backend/api/routes/appointments.php`
| Linha | Mudança |
|---|---|
| 47 | `new DateTimeZone('Asia/Tokyo')` → `America/Sao_Paulo` |
| 48 | Variável `$nowJst` → `$nowBrt` |
| 49 | Variável `$startJst` → `$startBrt` |
| 53–58 | Atualizar referências de variável `$nowJst/$startJst` → `$nowBrt/$startBrt` |

### `constants.ts`
| Linha | Mudança |
|---|---|
| 3–16 | Renomear `formatJapanPhone` → `formatBrazilPhone`, novo algoritmo de formato BR |
| 18–25 | `normalizeForWhatsApp`: prefixo `81` → `55` |
| 28–29 | Preço padrão `3000` → `45` |
| 51–52 | `timeZone: 'Asia/Tokyo'` → `America/Sao_Paulo` (2 ocorrências) |

### `components/PublicBookingPage.tsx`
| Linha | Mudança |
|---|---|
| 64–70 | `formatJapanesePhone` → `formatBrazilPhone` (novo algoritmo) |
| 72–73 | Chamada para `formatBrazilPhone` |
| 102 | `getNowJST` → `getNowBRT` + `Asia/Tokyo` → `America/Sao_Paulo` |
| 199, 280 | Chamadas `getNowJST()` → `getNowBRT()` |
| 351–355 | Validação 11 dígitos → 10 ou 11 dígitos + mensagem de erro |
| 538 | `¥ {price}` → `R$ {price.toLocaleString('pt-BR', ...)}` |
| 588 | `¥ {price}` → `R$ {price.toLocaleString('pt-BR', ...)}` |
| 629 | `¥ {totalPrice}` → `R$ {totalPrice.toLocaleString('pt-BR', ...)}` |
| 762 | `maxLength={13}` → `maxLength={15}` |
| 765 | `placeholder="090 0000 0000"` → `placeholder="(11) 99999-9999"` |
| 770–775 | Contador: aceitação em 10 ou 11 dígitos |
| 800 | `Intl.NumberFormat('ja-JP', JPY)` → `Intl.NumberFormat('pt-BR', BRL)` |

### `components/AppointmentsTab.tsx`
| Linha | Mudança |
|---|---|
| 35–41 | `normalizePhoneToE164JP` → `normalizePhoneToE164BR` (prefixo `81` → `55`) |
| 43–52 | `formatWhenJST` → `formatWhenBRT` + `Asia/Tokyo` → `America/Sao_Paulo` |
| 57, 69 | Chamadas com nomes antigos → nomes novos |

---

## 6. Análise de Risco

### Riscos por Mudança

| Mudança | Risco | Por Quê |
|---|---|---|
| Timezone no backend (`config.php`) | **Baixo** | 1 linha, sem lógica de negócio |
| Timezone na validação de agendamentos (`appointments.php`) | **Médio** | Regra de negócio crítica — define o que é "hoje" |
| `getNowBRT()` no frontend | **Médio** | Central para geração de slots e calendário |
| Formato de telefone | **Baixo** | Apenas formatação visual + normalização de prefixo |
| Validação de telefone (10 ou 11 dígitos) | **Baixo** | Mudança permissiva (aceita mais, não menos) |
| Moeda | **Baixo** | Apenas formatação e símbolo |
| Preço padrão | **Nulo** | Só afeta novos usuários sem serviços cadastrados |

### Efeitos Colaterais Conhecidos

1. **Dados históricos no banco:** Agendamentos já gravados estão com `start_at` em formato `YYYY-MM-DD HH:MM:SS` sem timezone. O backend trata esses como "naive datetime" — a mudança de timezone no PHP não reinterpreta dados existentes. Não há risco de corrupção.

2. **Clientes com telefone japonês já gravados no CRM:** A normalização nova (`55` em vez de `81`) não afeta dados já salvos — só muda como novos números são tratados. Links de WhatsApp para telefones com `81` continuarão funcionando normalmente via `wa.me/81...`.

3. **Diferença de horário entre JP e BR:** Com a mudança de JST (UTC+9) para BRT (UTC-3), há uma diferença de **12 horas** entre os dois ambientes. Se o sistema estiver ativo em produção durante a migração, a "janela" do dia atual muda. Recomenda-se executar a mudança fora do horário de pico.

---

## 7. Plano de Execução

### Fase 1 — Backend (Sem Impacto Visual)
1. Alterar `backend/api/config.php` linha 60
2. Alterar `backend/api/routes/appointments.php` linhas 47–58
3. Testar: Tentar criar agendamento para hoje → deve retornar erro
4. Testar: Tentar criar agendamento para amanhã → deve funcionar

### Fase 2 — Frontend: Telefone
5. Alterar `constants.ts` linhas 3–25 (funções de telefone + WhatsApp)
6. Alterar `components/PublicBookingPage.tsx` (função, placeholder, validação)
7. Alterar `components/AppointmentsTab.tsx` (normalização + links WhatsApp)
8. Testar: Digitar telefone na tela de booking → deve formatar `(11) 9XXXX-XXXX`
9. Testar: Confirmar agendamento → telefone gravado no banco deve ter 11 dígitos sem formatação
10. Testar: Link WhatsApp no dashboard → deve abrir `wa.me/55XXXXXXXXXXX`

### Fase 3 — Frontend: Timezone e Moeda
11. Alterar `constants.ts` linhas 51–52 (WhatsApp link)
12. Alterar `components/PublicBookingPage.tsx` (timezone, moeda)
13. Alterar `components/AppointmentsTab.tsx` (formatação de datas)
14. Testar: Calendário mostra "hoje" corretamente em BRT
15. Testar: Preços exibidos com `R$`
16. Testar: Mensagens WhatsApp têm data/hora correta em BRT

### Fase 4 — Validação Final
17. Fluxo completo de booking público (5 etapas)
18. Fluxo de confirmação/rejeição pelo profissional
19. Links de WhatsApp funcionais
20. Verificar que dados existentes no banco não foram afetados

---

## 8. Checklist de Testes Pós-Implementação

```
TIMEZONE
[ ] Calendário marca "hoje" como indisponível usando horário de Brasília
[ ] Criar agendamento para hoje retorna erro de "1 dia de antecedência"
[ ] Criar agendamento para data passada retorna erro
[ ] Slots de horário do dia atual são filtrados corretamente (BRT)
[ ] Datas exibidas no dashboard do profissional estão em BRT
[ ] Mensagens WhatsApp têm data/hora em horário de Brasília

TELEFONE
[ ] Campo de telefone formata como (DDD) XXXXX-XXXX enquanto digita
[ ] 10 dígitos (fixo) são aceitos como válidos
[ ] 11 dígitos (celular) são aceitos como válidos
[ ] Menos de 10 dígitos são rejeitados com mensagem clara
[ ] Telefone salvo no banco sem formatação (só dígitos)
[ ] Link WhatsApp usa prefixo 55 (Brasil)
[ ] wa.me/55XXXXXXXXXXX abre corretamente no WhatsApp

MOEDA
[ ] Serviços exibem preço com R$
[ ] Total de serviços selecionados exibe R$
[ ] Tela de revisão (Etapa 4) exibe R$ com centavos
[ ] Nenhum ¥ residual na interface

DADOS EXISTENTES
[ ] Agendamentos anteriores não foram afetados
[ ] CRM de clientes não foi afetado
[ ] Telefones JP já gravados continuam exibindo sem erro
```

---

## 9. Decisões que Precisam de Confirmação

Antes da execução, confirme:

| Decisão | Opções | Recomendação |
|---|---|---|
| Timezone principal | `America/Sao_Paulo` / `America/Manaus` / outro | `America/Sao_Paulo` — cobre a maioria do mercado |
| Aceitar fixo (10 dígitos) | Sim / Não | Sim — flexibilidade para o cliente final |
| Preço padrão em R$ | Livre | R$ 45,00 como exemplo inicial |
| Migrar telefones JP existentes no CRM | Manter como está / Converter | Manter como está — sem risco e sem perda |

---

*Documento preparado para análise e aprovação de execução.*  
*Projeto: CP Agenda Pro Brasil | Data: 08/06/2026*
