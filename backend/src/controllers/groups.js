const db = require('../models/db');

// ── POST /groups — Create a new group ────────────────────────────────────────
const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check if the student is already in a group
    const existing = await db.query(
      'SELECT gm.group_id, g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: `You are already in group "${existing.rows[0].name}". A student can only be in one group.`,
      });
    }

    // Create the group
    const groupResult = await db.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at',
      [name.trim(), userId]
    );
    const group = groupResult.rows[0];

    // Auto-add creator as a member
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, userId]
    );

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    // Handle unique constraint violation (user already in a group)
    if (error.code === '23505' && error.constraint) {
      return res.status(400).json({ error: 'You are already a member of a group' });
    }
    console.error('Create Group Error:', error);
    res.status(500).json({ error: 'Server error while creating group' });
  }
};

// ── GET /groups/mine — Get the current student's group + members ─────────────
const getMyGroup = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the group this student belongs to
    const membershipResult = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );

    if (membershipResult.rows.length === 0) {
      return res.json({ group: null });
    }

    const groupId = membershipResult.rows[0].group_id;

    // Get group info
    const groupResult = await db.query(
      'SELECT id, name, created_by, created_at FROM groups WHERE id = $1',
      [groupId]
    );
    const group = groupResult.rows[0];

    // Get all members of this group
    const membersResult = await db.query(
      `SELECT u.id, u.name, u.email, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    res.json({
      group: {
        ...group,
        is_creator: group.created_by === userId,
        members: membersResult.rows,
      },
    });
  } catch (error) {
    console.error('Get My Group Error:', error);
    res.status(500).json({ error: 'Server error while fetching group' });
  }
};

// ── POST /groups/:id/members — Add a member by email ─────────────────────────
const addMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = parseInt(req.params.id);
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify the requester is the creator of this group
    const groupResult = await db.query(
      'SELECT id, name, created_by FROM groups WHERE id = $1',
      [groupId]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (groupResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only the group creator can add members' });
    }

    // Find the user to add
    const userResult = await db.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    const targetUser = userResult.rows[0];

    // Ensure the target is a student
    if (targetUser.role !== 'student') {
      return res.status(400).json({ error: 'Only students can be added to groups' });
    }

    // Check if the target is already in any group
    const existingMembership = await db.query(
      'SELECT gm.group_id, g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [targetUser.id]
    );
    if (existingMembership.rows.length > 0) {
      const existingGroupName = existingMembership.rows[0].name;
      if (existingMembership.rows[0].group_id === groupId) {
        return res.status(400).json({ error: `${targetUser.name} is already in this group` });
      }
      return res.status(400).json({
        error: `${targetUser.name} is already in another group ("${existingGroupName}"). A student can only be in one group.`,
      });
    }

    // Add the member
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, targetUser.id]
    );

    res.status(201).json({
      message: `${targetUser.name} added to the group`,
      member: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This student is already in a group' });
    }
    console.error('Add Member Error:', error);
    res.status(500).json({ error: 'Server error while adding member' });
  }
};

// ── DELETE /groups/:id/members/:userId — Remove a member ─────────────────────
const removeMember = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const groupId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    // Verify the requester is the creator of this group
    const groupResult = await db.query(
      'SELECT id, created_by FROM groups WHERE id = $1',
      [groupId]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (groupResult.rows[0].created_by !== requesterId) {
      return res.status(403).json({ error: 'Only the group creator can remove members' });
    }

    // Cannot remove yourself via this endpoint (use leave instead)
    if (targetUserId === requesterId) {
      return res.status(400).json({ error: 'You cannot remove yourself. Use the leave group option instead.' });
    }

    // Remove the member
    const deleteResult = await db.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    res.json({ message: 'Member removed from group' });
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({ error: 'Server error while removing member' });
  }
};

// ── POST /groups/leave — Leave your current group ────────────────────────────
const leaveGroup = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user's current group
    const membershipResult = await db.query(
      'SELECT gm.group_id, g.created_by FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1',
      [userId]
    );
    if (membershipResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not in any group' });
    }

    const { group_id: groupId, created_by: creatorId } = membershipResult.rows[0];

    // Remove the user from the group
    await db.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    // If the user was the creator, check remaining members
    if (creatorId === userId) {
      const remaining = await db.query(
        'SELECT user_id FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC LIMIT 1',
        [groupId]
      );

      if (remaining.rows.length === 0) {
        // No members left — delete the group
        await db.query('DELETE FROM groups WHERE id = $1', [groupId]);
        return res.json({ message: 'You left and the group was deleted (no members remaining)' });
      } else {
        // Transfer ownership to the earliest remaining member
        const newOwnerId = remaining.rows[0].user_id;
        await db.query('UPDATE groups SET created_by = $1 WHERE id = $2', [newOwnerId, groupId]);
        return res.json({ message: 'You left the group. Ownership transferred to another member.' });
      }
    }

    res.json({ message: 'You have left the group' });
  } catch (error) {
    console.error('Leave Group Error:', error);
    res.status(500).json({ error: 'Server error while leaving group' });
  }
};

module.exports = { createGroup, getMyGroup, addMember, removeMember, leaveGroup };
