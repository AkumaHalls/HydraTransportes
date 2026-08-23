# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.4.0] — 2026-08-23

### Adicionado
- **frontend/js/app.js** — Campo "Dias do Serviço" no formulário de corrida para orçamentos multi-dia
- **backend/src/models/Corrida.js** — Novos campos: `distanciaIda`, `distanciaVolta`, `dias`
- **frontend/js/app.js** — Função `waitForElement()` para aguardar DOM com timeout

### Corrigido
- **frontend/js/app.js** — `navigateTo()` agora retorna Promise (antes era void)
- **frontend/js/app.js** — `verCorrida()` usa `await navigateTo()` + `await waitForElement()` em vez de `setTimeout(100ms)` que não esperava o DOM renderizar — dados do histórico agora aparecem ao clicar no olho
- **frontend/js/app.js** — `editarCorrida()` usa `await navigateTo()` + `await waitForElement()` + agora preenche todos os campos: origem, destino, cliente, serviço, dias (antes só preenchia paradas e valores)
- **backend/src/controllers/corridaController.js** — Cálculo de "ida e volta" com paradas agora faz **duas chamadas OSRM** (ida: origem→paradas→destino / volta: destino→paradas reverso→origem) em vez de simplesmente dobrar a distância — corrige cálculo que duplicava valor
- **backend/src/controllers/corrController.js** — Valor total agora multiplica por `dias` quando serviço tem duração multi-dia
- **backend/src/controllers/exportController.js** — PDF exibe distancia ida/volta separadas + campo dias
- **backend/src/controllers/exportController.js** — CSV inclui colunas distanciaIda, distanciaVolta, distanciaTotal, dias
- **backend/src/controllers/exportController.js** — Excel inclui colunas distanciaIda, distanciaVolta, distanciaTotal, dias
- **backend/src/controllers/exportController.js** — Relatório PDF exibe distancia ida/volta separadas
- **frontend/js/app.js** — Resultado do cálculo exibe ida/volta separadas + dias
- **frontend/js/app.js** — Histórico exibe distância total correta (ida+volta)
- **backend/src/controllers/corridaController.js** — Dashboard usa distanciaIda+distanciaVolta para cálculo de km total

## [1.3.3] - 2026-08-23

### Corrigido
- Autocomplete do frontend agora usa **Mapbox Geocoding** como provedor principal (encontra endereços que só existem no Mapbox/Google, ex: "R. Bernadete da Silveira Barbosa")
- Fallback automático para Nominatim/Photon quando Mapbox não encontra
- `isMapboxReady()` restaurada (acidentalmente removida)
- Função `fetchSuggestions` duplicada removida

## [1.3.2] - 2026-08-23

### Corrigido
- **CRÍTICO**: Removido `import.meta` que causava SyntaxError e impedia todo o JavaScript de carregar (menus, botões, nada funcionava)
- Token Mapbox agora é servido pelo backend via `/api/config` (compatível com Portainer env vars)
- Função `mapboxReverseGeocode` estava sendo chamada mas nunca definida (crash ao usar seletor de mapa)
- Autocomplete agora salva lat/lng ao selecionar sugestão (enviado ao backend para geocodificação precisa)
- Guards de segurança para mapas quando token não configurado
- Backend protege token contra sobrescrita via update de config

## [1.3.0] - 2026-08-23

### Adicionado
- Integração completa com **Mapbox** (substitui Nominatim/Photon/Leaflet)
- Autocomplete com Mapbox Geocoding API (busca endereços, CEPs, POIs, bairros)
- Geocodificação no backend via Mapbox (mais precisa no Brasil)
- Mapas interativos com Mapbox GL JS (substitui Leaflet)
- Seletor de local no mapa com Mapbox (modal fullscreen)
- Token via variável de ambiente (`MAPBOX_TOKEN`) com fallback
- Cache local de 7 dias para geocodificação (frontend + backend)

### Melhorado
- Precisão de endereços no Brasil (Mapbox tem cobertura superior ao OSM)
- Velocidade de busca (API otimizada + cache)
- UX: mapas mais bonitos, navegação suave, controles nativos
- Segurança: token em variável de ambiente, não hardcoded no git

### Corrigido
- Endereços que não existiam no OSM agora encontrados (ex: "R. Bernadete da Silveira Barbosa")
- Rate limiting eliminado (Mapbox free tier: 100k/mês)
- Inconsistência frontend/backend (mesma base de dados)

## [1.2.2] - 2026-08-23

### Adicionado
- Botão **"Selecionar no mapa"** ao lado dos campos de origem/destino
- Modal fullscreen com mapa interativo (Leaflet) para clicar e obter coordenadas exatas
- Geocodificação reversa automática ao clicar no mapa (converte lat/lng em nome do endereço)
- Backend aceita `origemLat`, `origemLng`, `destinoLat`, `destinoLng` vindos do frontend
- Funciona 100% para qualquer endereço, mesmo se não existir no OSM/Google Maps

### Melhorado
- Fluxo: digita endereço → se não encontra → clica "Selecionar no mapa" → clica no local exato → pronto
- Elimina dependência total de bases de dados de endereços externas

## [1.2.1] - 2026-08-23

### Adicionado
- Busca flexível de endereços: tenta variações automáticas (remove "R./Rua", "Av./Avenida", artigos "da/de/do/das/dos", números) quando busca exata falha
- Fallback sem restrição de país (`countrycodes`) se não encontrar no Brasil

### Melhorado
- Precisão: agora encontra "R. Bernadete da silveira barbosa" mesmo cadastrado no OSM como "Rua Dona Bernadete de Sousa"
- Robustez: 4 tentativas por endereço (original + 3 variações × 2 provedores × com/sem countrycodes)

### Corrigido
- Endereços com nomes populares diferentes do OSM agora são encontrados

## [1.2.0] - 2026-08-23

### Adicionado
- Sistema de cache local (7 dias) para geocodificação de endereços no frontend e backend
- Fallback automático entre provedores de geocodificação: Nominatim (OpenStreetMap) → Photon (Komoot)
- Parâmetros otimizados para buscas no Brasil (`countrycodes=br`, `accept-language=pt-BR`, `addressdetails=1`)
- Autocomplete mais inteligente: debounce reduzido (300ms), 8 resultados, ordenação por relevância
- Botão "Limpar Cache de Endereços" na página Configurações
- Limpeza automática do cache expirado a cada hora no backend

### Melhorado
- Precisão na busca de endereços brasileiros usando dois provedores OSM gratuitos
- Velocidade em buscas repetidas (instantâneo via cache)
- Resiliência: se um provedor falha, tenta o outro automaticamente
- UX do autocomplete: exibe nome do local em destaque + endereço completo em texto menor

### Corrigido
- Problema onde endereços válidos no Google Maps não eram encontrados no sistema
- Inconsistência entre geocodificação do frontend (autocomplete) e backend (cálculo de rota)
- Rate limiting do Nominatim (1 req/s) mitigado pelo cache compartilhado

## [1.1.0] - 2026-08-23

### Adicionado
- Sistema base de transportes com cálculo de corridas, clientes, serviços, motoristas
- Interface responsiva com Bootstrap 5 + Leaflet para mapas
- Geração de PDF (comprovante/orçamento) via pdfkit
- Exportação CSV/Excel/PDF do histórico
- Compartilhamento via WhatsApp
- PWA com service worker
- Docker support

### Melhorado
- Dashboard com gráficos Chart.js
- Tema claro/escuro
- Logo personalizada

## [1.0.0] - 2026-08-23

### Adicionado
- Versão inicial do Hydra Transportes