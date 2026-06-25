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
      Paradas: c.totalParadas > 0 ? (c.paradas || []).map(p => p.endereco).join('; ') : '',
      Distancia_KM: c.distanciaKm,
      Tempo: c.tempoEstimado,
      Valor_Por_KM: c.valorPorKm,
      Taxa_Fixa: c.taxaFixa,
      Taxa_Paradas: c.totalParadas > 0 ? (c.totalParadas * (c.taxaPorParada || 0)) : 0,
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
      { header: 'Paradas', key: 'paradas' },
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
        paradas: c.totalParadas > 0 ? (c.paradas || []).map(p => p.endereco).join('; ') : '',
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
      const distFinal = c.idaEVolta ? (c.distanciaKm * 2) : c.distanciaKm;
      doc.fontSize(9);
      doc.text(`Cliente: ${c.cliente || 'N/A'}  |  Servico: ${c.servico || 'N/A'}  |  Data: ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`);
      doc.text(`Motorista: ${c.motoristaNome || 'N/A'}  ${c.idaEVolta ? '| Ida e Volta' : ''}`);
      doc.text(`Origem: ${c.origem}`);
      doc.text(`Destino: ${c.destino}`);
      if (c.paradas && c.paradas.length > 0) {
        doc.text(`Paradas: ${c.paradas.map(p => p.endereco).join('; ')}`);
      }
      doc.text(`Distancia: ${c.distanciaKm} km${c.idaEVolta ? ` (total percorrido: ${distFinal} km)` : ''}  |  Valor: R$ ${c.valorTotal?.toFixed(2) || '0,00'}`);
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

    const tipo = req.query.tipo || 'comprovante';

    const Config = require('../models/Config');
    const config = await Config.findOne();

    const motorista = config?.motorista || {};
    const valores = config?.valores || {};
    const corPrin = config?.personalizacao?.corPrincipal || '#0d6efd';

    // Usa motorista vinculado à corrida se existir, senão fallback pro config
    let nomeMotorista = corrida.motoristaNome || motorista.nome || 'Motorista';
    let telMotorista = motorista.telefone || '';
    let zapMotorista = motorista.whatsapp || '';
    let cidadeMotorista = motorista.cidade || '';
    let estadoMotorista = motorista.estado || '';
    let logoData = motorista.logo || null;

    // Se a corrida tem motoristaId, tenta buscar dados completos do driver
    if (corrida.motoristaId) {
      try {
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(corrida.motoristaId);
        if (driver) {
          nomeMotorista = driver.nome || nomeMotorista;
          telMotorista = driver.telefone || telMotorista;
          zapMotorista = driver.whatsapp || zapMotorista;
          cidadeMotorista = driver.cidade || cidadeMotorista;
          estadoMotorista = driver.estado || estadoMotorista;
          if (driver.logo) logoData = driver.logo;
        }
      } catch (_) {}
    }

    // Fallback: tenta ler o HydraLogo.png do disco se nao tiver logo
    if (!logoData) {
      try {
        const fs = require('fs');
        const path = require('path');
        const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'assets', 'HydraLogo.png');
        if (fs.existsSync(logoPath)) {
          const ext = path.extname(logoPath).slice(1);
          const base64 = fs.readFileSync(logoPath).toString('base64');
          logoData = `data:image/${ext === 'png' ? 'png' : ext};base64,${base64}`;
        }
      } catch (_) {}
    }

    const doc = new PDFDocument({ margin: 35, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${tipo}_${corrida._id}.pdf`);
    doc.pipe(res);

    const LM = 35;
    const pageW = doc.page.width - LM * 2;
    let y = 25;

    // HEADER
    doc.rect(LM, y, pageW, 85).fill(corPrin);
    doc.fill('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('HYDRA TRANSPORTES URGENTES', LM + 15, y + 15, { align: 'center' });
    doc.fontSize(11).font('Helvetica')
      .text(tipo === 'orcamento' ? 'ORCAMENTO' : 'COMPROVANTE DE SERVICO', LM + 15, y + 42, { align: 'center' });
    if (cidadeMotorista && estadoMotorista) {
      doc.fontSize(8).text(`${cidadeMotorista} - ${estadoMotorista}`, LM + 15, y + 60, { align: 'center' });
    }
    doc.fill('#000000');

    if (logoData) {
      try {
        const raw = logoData.replace(/^data:image\/[a-z]+;base64,/, '');
        doc.image(Buffer.from(raw, 'base64'), LM + pageW - 90, y + 8, { fit: [75, 70] });
      } catch (e) {}
    }

    const reciboNum = corrida._id.toString().slice(-8).toUpperCase();
    doc.fontSize(8).fill('#ffffff').font('Helvetica-Bold').text(`Recibo: #${reciboNum}`, LM + 15, y + 68);
    doc.fill('#000000');

    y += 100;

    // MOTORISTA
    doc.fontSize(8).fill('#888888').text('MOTORISTA', LM, y);
    y += 12;
    doc.fontSize(10).font('Helvetica-Bold').text(nomeMotorista, LM, y);
    const motoristaInfo = [telMotorista, zapMotorista, [cidadeMotorista, estadoMotorista].filter(Boolean).join(' - ')].filter(Boolean).join('  |  ');
    y += 14;
    doc.fontSize(8).font('Helvetica').fill('#555555').text(motoristaInfo, LM, y);
    doc.fill('#000000');

    y += 20;
    doc.moveTo(LM, y).lineTo(LM + pageW, y).stroke('#dddddd');

    // DADOS DO SERVICO
    y += 18;
    doc.fontSize(10).fill(corPrin).font('Helvetica-Bold').text('DADOS DO SERVICO', LM, y).fill('#000000');
    y += 16;

    const rH = 18;

    const linha = (label, value) => {
      doc.font('Helvetica').fontSize(9);
      const lh = Math.max(rH, doc.heightOfString(String(value), { width: pageW - 83 }) + 6);
      doc.rect(LM, y - 2, pageW, lh).fillAndStroke('#f8f8f8', '#eeeeee');
      doc.fill('#333333').font('Helvetica-Bold').text(label, LM + 8, y + 2);
      doc.fill('#000000').font('Helvetica').text(value, LM + 75, y + 2, { width: pageW - 83 });
      y += lh;
    };

    linha('Cliente:', corrida.cliente || 'N/A');
    linha('Servico:', corrida.servico || 'N/A');
    linha('Origem:', corrida.origem);
    linha('Destino:', corrida.destino);

    if (corrida.paradas && corrida.paradas.length > 0) {
      corrida.paradas.forEach((p, i) => {
        linha(`Parada ${i + 1}:`, p.endereco);
      });
      y += 2;
    }

    y += 8;
    doc.moveTo(LM, y).lineTo(LM + pageW, y).stroke('#dddddd');

    // VALORES
    y += 18;
    doc.fontSize(10).fill(corPrin).font('Helvetica-Bold').text('VALORES', LM, y).fill('#000000');
    y += 16;

    const vkm = corrida.valorPorKm || 0;
    const tf = corrida.taxaFixa || 0;
    const ped = corrida.pedagio || 0;
    const esp = corrida.espera || 0;
    const ajud = corrida.ajudante || 0;
    const acre = corrida.acrescimos || 0;
    const desc = corrida.descontos || 0;
    const dist = corrida.distanciaKm || 0;
    const distFinal = corrida.idaEVolta ? dist * 2 : dist;
    const total = corrida.valorTotal || 0;

    const linhaValor = (label, value, highlight) => {
      doc.rect(LM, y - 2, pageW, rH).fillAndStroke(highlight ? '#fff3cd' : '#f8f8f8', '#eeeeee');
      doc.fill('#333333').fontSize(9).font(highlight ? 'Helvetica-Bold' : 'Helvetica').text(label, LM + 8, y + 2);
      doc.fill(highlight ? '#dc3545' : '#000000').font(highlight ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, LM + 8, y + 2, { width: pageW - 16, align: 'right' });
      y += rH;
    };

    if (corrida.idaEVolta) {
      linhaValor('Distancia (ida):', `${dist} km`);
      linhaValor('Distancia (volta):', `${dist} km`);
      linhaValor('Distancia total (ida e volta):', `${distFinal} km`);
    } else {
      linhaValor('Distancia:', `${dist} km`);
    }
    linhaValor('Tempo estimado:', corrida.tempoEstimado || '-');
    linhaValor('Valor por km:', `R$ ${vkm.toFixed(2)}`);
    if (tf > 0) linhaValor('Taxa Fixa:', `R$ ${tf.toFixed(2)}`);
    if (ped > 0) linhaValor('Pedagio:', `R$ ${ped.toFixed(2)}`);
    if (esp > 0) linhaValor('Espera:', `R$ ${esp.toFixed(2)}`);
    if (ajud > 0) linhaValor('Ajudante:', `R$ ${ajud.toFixed(2)}`);
    const valParadas = (corrida.totalParadas || 0) * (corrida.taxaPorParada || 0);
    if (valParadas > 0) linhaValor(`Paradas (${corrida.totalParadas}x):`, `R$ ${valParadas.toFixed(2)}`);
    if (acre > 0) linhaValor('Acrescimos:', `R$ ${acre.toFixed(2)}`);
    if (desc > 0) linhaValor('Descontos:', `- R$ ${desc.toFixed(2)}`);
    y += 4;

    // TOTAL em destaque
    doc.rect(LM, y - 2, pageW, rH + 6).fill(corPrin);
    doc.fill('#ffffff').fontSize(14).font('Helvetica-Bold').text('VALOR TOTAL', LM + 15, y + 2);
    doc.text(`R$ ${total.toFixed(2)}`, LM + 15, y + 2, { width: pageW - 30, align: 'right' });
    doc.fill('#000000');
    y += rH + 10;

    // Data e hora
    y += 10;
    doc.fontSize(8).fill('#888888');
    doc.text([`Data: ${new Date(corrida.createdAt).toLocaleDateString('pt-BR')}`, `Hora: ${new Date(corrida.createdAt).toLocaleTimeString('pt-BR')}`].join('  |  '), LM, y);
    doc.fill('#000000');

    // Observacoes
    if (corrida.observacoes) {
      y += 18;
      doc.fontSize(9).font('Helvetica');
      const obsH = doc.heightOfString(corrida.observacoes, { width: pageW });
      doc.fill('#333333').font('Helvetica-Bold').text('Observacoes:', LM, y);
      y += 14;
      doc.font('Helvetica').fill('#000000').text(corrida.observacoes, LM, y, { width: pageW });
      y += obsH + 6;
    }

    // MAPA DA ROTA
    if (corrida.rotaGeoJSON?.coordinates?.length >= 2) {
      y += 20;
      doc.fontSize(10).fill(corPrin).font('Helvetica-Bold').text('ROTA', LM, y).fill('#000000');
      y += 18;

      const coords = corrida.rotaGeoJSON.coordinates;
      const pad = 15;
      const footerY = doc.page.height - 55;
      const maxMapH = Math.max(100, footerY - 30 - y);
      const mapH = Math.min(240, maxMapH);
      const mapW = pageW;
      const drawW = mapW - pad * 2, drawH = mapH - pad * 2;

      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      coords.forEach(([lng, lat]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });
      const lp = (maxLat - minLat) * 0.1 || 0.005;
      const lngp = (maxLng - minLng) * 0.1 || 0.005;
      minLat -= lp; maxLat += lp;
      minLng -= lngp; maxLng += lngp;

      // Web Mercator helpers
      const zoom = Math.max(8, Math.min(18, Math.round(Math.log2(drawW / 256 * 360 / (maxLng - minLng)))));
      const n = Math.pow(2, zoom);
      const TS = 256;
      const gx = (lng) => (lng + 180) / 360 * n * TS;
      const gy = (lat) => {
        const r = lat * Math.PI / 180;
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * TS;
      };

      // Proporcao real vs area disponivel (com tamanho minimo)
      const mercW = gx(maxLng) - gx(minLng);
      const mercHDiff = gy(maxLat) - gy(minLat); // negativo: norte tem Y menor
      const mercH = gy(minLat) - gy(maxLat); // positivo para aspect ratio
      const bboxAspect = mercW / mercH;
      const drawAspect = drawW / drawH;
      let tileW = drawW, tileH = drawH;
      let xOff2 = 0, yOff2 = 0;
      if (bboxAspect > drawAspect) {
        tileH = Math.max(drawH * 0.8, drawW / bboxAspect);
        yOff2 = (drawH - tileH) / 2;
      } else {
        tileW = Math.max(drawW * 0.4, drawH * bboxAspect);
        xOff2 = (drawW - tileW) / 2;
      }

      const projX = (lng) => LM + pad + xOff2 + (gx(lng) - gx(minLng)) / mercW * tileW;
      const projY = (lat) => y + pad + yOff2 + (gy(maxLat) - gy(lat)) / mercHDiff * tileH;

      // Tenta baixar tiles OSM
      let mapOk = false;
      try {
        const axios = require('axios');
        const tMinX = Math.floor(gx(minLng) / TS);
        const tMaxX = Math.floor(gx(maxLng) / TS);
        const tMinY = Math.floor(gy(maxLat) / TS);
        const tMaxY = Math.floor(gy(minLat) / TS);
        const tiles = {};
        const promises = [];
        for (let x = tMinX; x <= tMaxX; x++) {
          for (let y = tMinY; y <= tMaxY; y++) {
            const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
            promises.push(
              axios.get(url, { responseType: 'arraybuffer', timeout: 10000, headers: { 'User-Agent': 'HydraTransportes/1.0' } })
                .then(r => { tiles[`${x},${y}`] = Buffer.from(r.data); })
                .catch(() => {})
            );
          }
        }
        await Promise.all(promises);
        if (Object.keys(tiles).length > 0) {
          for (let x = tMinX; x <= tMaxX; x++) {
            for (let y = tMinY; y <= tMaxY; y++) {
              const buf = tiles[`${x},${y}`];
              if (!buf) continue;
              const tLng = (x / n) * 360 - 180;
              const tLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
              const tLng2 = ((x + 1) / n) * 360 - 180;
              const tLat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
              doc.image(buf, projX(tLng), projY(tLat), {
                width: projX(tLng2) - projX(tLng),
                height: projY(tLat2) - projY(tLat)
              });
            }
          }
          mapOk = true;
        }
      } catch (_) {}

      // Fundo / borda
      const bgLeft = LM + pad + xOff2, bgTop = y + pad + yOff2;
      if (mapOk) {
        doc.rect(bgLeft, bgTop, tileW, tileH).lineWidth(0.5).stroke('#cccccc');
      } else {
        doc.rect(bgLeft, bgTop, tileW, tileH).fillAndStroke('#f8f9fa', '#dee2e6');
      }

      // Rota e marcadores
      doc.strokeColor(corPrin).lineWidth(mapOk ? 3 : 2.5).lineJoin('round').lineCap('round');
      doc.moveTo(projX(coords[0][0]), projY(coords[0][1]));
      for (let i = 1; i < coords.length; i++) {
        doc.lineTo(projX(coords[i][0]), projY(coords[i][1]));
      }
      doc.stroke();
      doc.strokeColor('#000000');
      const ox = projX(coords[0][0]), oy = projY(coords[0][1]);
      doc.circle(ox, oy, mapOk ? 6 : 5).fillAndStroke('#ffffff', '#000000');
      doc.fill('#28a745').fontSize(7).font('Helvetica-Bold').text('ORIGEM', ox + (mapOk ? 9 : 8), oy - 5);
      const last = coords[coords.length - 1];
      const dx = projX(last[0]), dy = projY(last[1]);
      doc.circle(dx, dy, mapOk ? 6 : 5).fillAndStroke('#ffffff', '#000000');
      doc.fill('#dc3545').fontSize(7).font('Helvetica-Bold').text('DESTINO', dx + (mapOk ? 9 : 8), dy - 5);
      doc.fill('#000000');

      // Paradas markers
      if (corrida.paradas && corrida.paradas.length > 0) {
        corrida.paradas.forEach((p, i) => {
          if (!p.lat || !p.lng) return;
          const px = projX(p.lng), py = projY(p.lat);
          doc.circle(px, py, mapOk ? 5 : 4).fillAndStroke('#ffc107', '#000000');
          doc.fill('#000000').fontSize(6).font('Helvetica-Bold').text(`P${i + 1}`, px + (mapOk ? 8 : 7), py - 4);
          doc.fill('#000000');
        });
      }
    }

    // FOOTER
    const footerY = doc.page.height - 55;
    doc.moveTo(LM, footerY).lineTo(LM + pageW, footerY).stroke('#cccccc');
    doc.fontSize(7).fill('#aaaaaa').font('Helvetica')
      .text(`Hydra Transportes Urgentes - ${nomeMotorista} - ${telMotorista}`, LM, footerY + 8, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
