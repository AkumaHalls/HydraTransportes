const router = require('express').Router();
const ctrl = require('../controllers/exportController');

router.get('/csv', ctrl.csv);
router.get('/excel', ctrl.excel);
router.get('/pdf-relatorio', ctrl.pdfRelatorio);
router.get('/comprovante/:id', ctrl.comprovante);

module.exports = router;
