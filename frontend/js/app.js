const API = '/api';
let currentPage = 'dashboard';
let configCache = null;
let dashboardCharts = {};

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.role = 'alert';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

async function api(method, path, data = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

async function loadConfig() {
  configCache = await api('GET', '/config');
  return configCache;
}

function formatMoney(v) {
  return 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Navigation
document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(el.dataset.page);
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('show');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});

document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('show');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('sidebar').classList.remove('show');
  document.getElementById('sidebarOverlay').classList.remove('show');

  const pages = {
    dashboard: renderDashboard,
    corridas: renderCorridas,
    historico: renderHistorico,
    clientes: renderClientes,
    servicos: renderServicos,
    config: renderConfig
  };
  if (pages[page]) pages[page]();
}

// ====== DASHBOARD ======
async function renderDashboard() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div></div>`;
  try {
    const [data, config] = await Promise.all([api('GET', '/corridas/dashboard'), loadConfig()]);
    const cor = config?.personalizacao?.corPrincipal || '#0d6efd';
    el.style.setProperty('--primary', cor);

    el.innerHTML = `
      <h4 class="page-title"><i class="bi bi-speedometer2"></i> Dashboard</h4>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-truck"></i></div>
            <div class="value">${data.totalCorridas}</div>
            <div class="label">Total de Corridas</div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-cash-coin"></i></div>
            <div class="value">${formatMoney(data.totalFaturado)}</div>
            <div class="label">Total Faturado</div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-calendar-month"></i></div>
            <div class="value">${formatMoney(data.faturadoMes)}</div>
            <div class="label">Faturamento do Mês</div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-calendar-day"></i></div>
            <div class="value">${formatMoney(data.faturadoDia)}</div>
            <div class="label">Faturamento do Dia</div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-signpost-2"></i></div>
            <div class="value">${data.kmTotal} km</div>
            <div class="label">Quilometragem Total</div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card card-dashboard stat-card" style="background:linear-gradient(135deg,${cor},${cor}aa)">
            <div class="icon"><i class="bi bi-people"></i></div>
            <div class="value">${data.totalClientes}</div>
            <div class="label">Clientes</div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-4"><div class="card p-3"><h6>Faturamento por Mês</h6><div class="chart-container"><canvas id="chartFaturamento"></canvas></div></div></div>
        <div class="col-md-4"><div class="card p-3"><h6>Corridas por Mês</h6><div class="chart-container"><canvas id="chartCorridas"></canvas></div></div></div>
        <div class="col-md-4"><div class="card p-3"><h6>KM por Mês</h6><div class="chart-container"><canvas id="chartKm"></canvas></div></div></div>
      </div>
    `;

    Object.values(dashboardCharts).forEach(c => c?.destroy());
    dashboardCharts = {};
    const labels = data.graficos.labels;

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    };

    dashboardCharts.faturamento = new Chart(document.getElementById('chartFaturamento'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Faturamento', data: data.graficos.faturamento, backgroundColor: cor }] },
      options: commonOpts
    });
    dashboardCharts.corridas = new Chart(document.getElementById('chartCorridas'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Corridas', data: data.graficos.corridas, backgroundColor: '#28a745' }] },
      options: commonOpts
    });
    dashboardCharts.km = new Chart(document.getElementById('chartKm'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'KM', data: data.graficos.km, backgroundColor: '#ffc107' }] },
      options: commonOpts
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro ao carregar dashboard: ${escapeHtml(err.message)}</div>`;
  }
}

