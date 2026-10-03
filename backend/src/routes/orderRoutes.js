const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requirePermission('orders.read'), orderController.getOrders);
router.get('/:id', requirePermission('orders.read'), orderController.getOrderById);
router.post('/', requirePermission('orders.create'), orderController.createOrder);
router.put('/:id', requirePermission('orders.update'), orderController.updateOrder);
router.put('/:id/status', requirePermission('orders.update'), orderController.updateOrderStatus);
router.post('/:id/payments', requirePermission('orders.update'), orderController.addPayment);
router.delete('/:id', requirePermission('orders.delete'), orderController.deleteOrder);

module.exports = router;
