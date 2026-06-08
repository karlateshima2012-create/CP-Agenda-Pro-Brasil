# Configuração RLS - CP Agenda Pro

## 📋 Políticas Implementadas

### Tabela `profiles`
- **SELECT**: Usuário vê apenas próprio perfil
- **EXCEÇÃO**: Admin (`suporte@creativeprintjp.com`) vê todos

### Tabela `services`
- **SELECT**: Público pode ver todos (para agendamento)

### Tabela `availability`
- **SELECT**: Público pode ver todos

### Tabela `appointments`
- **SELECT**: Usuário vê apenas próprios agendamentos
- **EXCEÇÃO**: Admin vê todos

### Tabela `public_busy_slots`
- **SELECT**: Público pode ver (para mostrar horários ocupados)

## 🔧 Como Testar

```bash
# Teste básico de RLS
npm run test:rls

# Teste completo de integração
npm run test:integration