// ====== CORRIDAS (Nova Corrida) ======
async function renderCorridas() {
  const el = document.getElementById('pageContent');
  try {
    const [config, clients, services] = await Promise.all([
      loadConfig(), api('GET', '/clients'), api('GET', '/services')
    ]);

    el.innerHTML = `
      <h4 class="page-title"><i class="bi bi-plus-circle"></i> Nova Corrida</h4>
      <div class="card p-3">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Cliente</label>
            <select class="form-select" id="corridaCliente">
              <option value="">Sem cliente</option>
              ${clients.map(c => `<option value="${escapeHtml(c.whatsapp || c.telefone)}" data-id="${c._id}" data-nome="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Serviço</label>
            <select class="form-select" id="corridaServico">
              ${services.map(s => `<option value="${escapeHtml(s.nome)}" data-id="${s._id}" data-taxa="${s.taxaFixaPadrao || 0}">${escapeHtml(s.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Origem</label>
            <input class="form-control" id="corridaOrigem" placeholder="Digite o endereço de origem">
            <div id="origemPreview" class="mt-1"></div>
            <div id="origemMap" class="map-container mt-1" style="height:150px;display:none"></div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Destino</label>
            <input class="form-control" id="corridaDestino" placeholder="Digite o endereço de destino">
            <div id="destinoPreview" class="mt-1"></div>
            <div id="destinoMap" class="map-container mt-1" style="height:150px;display:none"></div>
          </div>
          <div class="col-md-6">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="corridaIdaVolta">
              <label class="form-check-label">Ida e Volta</label>
            </div>
          </div>
        </div>
        <hr>
        <div class="row g-3">
          <div class="col-6 col-md-3">
            <label class="form-label">Pedágio (R$)</label>
            <input class="form-control" id="corridaPedagio" type="number" step="0.01" value="${config.valores?.valorPadraoPedagio || 0}">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Espera (R$)</label>
            <input class="form-control" id="corridaEspera" type="number" step="0.01" value="0">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Ajudante (R$)</label>
            <input class="form-control" id="corridaAjudante" type="number" step="0.01" value="${config.valores?.valorAjudante || 0}">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Acréscimos (R$)</label>
            <input class="form-control" id="corridaAcrescimos" type="number" step="0.01" value="0">
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Descontos (R$)</label>
            <input class="form-control" id="corridaDescontos" type="number" step="0.01" value="0">
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Observações</label>
            <textarea class="form-control" id="corridaObs" rows="1"></textarea>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary btn-lg w-100" id="btnCalcular">
            <i class="bi bi-calculator"></i> Calcular
          </button>
        </div>
      </div>
      <div id="resultadoCorrida" class="d-none"></div>
    `;

    document.getElementById('btnCalcular').addEventListener('click', calcularCorrida);

    let origTimeout, destTimeout;
    document.getElementById('corridaOrigem').addEventListener('input', (e) => {
      clearTimeout(origTimeout);
      if (e.target.value.length < 5) { document.getElementById('origemMap').style.display = 'none'; document.getElementById('origemPreview').innerHTML = ''; return; }
      origTimeout = setTimeout(() => previewAddress(e.target.value, 'origem'), 1000);
    });
    document.getElementById('corridaDestino').addEventListener('input', (e) => {
      clearTimeout(destTimeout);
      if (e.target.value.length < 5) { document.getElementById('destinoMap').style.display = 'none'; document.getElementById('destinoPreview').innerHTML = ''; return; }
      destTimeout = setTimeout(() => previewAddress(e.target.value, 'destino'), 1000);
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

let previewMaps = {};

async function previewAddress(address, type) {
  const mapId = type + 'Map';
  const previewId = type + 'Preview';
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=pt`, {
      headers: { 'User-Agent': 'HydraTransportes/1.0' }
    });
    const data = await res.json();
    if (!data.length) {
      document.getElementById(previewId).innerHTML = '<small class="text-danger">Endereço não encontrado</small>';
      document.getElementById(mapId).style.display = 'none';
      return;
    }
    const loc = data[0];
    document.getElementById(previewId).innerHTML = `<small class="text-success"><i class="bi bi-check-circle"></i> ${escapeHtml(loc.display_name.split(',')[0])}</small>`;

    const mapEl = document.getElementById(mapId);
    mapEl.style.display = 'block';
    if (previewMaps[type]) { previewMaps[type].remove(); }
    previewMaps[type] = L.map(mapId).setView([loc.lat, loc.lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(previewMaps[type]);
    L.marker([loc.lat, loc.lon]).addTo(previewMaps[type]).bindPopup(type === 'origem' ? 'Origem' : 'Destino');
    setTimeout(() => previewMaps[type]?.invalidateSize(), 200);
  } catch (e) {
    document.getElementById(previewId).innerHTML = '<small class="text-muted">Erro ao buscar endereço</small>';
  }
}

let ultimaCorrida = null;

async function calcularCorrida() {
  const data = {
    cliente: document.getElementById('corridaCliente').selectedOptions[0]?.dataset?.nome || '',
    clienteId: document.getElementById('corridaCliente').selectedOptions[0]?.dataset?.id || null,
    servico: document.getElementById('corridaServico').value,
    servicoId: document.getElementById('corridaServico').selectedOptions[0]?.dataset?.id || null,
    origem: document.getElementById('corridaOrigem').value,
    destino: document.getElementById('corridaDestino').value,
    idaEVolta: document.getElementById('corridaIdaVolta').checked,
    pedagio: parseFloat(document.getElementById('corridaPedagio').value) || 0,
    espera: parseFloat(document.getElementById('corridaEspera').value) || 0,
    ajudante: parseFloat(document.getElementById('corridaAjudante').value) || 0,
    acrescimos: parseFloat(document.getElementById('corridaAcrescimos').value) || 0,
    descontos: parseFloat(document.getElementById('corridaDescontos').value) || 0,
    observacoes: document.getElementById('corridaObs').value
  };

  if (!data.origem || !data.destino) {
    showToast('Preencha origem e destino', 'warning');
    return;
  }

  showLoading(true);
  try {
    const result = await api('POST', '/corridas/calcular', data);
    ultimaCorrida = result;
    const distFinal = result.distanciaFinal || result.distanciaKm;
    const cor = configCache?.personalizacao?.corPrincipal || '#0d6efd';

    const div = document.getElementById('resultadoCorrida');
    div.classList.remove('d-none');
    div.innerHTML = `
      <div class="card p-3 mt-3">
        <h5><i class="bi bi-check-circle" style="color:${cor}"></i> Resultado do Cálculo</h5>
        <div class="result-box">
          <div class="result-item"><span>Distância</span><strong>${result.distanciaKm} km</strong></div>
          <div class="result-item"><span>Distância Final${result.idaEVolta ? ' (ida e volta)' : ''}</span><strong>${distFinal} km</strong></div>
          <div class="result-item"><span>Tempo Estimado</span><strong>${result.tempoEstimado}</strong></div>
          <div class="result-item"><span>Valor por km</span><strong>${formatMoney(result.valorPorKm)}</strong></div>
          <div class="result-item"><span>Taxa Fixa</span><strong>${formatMoney(result.taxaFixa)}</strong></div>
          ${result.pedagio > 0 ? `<div class="result-item"><span>Pedágio</span><strong>${formatMoney(result.pedagio)}</strong></div>` : ''}
          ${result.espera > 0 ? `<div class="result-item"><span>Espera</span><strong>${formatMoney(result.espera)}</strong></div>` : ''}
          ${result.ajudante > 0 ? `<div class="result-item"><span>Ajudante</span><strong>${formatMoney(result.ajudante)}</strong></div>` : ''}
          ${result.acrescimos > 0 ? `<div class="result-item"><span>Acréscimos</span><strong>${formatMoney(result.acrescimos)}</strong></div>` : ''}
          ${result.descontos > 0 ? `<div class="result-item"><span>Descontos</span><strong>-${formatMoney(result.descontos)}</strong></div>` : ''}
          <div class="result-item total"><span>Valor Total</span><strong>${formatMoney(result.valorTotal)}</strong></div>
        </div>
        <div class="mt-3">
          <div id="resultMap" class="map-container mb-3"></div>
        </div>
        <div class="mt-2 mb-2">
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="tipoPdf" id="tipoComprovante" value="comprovante" checked>
            <label class="form-check-label" for="tipoComprovante">Comprovante</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="tipoPdf" id="tipoOrcamento" value="orcamento">
            <label class="form-check-label" for="tipoOrcamento">Orçamento</label>
          </div>
        </div>
        <div class="d-grid gap-2 d-md-flex">
          <button class="btn btn-outline-primary flex-fill" onclick="visualizarComprovante('${result._id}')">
            <i class="bi bi-eye"></i> Visualizar
          </button>
          <button class="btn btn-primary flex-fill" onclick="baixarPDF('${result._id}')">
            <i class="bi bi-filetype-pdf"></i> Baixar PDF
          </button>
          <button class="btn whatsapp-btn flex-fill" onclick="compartilharWhatsApp('${result._id}')">
            <i class="bi bi-whatsapp"></i> WhatsApp
          </button>
        </div>
      </div>
    `;

    initResultMap(result);
    showToast('Cálculo realizado com sucesso!');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    showLoading(false);
  }
}

function initResultMap(result) {
  if (!result.rotaGeoJSON) return;
  const map = L.map('resultMap').setView([result.origemLat, result.origemLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  L.geoJSON(result.rotaGeoJSON, {
    style: { color: '#0d6efd', weight: 4 }
  }).addTo(map);

  L.marker([result.origemLat, result.origemLng]).addTo(map).bindPopup('Origem');
  L.marker([result.destinoLat, result.destinoLng]).addTo(map).bindPopup('Destino');

  const bounds = L.geoJSON(result.rotaGeoJSON).getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
}

function visualizarComprovante(id) {
  const tipo = document.querySelector('input[name="tipoPdf"]:checked')?.value || 'comprovante';
  window.open(`/api/export/comprovante/${id}?tipo=${tipo}`, '_blank');
}

function baixarPDF(id) {
  const tipo = document.querySelector('input[name="tipoPdf"]:checked')?.value || 'comprovante';
  const a = document.createElement('a');
  a.href = `/api/export/comprovante/${id}?tipo=${tipo}`;
  a.download = `${tipo}_${id}.pdf`;
  a.click();
}

function compartilharWhatsApp(id) {
  const c = ultimaCorrida;
  if (!c) return;
  const config = configCache?.motorista || {};
  const msg = `Olá!%0A%0ASegue o comprovante do serviço realizado.%0A%0ACliente: ${encodeURIComponent(c.cliente || 'N/A')}%0AServiço: ${encodeURIComponent(c.servico || 'N/A')}%0AOrigem: ${encodeURIComponent(c.origem)}%0ADestino: ${encodeURIComponent(c.destino)}%0ADistância: ${c.distanciaKm} km%0ATempo estimado: ${c.tempoEstimado}%0AValor Total: ${formatMoney(c.valorTotal)}%0A%0AMotorista: ${encodeURIComponent(config.nome || 'Motorista')}%0ATelefone: ${config.telefone || ''}`;
  const url = `https://wa.me/${config.whatsapp || ''}?text=${msg}`;
  window.open(url, '_blank');
}

// ====== HISTÓRICO ======
async function renderHistorico() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `
    <h4 class="page-title"><i class="bi bi-clock-history"></i> Histórico</h4>
    <div class="card p-3">
      <div class="filter-bar">
        <input class="form-control" id="histSearch" placeholder="Pesquisar...">
        <input class="form-control" id="histCliente" placeholder="Filtrar cliente">
        <input class="form-control" id="histServico" placeholder="Filtrar serviço">
        <input class="form-control" id="histDataInicio" placeholder="Data início" data-input>
        <input class="form-control" id="histDataFim" placeholder="Data fim" data-input>
        <button class="btn btn-primary" id="histFiltrar"><i class="bi bi-search"></i></button>
      </div>
      <div class="btn-group mb-3 flex-wrap">
        <button class="btn btn-sm btn-outline-secondary export-btn" data-period="dia">Dia</button>
        <button class="btn btn-sm btn-outline-secondary export-btn" data-period="semana">Semana</button>
        <button class="btn btn-sm btn-outline-secondary export-btn" data-period="mes">Mês</button>
        <button class="btn btn-sm btn-outline-secondary export-btn" data-period="ano">Ano</button>
        <button class="btn btn-sm btn-outline-secondary export-btn" data-period="personalizado" id="exportPersonalizado">Personalizado</button>
        <div class="btn-group ms-2">
          <button class="btn btn-sm btn-success" onclick="exportarCSV()"><i class="bi bi-filetype-csv"></i> CSV</button>
          <button class="btn btn-sm btn-success" onclick="exportarExcel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
          <button class="btn btn-sm btn-danger" onclick="exportarPDF()"><i class="bi bi-filetype-pdf"></i> PDF</button>
        </div>
      </div>
      <div id="historicoList"></div>
    </div>
  `;

  flatpickr('#histDataInicio', { locale: 'pt', dateFormat: 'Y-m-d' });
  flatpickr('#histDataFim', { locale: 'pt', dateFormat: 'Y-m-d' });

  document.getElementById('histFiltrar').addEventListener('click', loadHistorico);
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.dataset.period;
      const now = new Date();
      let inicio = '', fim = '';
      if (period === 'dia') { inicio = now.toISOString().slice(0,10); fim = inicio; }
      else if (period === 'semana') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        inicio = d.toISOString().slice(0,10); fim = now.toISOString().slice(0,10);
      } else if (period === 'mes') {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
        fim = now.toISOString().slice(0,10);
      } else if (period === 'ano') {
        inicio = `${now.getFullYear()}-01-01`;
        fim = now.toISOString().slice(0,10);
      }
      document.getElementById('histDataInicio').value = inicio;
      document.getElementById('histDataFim').value = fim;
    });
  });

  loadHistorico();
}

