# Hydra Transportes Urgentes

Sistema completo de cálculo de fretes, entregas, carretos e corridas para motoristas autônomos.

## Tecnologias

- Node.js + Express.js
- MongoDB
- Bootstrap 5
- OpenStreetMap + Nominatim + OSRM (gratuitos, sem chave de API)
- Chart.js
- PWA (instalável em Android)
- PDFKit

## Estrutura

```
tele/
├── .env.example            # Placeholder das variáveis de ambiente
├── .dockerignore           # Arquivos ignorados pelo Docker
├── .gitignore              # Arquivos ignorados pelo Git
├── Dockerfile              # Imagem Docker da aplicação
├── docker-compose.yml      # Orquestração Docker
├── stack.yml               # Stack para Portainer
├── sensivel.txt            # Template com TODAS as variáveis do projeto
├── install.sh              # Script de instalação (Oracle Linux)
├── start.sh                # Script de inicialização manual
├── README.md
├── backend/
│   ├── package.json
│   ├── server.js           # Servidor Express
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       └── services/
└── frontend/
    ├── index.html          # SPA principal
    ├── manifest.json       # PWA manifest
    ├── sw.js               # Service Worker
    ├── css/style.css
    ├── js/app.js           # App completo
    └── icons/
```

## Configuração Rápida

### 1. Pré-requisitos

- Node.js 20+
- MongoDB (acesso ao servidor)

### 2. Variáveis de Ambiente

Renomeie `.env.example` para `.env` e preencha:

```env
MONGODB_URI=mongodb://usuario:senha@host:27017/hydra_transportes?authSource=admin
PORT=3000
NODE_ENV=production
```

**Importante:** O arquivo `sensivel.txt` contém a lista completa de todas as variáveis utilizadas pelo sistema. Use-o como checklist ao configurar um novo ambiente.

### 3. Instalar e Rodar

```bash
cd backend
npm install
node server.js
```

Acessar em: `http://localhost:3000`

---

## Deploy via Portainer

### Visão Geral

O projeto está preparado para deploy no Portainer utilizando Docker Compose.  
As credenciais e configurações sensíveis são injetadas via arquivo `.env`, que **nunca** é versionado.

### Passo a Passo

#### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/hydra_transportes-web.git
cd hydra_transportes-web
```

#### 2. Preencher as variáveis sensíveis

Abra o arquivo `sensivel.txt` e preencha todos os valores conforme seu ambiente.

#### 3. Criar o arquivo .env

```bash
cp sensivel.txt .env
# Edite o .env e remova os comentários/instruções, mantendo apenas:
# MONGODB_URI=...
# PORT=3000
# NODE_ENV=production
```

Ou simplesmente edite `.env.example` com os valores reais:

```bash
cp .env.example .env
# Preencha MONGODB_URI com sua string de conexão real
```

#### 4. Fazer deploy no Portainer

**Opção A — Via stack.yml (recomendado):**

1. Acesse o Portainer → **Stacks** → **Add stack**
2. Nome: `hydra_transportes-web`
3. Método: **Upload** ou **Web Editor**
4. Cole o conteúdo do arquivo `stack.yml`
5. Em **Environment variables**, adicione as variáveis do `.env` manualmente ou faça upload do arquivo
6. Clique em **Deploy the stack**

**Opção B — Via docker-compose.yml:**

1. Envie os arquivos para o servidor via SCP/Git
2. No Portainer, vá em **Stacks** → **Add stack**
3. Escolha **Upload** e selecione o `docker-compose.yml`
4. Faça upload também do `.env` ou adicione as variáveis manualmente
5. Clique em **Deploy the stack**

#### 5. Verificar

Após o deploy, o container será iniciado e a aplicação estará disponível em:

```
http://IP_DO_SERVIDOR:3000
```

Para verificar os logs:

```bash
docker logs hydra_transportes-web
```

### Healthcheck

O `stack.yml` inclui healthcheck configurado. No Portainer, é possível visualizar o status do container diretamente na interface.

### Atualização

Para atualizar a aplicação:

1. Faça pull do novo código
2. No Portainer, vá até o stack → **Recreate** ou force uma nova build
3. O container será recriado com a nova imagem

---

## Funcionalidades

- **Dashboard** — Estatísticas e gráficos de faturamento, corridas e quilometragem (Chart.js)
- **Nova Corrida** — Cálculo de fretes com mapa (Leaflet + OSM), distância real (OSRM) e tempo estimado
- **Histórico** — Pesquisa, filtros e exportação (CSV, Excel, PDF)
- **Clientes** — Cadastro de clientes frequentes com CRUD completo
- **Serviços** — Catálogo de serviços personalizável (7 padrão + customizados)
- **Configurações** — Dados do motorista, logo, cor, tema claro/escuro, valores
- **Comprovante PDF** — Recibo profissional com logo, dados e valores (PDFKit)
- **Compartilhamento WhatsApp** — Mensagem pronta com dados da corrida
- **PWA** — Instalável como aplicativo no Android

## API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/config | Obter configurações |
| PUT | /api/config | Atualizar configurações |
| GET | /api/clients | Listar clientes |
| GET | /api/clients/:id | Obter cliente |
| POST | /api/clients | Criar cliente |
| PUT | /api/clients/:id | Atualizar cliente |
| DELETE | /api/clients/:id | Excluir cliente |
| GET | /api/services | Listar serviços |
| POST | /api/services | Criar serviço |
| PUT | /api/services/:id | Atualizar serviço |
| DELETE | /api/services/:id | Excluir serviço |
| GET | /api/corridas | Listar corridas (com filtros) |
| GET | /api/corridas/dashboard | Dados do dashboard |
| POST | /api/corridas/calcular | Calcular nova corrida |
| GET | /api/corridas/:id | Obter corrida |
| PUT | /api/corridas/:id | Atualizar corrida |
| DELETE | /api/corridas/:id | Excluir corrida |
| GET | /api/export/comprovante/:id | PDF comprovante |
| GET | /api/export/csv | Exportar CSV |
| GET | /api/export/excel | Exportar Excel |
| GET | /api/export/pdf-relatorio | Exportar PDF relatório |
