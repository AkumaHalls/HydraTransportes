const Corrida = require('../models/Corrida');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

exports.csv = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    let query = {};
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = new Date(dataInicio);
      if (dataFim) query.createdAt.$lte = new Date(dataFim + 'T23:59:59.999Z');
    }
    const corridas = await Corrida.find(query).sort({ createdAt: -1 });

    const rows = corridas.map(c => ({
      Cliente: c.cliente,
      Servico: c.servico,
      Origem: c.origem,
      Destino: c.destino,
      Distancia_KM: c.distanciaKm,
      Tempo: c.tempoEstimado,
      Valor_Por_KM: c.valorPorKm,
      Taxa_Fixa: c.taxaFixa,
      Pedagio: c.pedagio,
      Espera: c.espera,
      Ajudante: c.ajudante,
      Acrescimos: c.acrescimos,
      Descontos: c.descontos,
      Valor_Total: c.valorTotal,
      Ida_e_Volta: c.idaEVolta ? 'Sim' : 'Nao',
      Data: new Date(c.createdAt).toLocaleDateString('pt-BR')
    }));

    const parser = new Parser({ fields: Object.keys(rows[0] || {}) });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=corridas.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.excel = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    let query = {};
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = new Date(dataInicio);
      if (dataFim) query.createdAt.$lte = new Date(dataFim + 'T23:59:59.999Z');
    }
    const corridas = await Corrida.find(query).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Corridas');

    sheet.columns = [
      { header: 'Cliente', key: 'cliente' },
      { header: 'Servico', key: 'servico' },
      { header: 'Origem', key: 'origem' },
      { header: 'Destino', key: 'destino' },
      { header: 'Distancia (KM)', key: 'distanciaKm' },
      { header: 'Tempo', key: 'tempoEstimado' },
      { header: 'Valor/KM', key: 'valorPorKm' },
      { header: 'Taxa Fixa', key: 'taxaFixa' },
      { header: 'Pedagio', key: 'pedagio' },
      { header: 'Espera', key: 'espera' },
      { header: 'Ajudante', key: 'ajudante' },
      { header: 'Acrescimos', key: 'acrescimos' },
      { header: 'Descontos', key: 'descontos' },
      { header: 'Valor Total', key: 'valorTotal' },
      { header: 'Data', key: 'data' }
    ];

    corridas.forEach(c => {
      sheet.addRow({
        cliente: c.cliente,
        servico: c.servico,
        origem: c.origem,
        destino: c.destino,
        distanciaKm: c.distanciaKm,
        tempoEstimado: c.tempoEstimado,
        valorPorKm: c.valorPorKm,
        taxaFixa: c.taxaFixa,
        pedagio: c.pedagio,
        espera: c.espera,
        ajudante: c.ajudante,
        acrescimos: c.acrescimos,
        descontos: c.descontos,
        valorTotal: c.valorTotal,
        data: new Date(c.createdAt).toLocaleDateString('pt-BR')
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=corridas.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pdfRelatorio = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    let query = {};
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = new Date(dataInicio);
      if (dataFim) query.createdAt.$lte = new Date(dataFim + 'T23:59:59.999Z');
    }
    const corridas = await Corrida.find(query).sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Relatorio de Corridas', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
    doc.moveDown();

    let totalGeral = 0;
    corridas.forEach(c => {
      doc.fontSize(9);
      doc.text(`Cliente: ${c.cliente || 'N/A'}  |  Servico: ${c.servico || 'N/A'}  |  Data: ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`);
      doc.text(`Origem: ${c.origem}`);
      doc.text(`Destino: ${c.destino}`);
      doc.text(`Distancia: ${c.distanciaKm} km  |  Valor: R$ ${c.valorTotal?.toFixed(2) || '0,00'}`);
      doc.moveDown(0.5);
      totalGeral += c.valorTotal || 0;
    });

    doc.moveDown();
    doc.fontSize(12).text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, { align: 'right' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.comprovante = async (req, res) => {
  try {
    const corrida = await Corrida.findById(req.params.id);
    if (!corrida) return res.status(404).json({ error: 'Corrida not found' });

    const Config = require('../models/Config');
    const config = await Config.findOne();

    const motorista = config?.motorista || {};
    const valores = config?.valores || {};

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprovante_${corrida._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text('COMPROVANTE DE SERVICO', { align: 'center' });
    doc.moveDown();

    if (motorista.logo) {
      try {
        const logo = motorista.logo.replace(/^data:image\/[a-z]+;base64,/, '');
        doc.image(Buffer.from(logo, 'base64'), { fit: [100, 100], align: 'center' });
        doc.moveDown();
      } catch (e) {}
    }

    doc.fontSize(14).text(`Motorista: ${motorista.nome || 'Motorista'}`, { align: 'center' });
    if (motorista.telefone) doc.fontSize(10).text(`Tel: ${motorista.telefone}`, { align: 'center' });
    if (motorista.whatsapp) doc.fontSize(10).text(`WhatsApp: ${motorista.whatsapp}`, { align: 'center' });
    doc.moveDown(2);

    const leftX = 40;
    let y = doc.y;

    doc.fontSize(11);
    const lineHeight = 18;

    doc.text(`Cliente: ${corrida.cliente || 'N/A'}`, leftX, y);
    y += lineHeight;
    doc.text(`Servico: ${corrida.servico || 'N/A'}`, leftX, y);
    y += lineHeight;
    doc.text(`Origem: ${corrida.origem}`, leftX, y);
    y += lineHeight;
    doc.text(`Destino: ${corrida.destino}`, leftX, y);
    y += lineHeight + 5;

    doc.text(`Distancia: ${corrida.distanciaKm} km`, leftX, y);
    y += lineHeight;
    doc.text(`Tempo estimado: ${corrida.tempoEstimado}`, leftX, y);
    y += lineHeight;
    doc.text(`Valor por km: R$ ${corrida.valorPorKm?.toFixed(2) || '0,00'}`, leftX, y);
    y += lineHeight + 5;

    doc.text(`Taxa Fixa: R$ ${corrida.taxaFixa?.toFixed(2) || '0,00'}`, leftX, y);
    y += lineHeight;
    if (corrida.pedagio > 0) { doc.text(`Pedagio: R$ ${corrida.pedagio.toFixed(2)}`, leftX, y); y += lineHeight; }
    if (corrida.espera > 0) { doc.text(`Espera: R$ ${corrida.espera.toFixed(2)}`, leftX, y); y += lineHeight; }
    if (corrida.ajudante > 0) { doc.text(`Ajudante: R$ ${corrida.ajudante.toFixed(2)}`, leftX, y); y += lineHeight; }
    if (corrida.acrescimos > 0) { doc.text(`Acrescimos: R$ ${corrida.acrescimos.toFixed(2)}`, leftX, y); y += lineHeight; }
    if (corrida.descontos > 0) { doc.text(`Descontos: -R$ ${corrida.descontos.toFixed(2)}`, leftX, y); y += lineHeight; }

    y += 10;
    doc.moveTo(leftX, y).lineTo(550, y).stroke();
    y += 15;
    doc.fontSize(16).text(`Valor Total: R$ ${corrida.valorTotal?.toFixed(2) || '0,00'}`, leftX, y);
    y += 30;

    doc.fontSize(9);
    doc.text(`Data: ${new Date(corrida.createdAt).toLocaleDateString('pt-BR')}`, leftX, y);
    y += 15;
    doc.text(`Hora: ${new Date(corrida.createdAt).toLocaleTimeString('pt-BR')}`, leftX, y);

    if (corrida.observacoes) {
      y += 20;
      doc.fontSize(10).text(`Obs: ${corrida.observacoes}`, leftX, y);
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