async function loadHistorico() {
  const el = document.getElementById('historicoList');
  showLoading(true);
  try {
    const params = new URLSearchParams();
    const search = document.getElementById('histSearch').value;
    const cliente = document.getElementById('histCliente').value;
    const servico = document.getElementById('histServico').value;
    const dataInicio = document.getElementById('histDataInicio').value;
    const dataFim = document.getElementById('histDataFim').value;
    if (search) params.set('search', search);
    if (cliente) params.set('cliente', cliente);
    if (servico) params.set('servico', servico);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);

    const data = await api('GET', `/corridas?${params}`);
    const list = data.corridas;

    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Nenhuma corrida encontrada</p></div>';
      return;
    }

    el.innerHTML = `<div class="table-responsive"><table class="table table-sm">
      <thead><tr>
        <th>Cliente</th><th>Serviço</th><th>Data</th><th>Distância</th><th>Valor</th><th>Ações</th>
      </tr></thead><tbody>
      ${list.map(c => `<tr>
        <td>${escapeHtml(c.cliente || '-')}</td>
        <td>${escapeHtml(c.servico || '-')}</td>
        <td>${formatDate(c.createdAt)}</td>
        <td>${c.distanciaKm} km</td>
        <td>${formatMoney(c.valorTotal)}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-outline-primary" onclick="verCorrida('${c._id}')"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="editarCorrida('${c._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirCorrida('${c._id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  } finally {
    showLoading(false);
  }
}

