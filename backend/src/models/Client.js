const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  observacoes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema, 'clients');
