const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  cidade: { type: String, default: '' },
  estado: { type: String, default: '' },
  logo: { type: String, default: '' },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema, 'drivers');
