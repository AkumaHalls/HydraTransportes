const Service = require('../models/Service');

const defaults = [
  { nome: 'Entrega', descricao: 'Serviço de entrega de mercadorias', taxaFixaPadrao: 10 },
  { nome: 'Frete', descricao: 'Serviço de frete em geral', taxaFixaPadrao: 15 },
  { nome: 'Carreto', descricao: 'Serviço de carreto', taxaFixaPadrao: 12 },
  { nome: 'Mudança', descricao: 'Serviço de mudança', taxaFixaPadrao: 25 },
  { nome: 'Retirada em Loja', descricao: 'Retirada de produtos em loja', taxaFixaPadrao: 8 },
  { nome: 'Transporte de Mercadorias', descricao: 'Transporte de mercadorias em geral', taxaFixaPadrao: 20 },
  { nome: 'Transporte Particular', descricao: 'Transporte particular de passageiros', taxaFixaPadrao: 10 }
];

exports.list = async (req, res) => {
  try {
    let services = await Service.find().sort({ nome: 1 });
    if (services.length === 0) {
      services = await Service.insertMany(defaults);
    }
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