async function verCorrida(id) {
  const c = await api('GET', `/corridas/${id}`);
  navigateTo('corridas');
  setTimeout(() => {
    const div = document.getElementById('resultadoCorrida');
    if (div) {
      ultimaCorrida = c;
      const distFinal = (c.idaEVolta ? c.distanciaKm * 2 : c.distanciaKm);
      div.classList.remove('d-none');
      div.innerHTML = `
        <div class="card p-3 mt-3">
          <h5>Detalhes da Corrida</h5>
          <div class="result-box">
            <div class="result-item"><span>Cliente</span><strong>${escapeHtml(c.cliente || 'N/A')}</strong></div>
            <div class="result-item"><span>Serviço</span><strong>${escapeHtml(c.servico || 'N/A')}</strong></div>
            <div class="result-item"><span>Origem</span><strong>${escapeHtml(c.origem)}</strong></div>
            <div class="result-item"><span>Destino</span><strong>${escapeHtml(c.destino)}</strong></div>
            <div class="result-item"><span>Distância</span><strong>${c.distanciaKm} km</strong></div>
            <div class="result-item"><span>Tempo</span><strong>${c.tempoEstimado}</strong></div>
            <div class="result-item"><span>Valor por km</span><strong>${formatMoney(c.valorPorKm)}</strong></div>
            <div class="result-item total"><span>Valor Total</span><strong>${formatMoney(c.valorTotal)}</strong></div>
          </div>
          <div id="resultMap" class="map-container mb-3"></div>
          <div class="d-grid gap-2 d-md-flex">
            <button class="btn btn-primary flex-fill" onclick="baixarPDF('${c._id}')"><i class="bi bi-filetype-pdf"></i> PDF</button>
            <button class="btn whatsapp-btn flex-fill" onclick="compartilharWhatsApp('${c._id}')"><i class="bi bi-whatsapp"></i> WhatsApp</button>
          </div>
        </div>
      `;
      if (c.rotaGeoJSON) initResultMap(c);
    }
  }, 100);
}

