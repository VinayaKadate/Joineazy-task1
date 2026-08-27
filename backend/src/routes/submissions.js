const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const submissionsController = require('../controllers/submissions');

// Require authentication for all routes
router.use(verifyToken);

// GET /submissions/my-assignments — Get assignments for the student's group (student only)
router.get('/my-assignments', requireRole('student'), submissionsController.getMyAssignments);

// POST /submissions/:assignmentId/acknowledge — Leader/individual acknowledgment (student only)
router.post('/:assignmentId/acknowledge', requireRole('student'), submissionsController.acknowledge);

// POST /submissions/:assignmentId/confirm-step1 — First confirmation step (student only)
router.post('/:assignmentId/confirm-step1', requireRole('student'), submissionsController.confirmStep1);

// POST /submissions/:assignmentId/confirm-final — Final confirmation (student only)
router.post('/:assignmentId/confirm-final', requireRole('student'), submissionsController.confirmFinal);

// GET /submissions/:assignmentId/status — Per-group status (both roles, filtered in controller)
router.get('/:assignmentId/status', submissionsController.getSubmissionStatus);

module.exports = router;
