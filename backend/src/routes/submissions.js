const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const submissionsController = require('../controllers/submissions');

// Require authentication for all routes
router.use(verifyToken);

// All submission routes require student role
router.use(requireRole('student'));

// GET /submissions/my-assignments — Get assignments for the student's group
router.get('/my-assignments', submissionsController.getMyAssignments);

// POST /submissions/:assignmentId/confirm-step1 — First confirmation step
router.post('/:assignmentId/confirm-step1', submissionsController.confirmStep1);

// POST /submissions/:assignmentId/confirm-final — Final confirmation
router.post('/:assignmentId/confirm-final', submissionsController.confirmFinal);

module.exports = router;
