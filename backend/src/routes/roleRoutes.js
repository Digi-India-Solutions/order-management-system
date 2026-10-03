const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', roleController.getRoles);
router.get('/permissions', requireRole('super_admin'), roleController.getAllPermissions);
router.put('/:id/permissions', requireRole('super_admin'), roleController.updateRolePermissions);

module.exports = router;
