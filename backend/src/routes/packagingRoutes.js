const express = require('express');
const router = express.Router();
const packagingController = require('../controllers/packagingController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requirePermission('packaging.read'), packagingController.getPackagingOrders);
router.get('/:orderId', requirePermission('packaging.read'), packagingController.getPackagingDetails);
router.put('/:orderId', requirePermission('packaging.update'), packagingController.updatePackaging);

module.exports = router;
