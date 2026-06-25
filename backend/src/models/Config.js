const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  motorista: {
    nome: { type: String, default: 'Motorista' },
    telefone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    cidade: { type: String, default: '' },
    estado: { type: String, default: '' },
    logo: { type: String, default: '' }
  },
  personalizacao: {
    corPrincipal: { type: String, default: '#0d6efd' },
    tema: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  valores: {
    valorPorKm: { type: Number, default: 2.50 },
    taxaMinima: { type: Number, default: 15.00 },
    taxaFixa: { type: Number, default: 10.00 },
    valorEsperaMinuto: { type: Number, default: 0.50 },
    valorAjudante: { type: Number, default: 30.00 },
    valorPadraoPedagio: { type: Number, default: 5.00 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema, 'configs');
