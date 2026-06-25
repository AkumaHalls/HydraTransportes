const mongoose = require('mongoose');

const corridaSchema = new mongoose.Schema({
  cliente: { type: String, default: '' },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  servico: { type: String, default: '' },
  servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  origem: { type: String, required: true },
  destino: { type: String, required: true },
  origemLat: { type: Number, default: 0 },
  origemLng: { type: Number, default: 0 },
  destinoLat: { type: Number, default: 0 },
  destinoLng: { type: Number, default: 0 },
  distanciaKm: { type: Number, default: 0 },
  tempoEstimado: { type: String, default: '' },
  idaEVolta: { type: Boolean, default: false },
  valorPorKm: { type: Number, default: 0 },
  taxaFixa: { type: Number, default: 0 },
  pedagio: { type: Number, default: 0 },
  espera: { type: Number, default: 0 },
  ajudante: { type: Number, default: 0 },
  acrescimos: { type: Number, default: 0 },
  descontos: { type: Number, default: 0 },
  valorTotal: { type: Number, default: 0 },
  observacoes: { type: String, default: '' },
  rotaGeoJSON: { type: Object, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Corrida', corridaSchema, 'corridas');
