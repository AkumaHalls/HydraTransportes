/*
 * Testes do cálculo de corridas (exports.calcular)
 * Executa o código REAL do controller com axios (OSRM/Mapbox) mockado.
 * Uso: node tests/calcular.test.js
 */
process.env.MAPBOX_TOKEN = 'test-token';

const axios = require('axios');
const assert = require('assert');

// ===== MOCKS (antes de carregar o controller) =====
let osrmQueue = [];
let osrmUrls = [];
let mapboxQueries = [];

axios.get = async (url) => {
  if (url.includes('router.project-osrm.org')) {
    osrmUrls.push(url);
    const r = osrmQueue.shift();
    if (!r) throw new Error('mock OSRM ausente para: ' + url.slice(0, 80));
    if (r.reject) {
      const e = new Error(r.message || 'timeout of 15000ms exceeded');
      if (r.code) e.code = r.code;
      throw e;
    }
    return {
      data: {
        code: 'Ok',
        routes: [{
          distance: r.distance,
          duration: r.duration,
          geometry: { type: 'LineString', coordinates: [[-44.0, -19.9], [-43.9, -19.8]] }
        }]
      }
    };
  }
  if (url.includes('api.mapbox.com/geocoding')) {
    const q = decodeURIComponent(url.split('/mapbox.places/')[1].split('.json')[0]);
    mapboxQueries.push(q);
    const seed = q.length % 20;
    return { data: { features: [{ center: [-44.05 - seed * 0.01, -19.85 - seed * 0.01], relevance: 0.9 }] } };
  }
  throw new Error('URL não mockada: ' + url);
};

const ctrl = require('../src/controllers/corridaController');
const Corrida = require('../src/models/Corrida');
const ConfigModel = require('../src/models/Config');

let createdDoc = null;
Corrida.create = async (doc) => {
  createdDoc = JSON.parse(JSON.stringify(doc));
  return { ...doc, _id: 'ID123', toObject() { return { ...doc, _id: 'ID123' }; } };
};
ConfigModel.findOne = async () => ({
  valores: { valorPorKm: 2.5, taxaFixa: 10, taxaPorParada: 8 },
  motoristaId: null
});

function reset(queue) {
  osrmQueue = [...queue];
  osrmUrls = [];
  mapboxQueries = [];
  createdDoc = null;
}

async function run(body) {
  const req = { body };
  let st = null, payload = null;
  const res = {
    status(c) { st = c; return this; },
    json(p) { payload = p; return this; }
  };
  await ctrl.calcular(req, res);
  return { st, payload, created: createdDoc, osrmUrls: [...osrmUrls], mapboxQueries: [...mapboxQueries] };
}

// Coordenadas fixas de teste (João Monlevade fictício)
const ORIG = { origem: 'Origem Teste', origemLat: -19.767, origemLng: -44.087 };
const DEST = { destino: 'Destino Teste', destinoLat: -19.900, destinoLng: -44.200 };
const P1 = { endereco: 'Parada Um', lat: -19.800, lng: -44.100 };
const P2 = { endereco: 'Parada Dois', lat: -19.850, lng: -44.150 };

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); console.log('PASS -', name); pass++; }
  catch (e) { console.error('FAIL -', name, '::', e.message); fail++; }
}

