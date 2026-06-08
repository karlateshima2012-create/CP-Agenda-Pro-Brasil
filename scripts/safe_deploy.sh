#!/bin/bash
# Script de Deploy Seguro para o CP Agenda Pro (Hostinger Compartilhado)

# A flag -e faz com que o script seja abortado imediatamente se qualquer erro ocorrer
set -e

echo "🚀 INICIANDO DEPLOY SEGURO PARA PRODUÇÃO..."

echo "[1/4] Compilando e verificando o código Frontend (Vite & TypeScript)..."
npm run build
echo "✅ Build Frontend verificado e gerado com sucesso! Nenhum erro crítico encontrado."

echo "[2/4] Verificando integridade dos arquivos..."
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ ERRO: A pasta dist/ não foi gerada corretamente ou está vazia!"
    exit 1
fi
echo "✅ Arquivos compilados validados."

echo "[3/4] Empacotando e enviando Frontend para a Hostinger..."
cd dist && zip -r ../dist.zip . > /dev/null && cd ..
./scripts/deploy_frontend.exp
echo "✅ Frontend enviado com sucesso."

echo "[4/4] Enviando Backend para a Hostinger..."
./scripts/deploy_backend.exp
echo "✅ Backend enviado com sucesso."

echo "🎉 DEPLOY FINALIZADO COM SUCESSO!"
