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
    const corPrin = config?.personalizacao?.corPrincipal || '#0d6efd';
    const logoData = motorista.logo || null;
    const nomeMotorista = motorista.nome || 'Motorista';
    const telMotorista = motorista.telefone || '';
    const zapMotorista = motorista.whatsapp || '';
    const cidadeMotorista = motorista.cidade || '';
    const estadoMotorista = motorista.estado || '';

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprovante_${corrida._id}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width - 60;
    const leftMargin = 30;
    const rightMargin = doc.page.width - 30;

    // Bordas externas
    doc.rect(leftMargin, 20, pageW, doc.page.height - 50).lineWidth(1).stroke('#cccccc');

    // HEADER - fundo colorido
    doc.rect(leftMargin, 20, pageW, 100).fill(corPrin);
    doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('HYDRA TRANSPORTES URGENTES', leftMargin + 15, 35, { align: 'center' });
    doc.fontSize(10).font('Helvetica')
      .text('COMPROVANTE DE SERVICO', leftMargin + 15, 60, { align: 'center' });
    if (cidadeMotorista && estadoMotorista) {
      doc.fontSize(8).text(`${cidadeMotorista} - ${estadoMotorista}`, leftMargin + 15, 78, { align: 'center' });
    }
    doc.fill('#000000');

    // Logo no header
    if (logoData) {
      try {
        const raw = logoData.replace(/^data:image\/[a-z]+;base64,/, '');
        doc.image(Buffer.from(raw, 'base64'), rightMargin - 115, 28, { fit: [70, 70], align: 'right' });
      } catch (e) {}
    }

    // Número recibo
    const reciboNum = corrida._id.toString().slice(-8).toUpperCase();
    doc.fontSize(9).fill('#666666').text(`Recibo: #${reciboNum}`, leftMargin + 15, 95, { align: 'right' }).fill('#000000');

    // Dados do motorista
    let y = 138;
    doc.fontSize(10).font('Helvetica-Bold').text('MOTORISTA', leftMargin + 15, y);
    y += 16;
    doc.fontSize(9).font('Helvetica').text(`Nome: ${nomeMotorista}`, leftMargin + 15, y);
    doc.text(`Tel: ${telMotorista}`, leftMargin + 160, y);
    y += 14;
    if (zapMotorista) doc.text(`WhatsApp: ${zapMotorista}`, leftMargin + 15, y);

    // Linha separadora
    y += 20;
    doc.moveTo(leftMargin + 15, y).lineTo(rightMargin - 15, y).stroke('#cccccc');

    // DADOS DO SERVICO
    y += 18;
    doc.fontSize(10).fill(corPrin).font('Helvetica-Bold').text('DADOS DO SERVICO', leftMargin + 15, y).fill('#000000');
    y += 16;

    // Tabela de informações
    const col1 = leftMargin + 15;
    const col2 = leftMargin + 130;
    const colW = 180;
    const rowH = 16;

    // Função helper para linha da tabela
    const tableRow = (label, value, cy) => {
      doc.rect(col1 - 3, cy - 2, colW + 15, rowH).fillAndStroke('#f5f5f5', '#eeeeee');
      doc.fill('#333333').fontSize(9).font('Helvetica-Bold').text(label, col1 + 5, cy + 2);
      doc.fill('#000000').font('Helvetica').text(value, col1 + 100, cy + 2);
    };

    tableRow('Cliente:', corrida.cliente || 'N/A', y); y += rowH;
    tableRow('Servico:', corrida.servico || 'N/A', y); y += rowH;
    doc.rect(col1 - 3, y - 2, colW + 15, rowH * 2).fillAndStroke('#ffffff', '#eeeeee');
    doc.fill('#333333').fontSize(9).font('Helvetica-Bold').text('Origem:', col1 + 5, y + 2);
    doc.fill('#000000').font('Helvetica').text(corrida.origem, col1 + 100, y + 2, { width: 180 });
    y += rowH;
    doc.rect(col1 - 3, y - 2, colW + 15, rowH).fillAndStroke('#ffffff', '#eeeeee');
    y += rowH;

    doc.rect(col1 - 3, y - 2, colW + 15, rowH * 2).fillAndStroke('#ffffff', '#eeeeee');
    doc.fill('#333333').fontSize(9).font('Helvetica-Bold').text('Destino:', col1 + 5, y + 2);
    doc.fill('#000000').font('Helvetica').text(corrida.destino, col1 + 100, y + 2, { width: 180 });
    y += rowH;
    doc.rect(col1 - 3, y - 2, colW + 15, rowH).fillAndStroke('#ffffff', '#eeeeee');
    y += rowH;

    // Segunda coluna - Valores
    const col3 = leftMargin + 200;
    const colW2 = 150;

    const tableRow2 = (label, value, cy, bold) => {
      doc.rect(col3 - 3, cy - 2, colW2 + 15, rowH).fillAndStroke('#f5f5f5', '#eeeeee');
      doc.fill('#333333').fontSize(9).font('Helvetica-Bold').text(label, col3 + 5, cy + 2);
      doc.fill('#000000').font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, col3 + 85, cy + 2, { align: 'right' });
    };

    const vkm = corrida.valorPorKm || 0;
    const tf = corrida.taxaFixa || 0;
    const ped = corrida.pedagio || 0;
    const esp = corrida.espera || 0;
    const ajud = corrida.ajudante || 0;
    const acre = corrida.acrescimos || 0;
    const desc = corrida.descontos || 0;
    const dist = corrida.distanciaKm || 0;
    const total = corrida.valorTotal || 0;

    tableRow2('Distancia:', `${dist} km`, 138, false);
    let yy = 154;
    tableRow2('Tempo:', corrida.tempoEstimado || '-', yy, false); yy += rowH;
    tableRow2('Valor/KM:', `R$ ${vkm.toFixed(2)}`, yy, false); yy += rowH;
    tableRow2('Taxa Fixa:', `R$ ${tf.toFixed(2)}`, yy, false); yy += rowH;
    if (ped > 0) { tableRow2('Pedagio:', `R$ ${ped.toFixed(2)}`, yy, false); yy += rowH; }
    if (esp > 0) { tableRow2('Espera:', `R$ ${esp.toFixed(2)}`, yy, false); yy += rowH; }
    if (ajud > 0) { tableRow2('Ajudante:', `R$ ${ajud.toFixed(2)}`, yy, false); yy += rowH; }
    if (acre > 0) { tableRow2('Acrescimos:', `R$ ${acre.toFixed(2)}`, yy, false); yy += rowH; }
    if (desc > 0) { tableRow2('Descontos:', `-R$ ${desc.toFixed(2)}`, yy, false); yy += rowH; }

    // Total com destaque
    yy += 5;
    doc.rect(col3 - 3, yy - 2, colW2 + 15, rowH + 6).fill(corPrin);
    doc.fill('#ffffff').fontSize(12).font('Helvetica-Bold').text('VALOR TOTAL:', col3 + 5, yy + 2);
    doc.text(`R$ ${total.toFixed(2)}`, col3 + 5, yy + 2, { align: 'right' }).fill('#000000');

    // Data e hora
    yy += 50;
    doc.fill('#666666').fontSize(8).font('Helvetica');
    doc.text(`Data: ${new Date(corrida.createdAt).toLocaleDateString('pt-BR')}`, leftMargin + 15, yy);
    doc.text(`Hora: ${new Date(corrida.createdAt).toLocaleTimeString('pt-BR')}`, leftMargin + 15, yy + 12);

    // Observações
    if (corrida.observacoes) {
      yy += 30;
      doc.fontSize(9).fill('#333333').font('Helvetica-Bold').text('Observacoes:', leftMargin + 15, yy);
      doc.font('Helvetica').fill('#000000').text(corrida.observacoes, leftMargin + 15, yy + 14, { width: pageW - 30 });
    }

    // FOOTER
    const footerY = doc.page.height - 60;
    doc.moveTo(leftMargin + 15, footerY).lineTo(rightMargin - 15, footerY).stroke('#cccccc');
    doc.fontSize(8).fill('#999999').font('Helvetica')
      .text(`Emitido por Hydra Transportes Urgentes - Motorista: ${nomeMotorista}`, leftMargin + 15, footerY + 8, { align: 'center' });
    doc.text(`Tel: ${telMotorista} | WhatsApp: ${zapMotorista}`, leftMargin + 15, footerY + 20, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
