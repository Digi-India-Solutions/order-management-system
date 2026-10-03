const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/sales', requirePermission('reports.read'), reportController.getSalesReport);
router.get('/inventory', requirePermission('reports.read'), reportController.getInventoryReport);
router.get('/team-performance', requirePermission('reports.read'), reportController.getTeamPerformanceReport);

module.exports = router;