async function editarCorrida(id) {
  const c = await api('GET', `/corridas/${id}`);
  navigateTo('corridas');
  setTimeout(() => {
    const sel = document.getElementById('corridaServico');
    document.getElementById('corridaOrigem').value = c.origem || '';
    document.getElementById('corridaDestino').value = c.destino || '';
    document.getElementById('corridaIdaVolta').checked = c.idaEVolta || false;
    document.getElementById('corridaPedagio').value = c.pedagio || 0;
    document.getElementById('corridaEspera').value = c.espera || 0;
    document.getElementById('corridaAjudante').value = c.ajudante || 0;
    document.getElementById('corridaAcrescimos').value = c.acrescimos || 0;
    document.getElementById('corridaDescontos').value = c.descontos || 0;
    document.getElementById('corridaObs').value = c.observacoes || '';
  }, 100);
}

async function excluirCorrida(id) {
  if (!confirm('Excluir esta corrida?')) return;
  try {
    await api('DELETE', `/corridas/${id}`);
    showToast('Corrida excluída');
    loadHistorico();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function exportarCSV() {
  const params = getExportParams();
  window.open(`/api/export/csv?${params}`, '_blank');
}

function exportarExcel() {
  const params = getExportParams();
  window.open(`/api/export/excel?${params}`, '_blank');
}

function exportarPDF() {
  const params = getExportParams();
  window.open(`/api/export/pdf-relatorio?${params}`, '_blank');
}

function getExportParams() {
  const p = new URLSearchParams();
  const di = document.getElementById('histDataInicio')?.value;
  const df = document.getElementById('histDataFim')?.value;
  if (di) p.set('dataInicio', di);
  if (df) p.set('dataFim', df);
  return p.toString();
}

// ====== CLIENTES ======
async function renderClientes() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `
    <h4 class="page-title"><i class="bi bi-people"></i> Clientes</h4>
    <div class="card p-3">
      <div class="d-flex gap-2 mb-3">
        <input class="form-control" id="clientSearch" placeholder="Pesquisar por nome...">
        <button class="btn btn-primary" id="clientSearchBtn"><i class="bi bi-search"></i></button>
        <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#clientModal"><i class="bi bi-plus"></i> Novo</button>
      </div>
      <div id="clientesList"></div>
    </div>
    <div class="modal fade" id="clientModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="clientModalTitle">Novo Cliente</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="clientId">
          <div class="mb-2"><label class="form-label">Nome</label><input class="form-control" id="clientNome"></div>
          <div class="mb-2"><label class="form-label">Telefone</label><input class="form-control" id="clientTelefone"></div>
          <div class="mb-2"><label class="form-label">WhatsApp</label><input class="form-control" id="clientWhatsapp"></div>
          <div class="mb-2"><label class="form-label">Observações</label><textarea class="form-control" id="clientObs"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="clientSave">Salvar</button>
        </div>
      </div></div>
    </div>
  `;

  document.getElementById('clientSearchBtn').addEventListener('click', loadClientes);
  document.getElementById('clientSearch').addEventListener('keyup', (e) => { if (e.key === 'Enter') loadClientes(); });
  document.getElementById('clientSave').addEventListener('click', saveClient);

  loadClientes();
}

async function loadClientes() {
  const el = document.getElementById('clientesList');
  showLoading(true);
  try {
    const search = document.getElementById('clientSearch').value;
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const clients = await api('GET', `/clients${params}`);

    if (!clients.length) {
      el.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><p>Nenhum cliente cadastrado</p></div>';
      return;
    }

    el.innerHTML = `<div class="table-responsive"><table class="table table-sm">
      <thead><tr><th>Nome</th><th>Telefone</th><th>WhatsApp</th><th>Ações</th></tr></thead><tbody>
      ${clients.map(c => `<tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${escapeHtml(c.telefone || '-')}</td>
        <td>${escapeHtml(c.whatsapp || '-')}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-outline-warning" onclick="editClient('${c._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteClient('${c._id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  } finally {
    showLoading(false);
  }
}

function openClientModal(client = null) {
  const modal = new bootstrap.Modal(document.getElementById('clientModal'));
  document.getElementById('clientId').value = client?._id || '';
  document.getElementById('clientNome').value = client?.nome || '';
  document.getElementById('clientTelefone').value = client?.telefone || '';
  document.getElementById('clientWhatsapp').value = client?.whatsapp || '';
  document.getElementById('clientObs').value = client?.observacoes || '';
  document.getElementById('clientModalTitle').textContent = client ? 'Editar Cliente' : 'Novo Cliente';
  modal.show();
}

async function editClient(id) {
  const c = await api('GET', `/clients/${id}`);
  openClientModal(c);
}

async function deleteClient(id) {
  if (!confirm('Excluir este cliente?')) return;
  try {
    await api('DELETE', `/clients/${id}`);
    showToast('Cliente excluído');
    loadClientes();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function saveClient() {
  const data = {
    nome: document.getElementById('clientNome').value,
    telefone: document.getElementById('clientTelefone').value,
    whatsapp: document.getElementById('clientWhatsapp').value,
    observacoes: document.getElementById('clientObs').value
  };
  if (!data.nome) { showToast('Nome é obrigatório', 'warning'); return; }

  const id = document.getElementById('clientId').value;
  try {
    if (id) {
      await api('PUT', `/clients/${id}`, data);
      showToast('Cliente atualizado');
    } else {
      await api('POST', '/clients', data);
      showToast('Cliente criado');
    }
    bootstrap.Modal.getInstance(document.getElementById('clientModal')).hide();
    loadClientes();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ====== SERVIÇOS ======
async function renderServicos() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `
    <h4 class="page-title"><i class="bi bi-grid"></i> Serviços</h4>
    <div class="card p-3">
      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#servicoModal"><i class="bi bi-plus"></i> Novo Serviço</button>
      </div>
      <div id="servicosList"></div>
    </div>
    <div class="modal fade" id="servicoModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="servicoModalTitle">Novo Serviço</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input type="hidden" id="servicoId">
          <div class="mb-2"><label class="form-label">Nome</label><input class="form-control" id="servicoNome"></div>
          <div class="mb-2"><label class="form-label">Descrição</label><textarea class="form-control" id="servicoDesc"></textarea></div>
          <div class="mb-2"><label class="form-label">Taxa Fixa Padrão (R$)</label><input class="form-control" id="servicoTaxa" type="number" step="0.01"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="servicoSave">Salvar</button>
        </div>
      </div></div>
    </div>
  `;

  document.getElementById('servicoSave').addEventListener('click', saveServico);
  loadServicos();
}

async function loadServicos() {
  const el = document.getElementById('servicosList');
  showLoading(true);
  try {
    const services = await api('GET', '/services');
    if (!services.length) {
      el.innerHTML = '<div class="empty-state"><i class="bi bi-grid"></i><p>Nenhum serviço cadastrado</p></div>';
      return;
    }
    el.innerHTML = `<div class="table-responsive"><table class="table table-sm">
      <thead><tr><th>Nome</th><th>Descrição</th><th>Taxa Fixa</th><th>Ações</th></tr></thead><tbody>
      ${services.map(s => `<tr>
        <td>${escapeHtml(s.nome)}</td>
        <td>${escapeHtml(s.descricao || '-')}</td>
        <td>${formatMoney(s.taxaFixaPadrao)}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-outline-warning" onclick="editServico('${s._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteServico('${s._id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  } finally {
    showLoading(false);
  }
}

function openServicoModal(servico = null) {
  document.getElementById('servicoId').value = servico?._id || '';
  document.getElementById('servicoNome').value = servico?.nome || '';
  document.getElementById('servicoDesc').value = servico?.descricao || '';
  document.getElementById('servicoTaxa').value = servico?.taxaFixaPadrao || 0;
  document.getElementById('servicoModalTitle').textContent = servico ? 'Editar Serviço' : 'Novo Serviço';
  new bootstrap.Modal(document.getElementById('servicoModal')).show();
}

async function editServico(id) {
  const services = await api('GET', '/services');
  const s = services.find(x => x._id === id);
  if (s) openServicoModal(s);
}

async function deleteServico(id) {
  if (!confirm('Excluir este serviço?')) return;
  try {
    await api('DELETE', `/services/${id}`);
    showToast('Serviço excluído');
    loadServicos();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function saveServico() {
  const data = {
    nome: document.getElementById('servicoNome').value,
    descricao: document.getElementById('servicoDesc').value,
    taxaFixaPadrao: parseFloat(document.getElementById('servicoTaxa').value) || 0
  };
  if (!data.nome) { showToast('Nome é obrigatório', 'warning'); return; }

  const id = document.getElementById('servicoId').value;
  try {
    if (id) {
      await api('PUT', `/services/${id}`, data);
      showToast('Serviço atualizado');
    } else {
      await api('POST', '/services', data);
      showToast('Serviço criado');
    }
    bootstrap.Modal.getInstance(document.getElementById('servicoModal')).hide();
    loadServicos();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ====== CONFIGURAÇÕES ======
async function renderConfig() {
  const el = document.getElementById('pageContent');
  try {
    const config = await loadConfig();

    el.innerHTML = `
      <h4 class="page-title"><i class="bi bi-gear"></i> Configurações</h4>
      <div class="card p-3 mb-3">
        <h5>Dados do Motorista</h5>
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Nome</label><input class="form-control" id="cfgNome" value="${escapeHtml(config.motorista?.nome || '')}"></div>
          <div class="col-md-6"><label class="form-label">Telefone</label><input class="form-control" id="cfgTelefone" value="${escapeHtml(config.motorista?.telefone || '')}"></div>
          <div class="col-md-6"><label class="form-label">WhatsApp</label><input class="form-control" id="cfgWhatsapp" value="${escapeHtml(config.motorista?.whatsapp || '')}"></div>
          <div class="col-md-3"><label class="form-label">Cidade</label><input class="form-control" id="cfgCidade" value="${escapeHtml(config.motorista?.cidade || '')}"></div>
          <div class="col-md-3"><label class="form-label">Estado</label><input class="form-control" id="cfgEstado" value="${escapeHtml(config.motorista?.estado || '')}"></div>
        </div>
      </div>
      <div class="card p-3 mb-3">
        <h5>Personalização</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Logo Personalizada</label>
            <input type="file" class="form-control" id="cfgLogo" accept="image/*">
            <div class="mt-2"><img id="cfgLogoPreview" class="preview-logo" src="${config.motorista?.logo || ''}" style="${config.motorista?.logo ? '' : 'display:none'}"></div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Cor Principal</label>
            <input type="color" class="form-control color-picker" id="cfgCor" value="${config.personalizacao?.corPrincipal || '#0d6efd'}">
          </div>
          <div class="col-md-3">
            <label class="form-label">Tema</label>
            <select class="form-select" id="cfgTema">
              <option value="light" ${config.personalizacao?.tema === 'light' ? 'selected' : ''}>Claro</option>
              <option value="dark" ${config.personalizacao?.tema === 'dark' ? 'selected' : ''}>Escuro</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card p-3 mb-3">
        <h5>Valores</h5>
        <div class="row g-3">
          <div class="col-md-4"><label class="form-label">Valor por KM (R$)</label><input class="form-control" id="cfgValorKm" type="number" step="0.01" value="${config.valores?.valorPorKm || 2.5}"></div>
          <div class="col-md-4"><label class="form-label">Taxa Mínima (R$)</label><input class="form-control" id="cfgTaxaMin" type="number" step="0.01" value="${config.valores?.taxaMinima || 15}"></div>
          <div class="col-md-4"><label class="form-label">Taxa Fixa (R$)</label><input class="form-control" id="cfgTaxaFixa" type="number" step="0.01" value="${config.valores?.taxaFixa || 10}"></div>
          <div class="col-md-4"><label class="form-label">Espera por Minuto (R$)</label><input class="form-control" id="cfgEsperaMin" type="number" step="0.01" value="${config.valores?.valorEsperaMinuto || 0.5}"></div>
          <div class="col-md-4"><label class="form-label">Valor Ajudante (R$)</label><input class="form-control" id="cfgValorAjudante" type="number" step="0.01" value="${config.valores?.valorAjudante || 30}"></div>
          <div class="col-md-4"><label class="form-label">Pedágio Padrão (R$)</label><input class="form-control" id="cfgPedagio" type="number" step="0.01" value="${config.valores?.valorPadraoPedagio || 5}"></div>
        </div>
      </div>
      <button class="btn btn-primary btn-lg w-100" id="cfgSave"><i class="bi bi-save"></i> Salvar Configurações</button>
    `;

    document.getElementById('cfgLogo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('cfgLogoPreview').src = ev.target.result;
        document.getElementById('cfgLogoPreview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('cfgTema').addEventListener('change', (e) => {
      document.body.classList.toggle('dark-mode', e.target.value === 'dark');
    });

    if (config.personalizacao?.tema === 'dark') document.body.classList.add('dark-mode');

    document.getElementById('cfgSave').addEventListener('click', saveConfig);
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

async function saveConfig() {
  const data = {
    motorista: {
      nome: document.getElementById('cfgNome').value,
      telefone: document.getElementById('cfgTelefone').value,
      whatsapp: document.getElementById('cfgWhatsapp').value,
      cidade: document.getElementById('cfgCidade').value,
      estado: document.getElementById('cfgEstado').value,
      logo: document.getElementById('cfgLogoPreview').src || ''
    },
    personalizacao: {
      corPrincipal: document.getElementById('cfgCor').value,
      tema: document.getElementById('cfgTema').value
    },
    valores: {
      valorPorKm: parseFloat(document.getElementById('cfgValorKm').value) || 0,
      taxaMinima: parseFloat(document.getElementById('cfgTaxaMin').value) || 0,
      taxaFixa: parseFloat(document.getElementById('cfgTaxaFixa').value) || 0,
      valorEsperaMinuto: parseFloat(document.getElementById('cfgEsperaMin').value) || 0,
      valorAjudante: parseFloat(document.getElementById('cfgValorAjudante').value) || 0,
      valorPadraoPedagio: parseFloat(document.getElementById('cfgPedagio').value) || 0
    }
  };

  try {
    await api('PUT', '/config', data);
    configCache = data;
    showToast('Configurações salvas!');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Init
(async () => {
  try {
    await loadConfig();
    if (configCache?.personalizacao?.tema === 'dark') document.body.classList.add('dark-mode');
    if (configCache?.motorista?.logo) {
      const logoEl = document.getElementById('sidebarLogo');
      if (logoEl) logoEl.src = configCache.motorista.logo;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (_) {}
  navigateTo('dashboard');
})();
