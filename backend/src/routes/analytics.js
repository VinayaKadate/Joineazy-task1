const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const analyticsController = require('../controllers/analytics');

// All analytics routes require authentication + admin role
router.use(verifyToken, requireRole('admin'));

// GET /analytics/summary
router.get('/summary', analyticsController.getAnalyticsSummary);

// GET /analytics/assignments/:id/status
router.get('/assignments/:id/status', analyticsController.getAssignmentStatus);

// PUT /analytics/assignments/:id/groups/:groupId/accept
router.put('/assignments/:id/groups/:groupId/accept', analyticsController.acceptSubmission);

// PUT /analytics/assignments/:id/groups/:groupId/reject
router.put('/assignments/:id/groups/:groupId/reject', analyticsController.rejectSubmission);

module.exports = router;
