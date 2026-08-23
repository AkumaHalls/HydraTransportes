const router = require('express').Router();
const ctrl = require('../controllers/configController');

router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;
