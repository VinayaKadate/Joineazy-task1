const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const groupsController = require('../controllers/groups');

// All group routes require authentication + student role
router.use(verifyToken, requireRole('student'));

// POST /groups — Create a new group
router.post('/', groupsController.createGroup);

// GET /groups/mine — Get current student's group + members
router.get('/mine', groupsController.getMyGroup);

// POST /groups/leave — Leave your current group
router.post('/leave', groupsController.leaveGroup);

// POST /groups/:id/members — Add a member by email
router.post('/:id/members', groupsController.addMember);

// DELETE /groups/:id/members/:userId — Remove a member
router.delete('/:id/members/:userId', groupsController.removeMember);

module.exports = router;
