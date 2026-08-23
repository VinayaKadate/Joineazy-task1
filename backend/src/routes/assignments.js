const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const assignmentsController = require('../controllers/assignments');

// All assignment routes require authentication + admin role
router.use(verifyToken, requireRole('admin'));

// GET /assignments/groups — List all groups (for targeting UI)
router.get('/groups', assignmentsController.getAllGroups);

// POST /assignments — Create a new assignment
router.post('/', assignmentsController.createAssignment);

// GET /assignments — Get all assignments
router.get('/', assignmentsController.getAllAssignments);

// GET /assignments/:id — Get a single assignment
router.get('/:id', assignmentsController.getAssignment);

// PUT /assignments/:id — Update an assignment
router.put('/:id', assignmentsController.updateAssignment);

// DELETE /assignments/:id — Delete an assignment
router.delete('/:id', assignmentsController.deleteAssignment);

module.exports = router;
