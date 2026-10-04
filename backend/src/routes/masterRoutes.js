const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

// Categories
router.get('/categories', masterController.getCategories);
router.post('/categories', requirePermission('masters.manage'), masterController.createCategory);
router.put('/categories/:id', requirePermission('masters.manage'), masterController.updateCategory);
router.delete('/categories/:id', requirePermission('masters.manage'), masterController.deleteCategory);

// Units
router.get('/units', masterController.getUnits);
router.post('/units', requirePermission('masters.manage'), masterController.createUnit);
router.put('/units/:id', requirePermission('masters.manage'), masterController.updateUnit);
router.delete('/units/:id', requirePermission('masters.manage'), masterController.deleteUnit);

// Stores
router.get('/stores', masterController.getStores);
router.post('/stores', requirePermission('masters.manage'), masterController.createStore);
router.put('/stores/:id', requirePermission('masters.manage'), masterController.updateStore);
router.delete('/stores/:id', requirePermission('masters.manage'), masterController.deleteStore);

module.exports = router;

