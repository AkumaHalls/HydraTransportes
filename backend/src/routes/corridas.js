const router = require('express').Router();
const ctrl = require('../controllers/corridaController');

router.get('/', ctrl.list);
router.get('/dashboard', ctrl.dashboard);
router.post('/calcular', ctrl.calcular);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
