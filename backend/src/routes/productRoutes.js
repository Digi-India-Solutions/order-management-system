const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requirePermission('products.read'), productController.getProducts);
router.get('/:id', requirePermission('products.read'), productController.getProductById);
router.post(
  '/',
  (req, res, next) => {
    if (['super_admin', 'store_manager'].includes(req.user?.roleName)) return next();
    return requirePermission('products.create')(req, res, next);
  },
  productController.createProduct
);
router.put(
  '/:id',
  (req, res, next) => {
    if (['super_admin', 'store_manager'].includes(req.user?.roleName)) return next();
    return requirePermission('products.update')(req, res, next);
  },
  productController.updateProduct
);
router.delete('/:id', requireRole('super_admin'), productController.deleteProduct);

module.exports = router;
