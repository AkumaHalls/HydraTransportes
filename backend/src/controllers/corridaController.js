const Corrida = require('../models/Corrida');
const Config = require('../models/Config');
const axios = require('axios');

exports.calcular = async (req, res) => {
  try {
    const { origem, destino, idaEVolta, pedagio, espera, ajudante, acrescimos, descontos, cliente, servico, clienteId, servicoId, observacoes, paradas } = req.body;

    const config = await Config.findOne();
    const valores = config ? config.valores : {};
    let motoristaNome = '';
    if (config && config.motoristaId) {
      try {
        const Driver = require('../models/Driver');
        const motorista = await Driver.findById(config.motoristaId);
        if (motorista) motoristaNome = motorista.nome;
      } catch (_) {}
    }

    const geocode = async (address) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const { data } = await axios.get(url, { headers: { 'User-Agent': 'HydraTransportes/1.0' } });
      if (!data.length) throw new Error(`Endereço não encontrado: ${address}`);
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    };

    const origCoords = await geocode(origem);
    const destCoords = await geocode(destino);

    // Geocode paradas
    const paradasCoords = [];
    const paradasValidas = [];
    if (paradas && Array.isArray(paradas) && paradas.length > 0) {
      for (const p of paradas) {
        if (!p.endereco || !p.endereco.trim()) continue;
        const coords = await geocode(p.endereco);
        paradasCoords.push(coords);
        paradasValidas.push({
          endereco: p.endereco,
          lat: coords.lat,
          lng: coords.lng,
          valorParada: parseFloat(p.valorParada) || 0
        });
      }
    }

    // Montar waypoints para OSRM: origem;parada1;parada2;...;destino
    const waypoints = [`${origCoords.lng},${origCoords.lat}`];
    for (const pc of paradasCoords) {
      waypoints.push(`${pc.lng},${pc.lat}`);
    }
    waypoints.push(`${destCoords.lng},${destCoords.lat}`);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints.join(';')}?overview=full&geometries=geojson&steps=true`;
    const { data: routeData } = await axios.get(osrmUrl);

    if (!routeData.routes || !routeData.routes.length) {
      return res.status(400).json({ error: 'Rota não encontrada' });
    }

    const route = routeData.routes[0];
    const distanciaKm = (route.distance / 1000);
    const tempoSeg = route.duration;
    const horas = Math.floor(tempoSeg / 3600);
    const minutos = Math.round((tempoSeg % 3600) / 60);
    const tempoEstimado = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;

    const distanciaFinal = idaEVolta ? distanciaKm * 2 : distanciaKm;

    const valorPorKm = valores.valorPorKm || 2.5;
    const taxaFixa = valores.taxaFixa || 10;
    const taxaPorParada = valores.taxaPorParada || 8;
    const valPedagio = parseFloat(pedagio) || 0;
    const valEspera = parseFloat(espera) || 0;
    const valAjudante = parseFloat(ajudante) || 0;
    const valAcrescimos = parseFloat(acrescimos) || 0;
    const valDescontos = parseFloat(descontos) || 0;

    // Calcular valor das paradas
    const totalParadas = paradasValidas.length;
    const valorParadas = totalParadas > 0 ? totalParadas * taxaPorParada : 0;

    const valorTotal = (distanciaFinal * valorPorKm) + taxaFixa + valPedagio + valEspera + valAjudante + valAcrescimos + valorParadas - valDescontos;

    const corrida = await Corrida.create({
      cliente: cliente || '',
      clienteId: clienteId || null,
      servico: servico || '',
      servicoId: servicoId || null,
      origem,
      destino,
      origemLat: origCoords.lat,
      origemLng: origCoords.lng,
      destinoLat: destCoords.lat,
      destinoLng: destCoords.lng,
      distanciaKm: Math.round(distanciaKm * 100) / 100,
      tempoEstimado,
      idaEVolta: !!idaEVolta,
      valorPorKm,
      taxaFixa,
      pedagio: valPedagio,
      espera: valEspera,
      ajudante: valAjudante,
      acrescimos: valAcrescimos,
      descontos: valDescontos,
      valorTotal: Math.round(valorTotal * 100) / 100,
      observacoes: observacoes || '',
      rotaGeoJSON: route.geometry,
      motoristaId: (config && config.motoristaId) || null,
      motoristaNome,
      paradas: paradasValidas,
      totalParadas,
      taxaPorParada
    });

    res.json({
      ...corrida.toObject(),
      distanciaFinal: Math.round(distanciaFinal * 100) / 100,
      valorParadas: Math.round(valorParadas * 100) / 100,
      config: config
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const { search, cliente, servico, dataInicio, dataFim, page = 1, limit = 50 } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { cliente: { $regex: search, $options: 'i' } },
        { servico: { $regex: search, $options: 'i' } },
        { origem: { $regex: search, $options: 'i' } },
        { destino: { $regex: search, $options: 'i' } }
      ];
    }
    if (cliente) query.cliente = { $regex: cliente, $options: 'i' };
    if (servico) query.servico = { $regex: servico, $options: 'i' };
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = new Date(dataInicio);
      if (dataFim) query.createdAt.$lte = new Date(dataFim + 'T23:59:59.999Z');
    }

    const total = await Corrida.countDocuments(query);
    const corridas = await Corrida.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ corridas, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const corrida = await Corrida.findById(req.params.id);
    if (!corrida) return res.status(404).json({ error: 'Corrida not found' });
    res.json(corrida);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const corrida = await Corrida.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!corrida) return res.status(404).json({ error: 'Corrida not found' });
    res.json(corrida);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const corrida = await Corrida.findByIdAndDelete(req.params.id);
    if (!corrida) return res.status(404).json({ error: 'Corrida not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.dashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const corridas = await Corrida.find();

    const total = corridas.length;
    const faturadoTotal = corridas.reduce((s, c) => s + (c.valorTotal || 0), 0);
    const kmTotal = corridas.reduce((s, c) => s + ((c.distanciaKm || 0) * (c.idaEVolta ? 2 : 1)), 0);

    const corridasMes = corridas.filter(c => new Date(c.createdAt) >= startOfMonth);
    const faturadoMes = corridasMes.reduce((s, c) => s + (c.valorTotal || 0), 0);

    const corridasDia = corridas.filter(c => new Date(c.createdAt) >= startOfDay);
    const faturadoDia = corridasDia.reduce((s, c) => s + (c.valorTotal || 0), 0);

    const clientes = [...new Set(corridas.filter(c => c.cliente).map(c => c.cliente))];

    const faturamentoPorMes = {};
    const corridasPorMes = {};
    const kmPorMes = {};

    corridas.forEach(c => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      faturamentoPorMes[key] = (faturamentoPorMes[key] || 0) + (c.valorTotal || 0);
      corridasPorMes[key] = (corridasPorMes[key] || 0) + 1;
      kmPorMes[key] = (kmPorMes[key] || 0) + ((c.distanciaKm || 0) * (c.idaEVolta ? 2 : 1));
    });

    const labels = Object.keys(faturamentoPorMes).sort();

    res.json({
      totalCorridas: total,
      totalFaturado: Math.round(faturadoTotal * 100) / 100,
      faturadoMes: Math.round(faturadoMes * 100) / 100,
      faturadoDia: Math.round(faturadoDia * 100) / 100,
      kmTotal: Math.round(kmTotal * 100) / 100,
      totalClientes: clientes.length,
      graficos: {
        labels,
        faturamento: labels.map(k => Math.round((faturamentoPorMes[k] || 0) * 100) / 100),
        corridas: labels.map(k => corridasPorMes[k] || 0),
        km: labels.map(k => Math.round((kmPorMes[k] || 0) * 100) / 100)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
