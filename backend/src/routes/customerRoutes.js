const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requirePermission('customers.read'), customerController.getCustomers);
router.get('/:id', requirePermission('customers.read'), customerController.getCustomerById);
router.post('/', requirePermission('customers.create'), customerController.createCustomer);
router.put('/:id/approve', requireRole(['super_admin', 'admin']), customerController.approveCustomer);
router.put('/:id', requirePermission('customers.update'), customerController.updateCustomer);
router.delete('/:id', requirePermission('customers.delete'), customerController.deleteCustomer);

module.exports = router;