(async () => {
  // ===== A) Ida simples sem paradas =====
  await t('A: ida simples 100km, sem paradas, sem volta', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST });
    assert.strictEqual(r.st, null);
    assert.strictEqual(r.payload.distanciaIda, 100);
    assert.strictEqual(r.payload.distanciaVolta, 0);
    assert.strictEqual(r.payload.distanciaFinal, 100);
    // (100 * 2.50) + 10 = 260
    assert.strictEqual(r.payload.valorTotal, 260);
    assert.strictEqual(r.osrmUrls.length, 1);
  });

  // ===== B) Ida e volta SEM paradas (mantém dobro) =====
  await t('B: ida e volta sem paradas = 2x distância', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST, idaEVolta: true });
    assert.strictEqual(r.payload.distanciaIda, 100);
    assert.strictEqual(r.payload.distanciaVolta, 100);
    assert.strictEqual(r.payload.distanciaFinal, 200);
    // (200 * 2.50) + 10 = 510
    assert.strictEqual(r.payload.valorTotal, 510);
    assert.strictEqual(r.osrmUrls.length, 1);
  });

  // ===== C) Ida e volta COM 2 paradas (caso real do usuário) =====
  await t('C: ida/volta com 2 paradas usa DUAS rotas OSRM independentes', async () => {
    reset([{ distance: 96000, duration: 5400 }, { distance: 66000, duration: 4500 }]);
    const r = await run({ ...ORIG, ...DEST, idaEVolta: true, paradas: [P1, P2] });
    assert.strictEqual(r.osrmUrls.length, 2, 'devia chamar OSRM 2x');
    // Volta começa pelo destino (waypoint invertido) — extrai trecho após /driving/
    const voltaPath = r.osrmUrls[1].split('/driving/')[1];
    assert.ok(voltaPath.startsWith('-44.2,-19.9;'), 'rota de volta devia começar no destino, URL: ' + voltaPath);
    assert.strictEqual(r.payload.distanciaIda, 96);
    assert.strictEqual(r.payload.distanciaVolta, 66);
    assert.strictEqual(r.payload.distanciaFinal, 162);
    // (162 * 2.50) + 10 + (2x8 paradas) = 405 + 10 + 16 = 431
    assert.strictEqual(r.payload.valorTotal, 431);
    assert.strictEqual(r.payload.totalParadas, 2);
    assert.strictEqual(r.payload.tempoEstimado, '2h 45min');
  });

  // ===== D) Parada com lat/lng NÃO re-geocodifica =====
  await t('D: coordenadas fornecidas nas paradas evitam Mapbox', async () => {
    reset([{ distance: 50000, duration: 3000 }, { distance: 40000, duration: 2400 }]);
    const r = await run({ origem: 'O', destino: 'D', idaEVolta: true, paradas: [P1] });
    // Origem/destino texto são geocodificados, mas a parada NÃO
    assert.ok(!r.mapboxQueries.includes('Parada Um'),
      'parada com coords não devia ir ao Mapbox. Chamadas: ' + JSON.stringify(r.mapboxQueries));
  });

  // ===== E) Parada SEM lat/lng é geocodificada =====
  await t('E: parada sem coords vai pro Mapbox (após origem/destino)', async () => {
    reset([{ distance: 50000, duration: 3000 }]);
    await run({ origem: 'Rua X 1', destino: 'Rua Y 2', paradas: [{ endereco: 'Parada Sem Coords' }] });
    assert.deepStrictEqual(mapboxQueries, ['Rua X 1', 'Rua Y 2', 'Parada Sem Coords']);
  });

  // ===== F) dias negativo é clampeado para 1 =====
  await t('F: dias=-5 vira 1 (total nunca negativo por dias)', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST, dias: -5 });
    assert.strictEqual(r.payload.dias, 1);
    assert.strictEqual(r.payload.valorTotal, 260);
    assert.strictEqual(r.created.dias, 1);
  });

  // ===== G) desconto negativo não vira acréscimo =====
  await t('G: desconto=-50 é rejeitado (clamp 0)', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST, descontos: -50 });
    assert.strictEqual(r.payload.descontos, 0);
    assert.strictEqual(r.payload.valorTotal, 260, 'não pode somar |desconto|');
  });

  // ===== H) desconto gigante zera o total (nunca negativo) =====
  await t('H: valorTotal piso em 0', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST, descontos: 100000 });
    assert.strictEqual(r.payload.valorTotal, 0);
  });

  // ===== I) dias>1 multiplica tudo =====
  await t('I: dias=3 multiplica o total completo', async () => {
    reset([{ distance: 100000, duration: 3600 }]);
    const r = await run({ ...ORIG, ...DEST, dias: 3 });
    // ((100*2.5)+10)*3 = 780
    assert.strictEqual(r.payload.valorTotal, 780);
  });

  // ===== J) OSRM fora do ar → erro amigável =====
  await t('J: erro de rede no OSRM vira mensagem amigável', async () => {
    reset([]);
    osrmQueue.push({ reject: true, message: 'getaddrinfo ENOTFOUND router.project-osrm.org' });
    const r = await run({ ...ORIG, ...DEST });
    assert.strictEqual(r.st, 400);
    assert.ok(/conex/i.test(r.payload.error), 'devia falar de conexão, veio: ' + r.payload.error);
    assert.ok(!/getaddrinfo/.test(r.payload.error), 'não pode vazar erro técnico cru');
  });

  // ===== K) OSRM timeout → mensagem clara =====
  await t('K: timeout do OSRM gera msg de serviço lento', async () => {
    reset([]);
    osrmQueue.push({ reject: true, code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' });
    const r = await run({ ...ORIG, ...DEST });
    assert.strictEqual(r.st, 400);
    assert.ok(/demorou demais/.test(r.payload.error));
  });

  // ===== L) Persistência grava ida/volta separados =====
  await t('L: documento salvo contém distanciaIda/Volta/dias', async () => {
    reset([{ distance: 96000, duration: 5400 }, { distance: 66000, duration: 4500 }]);
    const r = await run({ ...ORIG, ...DEST, idaEVolta: true, dias: 2, paradas: [P1] });
    assert.strictEqual(r.created.distanciaIda, 96);
    assert.strictEqual(r.created.distanciaVolta, 66);
    assert.strictEqual(r.created.distanciaKm, 162);
    assert.strictEqual(r.created.dias, 2);
    // ((162*2.5)+10+8)*2 = 423+18... conferindo: 405+10+8=423 → x2 = 846
    assert.strictEqual(r.created.valorTotal, 846);
    assert.ok(r.created.rotaGeoJSON && r.created.rotaGeoJSON.type === 'LineString');
  });

  // ===== M) Trajeto personalizado da volta (caso real do usuário) =====
  await t('M: pontosVolta customizado usa sequência exata do usuário', async () => {
    reset([{ distance: 25000, duration: 1800 }, { distance: 149500, duration: 9000 }]);
    const pontosVolta = [
      { endereco: 'Destino Teste', lat: -19.900, lng: -44.200 },
      { endereco: 'Parada Um', lat: -19.800, lng: -44.100 },
      { endereco: 'Parada Dois', lat: -19.850, lng: -44.150 },
      { endereco: 'Destino Teste', lat: -19.900, lng: -44.200 }
    ];
    const r = await run({ ...ORIG, ...DEST, idaEVolta: true, paradas: [], pontosVolta });
    assert.strictEqual(r.osrmUrls.length, 2, 'devia chamar OSRM 2x (ida + volta)');
    // URL da volta = sequência exata D;P1;P2;D
    const voltaPath = r.osrmUrls[1].split('/driving/')[1].split('?')[0];
    assert.strictEqual(voltaPath,
      '-44.2,-19.9;-44.1,-19.8;-44.15,-19.85;-44.2,-19.9',
      'sequência da volta devia ser a informada, veio: ' + voltaPath);
    assert.strictEqual(r.payload.distanciaIda, 25);
    assert.strictEqual(r.payload.distanciaVolta, 149.5);
    assert.strictEqual(r.payload.distanciaFinal, 174.5);
    assert.strictEqual(mapboxQueries.length, 0, 'nada devia ser re-geocodificado');
    assert.strictEqual(r.created.pontosVolta.length, 4);
    assert.strictEqual(r.created.pontosVolta[3].endereco, 'Destino Teste');
  });

  // ===== N) pontosVolta inválida (<2 pontos) cai no espelhamento antigo =====
  await t('N: pontosVolta com 1 ponto cai no comportamento legado (x2)', async () => {
    reset([{ distance: 50000, duration: 3000 }]);
    const r = await run({
      origem: 'O', destino: 'D', idaEVolta: true,
      pontosVolta: [{ endereco: 'Só Um Ponto', lat: -20, lng: -44 }]
    });
    assert.strictEqual(r.osrmUrls.length, 1, 'legado faz UMA chamada');
    assert.strictEqual(r.payload.distanciaFinal, 100);
    assert.ok(!r.created.pontosVolta || r.created.pontosVolta.length === 0,
      'não deve persistir pontosVolta quando não usado');
  });

  // ===== O) Volta degenerada (duplicados consecutivos) é colapsada =====
  await t('O: pontosVolta toda repetida vira degenerada e cai no legado', async () => {
    reset([{ distance: 40000, duration: 2400 }]);
    const r = await run({
      origem: 'O', destino: 'D', idaEVolta: true,
      pontosVolta: [
        { endereco: 'Dest', lat: -19.9, lng: -44.2 },
        { endereco: 'Dest de novo', lat: -19.9000001, lng: -44.2000001 },
        { endereco: 'Dest outra vez', lat: -19.9, lng: -44.2 }
      ]
    });
    assert.strictEqual(r.osrmUrls.length, 1, 'degenerada não pode chamar OSRM extra');
    assert.strictEqual(r.payload.distanciaVolta, 40);
    assert.strictEqual(r.payload.distanciaFinal, 80);
  });

  // ===== P) pontosVolta sem coordenadas é geocodificada =====
  await t('Q: ponto de volta sem coords vai ao Mapbox na ordem', async () => {
    reset([{ distance: 10000, duration: 600 }, { distance: 20000, duration: 1200 }]);
    const r = await run({
      origem: 'Rua A 1', destino: 'Rua B 2', idaEVolta: true,
      pontosVolta: [
        { endereco: 'Rua B 2' },
        { endereco: 'Ponto Volta X' }
      ]
    });
    assert.deepStrictEqual(mapboxQueries, ['Rua A 1', 'Rua B 2', 'Ponto Volta X']);
    assert.strictEqual(r.osrmUrls.length, 2);
    const voltaPath = r.osrmUrls[1].split('/driving/')[1];
    assert.ok(voltaPath.startsWith('-44.12,-19.92'), 'volta devia começar no destino geocodificado');
    assert.ok(voltaPath.includes('-44.18,-19.98'), 'volta devia incluir o ponto geocodificado');
    assert.strictEqual(r.created.pontosVolta[1].lat, -19.98);
  });

  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
