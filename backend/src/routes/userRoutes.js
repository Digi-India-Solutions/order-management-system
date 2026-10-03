const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requireRole('super_admin'), userController.getUsers);
router.get('/pending-approvals', requireRole('super_admin'), userController.getPendingApprovals);
router.get('/sales-reps', userController.getSalesReps);
router.get('/:id', requireRole('super_admin'), userController.getUserById);
router.get('/:id/permissions', requireRole('super_admin'), userController.getUserPermissions);
router.put('/:id/permissions', requireRole('super_admin'), userController.updateUserPermissions);
router.post('/', requireRole('super_admin'), userController.createUser);
router.put('/:id', requireRole('super_admin'), userController.updateUser);
router.put('/:id/approve', requireRole('super_admin'), userController.approveUser);
router.put('/:id/reject', requireRole('super_admin'), userController.rejectUser);
router.post('/:id/resend-verification', requireRole('super_admin'), userController.resendUserVerification);
router.post('/:id/reset-password', requireRole('super_admin'), userController.resetUserPassword);
router.delete('/:id', requireRole('super_admin'), userController.deleteUser);

module.exports = router;
