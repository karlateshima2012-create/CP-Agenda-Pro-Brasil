#!/bin/bash
# setup-db.sh - Criação automática do Banco de Dados para CP Agenda Pro Brasil

echo "Verificando se o MySQL/MariaDB está instalado..."
if ! command -v mysql &> /dev/null
then
    echo "MySQL não encontrado. Instalando o MariaDB Server..."
    apt-get update
    apt-get install -y mariadb-server
fi

echo "Iniciando o serviço do banco de dados..."
systemctl start mariadb
systemctl enable mariadb

# Variáveis do Banco
DB_NAME="cpagendaprobr"
DB_USER="cpagenda_usr"
# Gerando uma senha forte aleatória
DB_PASS=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16 ; echo '')

echo "Criando o banco de dados $DB_NAME..."
mysql -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Criando o usuário $DB_USER e garantindo permissões..."
mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "========================================================="
echo "✅ BANCO DE DADOS CRIADO COM SUCESSO!"
echo "Anote estas credenciais (O Node.js vai precisar delas):"
echo "========================================================="
echo "Nome do DB: $DB_NAME"
echo "Usuário:    $DB_USER"
echo "Senha:      $DB_PASS"
echo "String URL: mysql://$DB_USER:$DB_PASS@localhost:3306/$DB_NAME"
echo "========================================================="
