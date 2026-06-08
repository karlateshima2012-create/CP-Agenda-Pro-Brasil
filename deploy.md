# Guia Definitivo de Deploy - CP Agenda Pro (Hostinger Compartilhado)

Este documento documenta toda a infraestrutura e o processo de Deploy da aplicação CP Agenda Pro.

## 🏗️ 1. Arquitetura do Projeto
- **Frontend:** React + Vite (Single Page Application).
- **Backend:** PHP nativo servindo rotas da API.
- **Banco de Dados:** MySQL (Hostinger).
- **Hospedagem:** Hostinger Compartilhado (hPanel).
- **CI/CD:** GitHub Actions configurado, porém com limitações de Firewall da Hostinger.

---

## 🤖 2. Deploy Automático (GitHub Actions)

O repositório possui uma rotina de deploy no GitHub Actions (`.github/workflows/deploy.yml`).
O pipeline faz o build do projeto e as verificações (PHPStan). 

### 🛡️ Bloqueio de Firewall da Hostinger (Erro de Timeout)
Como a Hostinger Compartilhada bloqueia acessos SSH oriundos de grandes data centers (como os da Azure, usados pelo GitHub) para proteção contra DDoS, **o passo de envio via SCP/SSH no GitHub Actions quase sempre falhará com erro de `Timed Out`**.

**Solução Aplicada:**
Foi adicionado `continue-on-error: true` nas etapas de SSH do arquivo `.github/workflows/deploy.yml`. Dessa forma:
1. O GitHub sempre registra o Build da versão (ficando com o ✅ verde), guardando o histórico.
2. Não precisamos nos preocupar com o erro de Timeout vermelho bloqueando a pipeline.
3. O **Deploy real** é feito localmente através do script de segurança.

---

## 🛠️ 3. Fluxo de Publicação e Camada de Segurança Local

Sempre que quisermos publicar uma alteração em produção (e devido ao bloqueio da Hostinger ao GitHub), fazemos o deploy a partir do ambiente local (onde a Hostinger libera o IP residencial/do escritório livremente).

Para garantir que nenhum erro quebre a aplicação em produção, criamos o script `scripts/safe_deploy.sh`.

### 🛡️ O Script de Segurança (`safe_deploy.sh`)
Este script automatiza o envio com 3 camadas de segurança:
1. **Validação de Sintaxe (`set -e`)**: O processo para imediatamente se qualquer comando falhar.
2. **Porteiro Vite (`npm run build`)**: Antes de enviar, o código é compilado. Se houver qualquer tag não fechada, variável incorreta ou erro no React, o build falhará e **nada será enviado para a nuvem**, protegendo a produção.
3. **Validação de Integridade**: Verifica se a pasta `dist` não está vazia e foi montada com sucesso antes de substituir a versão da Hostinger.

### Como Executar o Deploy:
No terminal da sua máquina, basta rodar:
```bash
./scripts/safe_deploy.sh
```
O script fará o build seguro, compactará a aplicação e rodará a conexão `expect` para atualizar instantaneamente tanto o Front-end quanto o Back-end da Hostinger.
