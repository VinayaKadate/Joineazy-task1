const db = require('../models/db');

exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    const assignmentsCountRes = await db.query('SELECT COUNT(*) FROM assignments');
    const groupsCountRes = await db.query('SELECT COUNT(*) FROM groups');
    const studentsCountRes = await db.query('SELECT COUNT(*) FROM users WHERE role = $1', ['student']);

    const totalAssignments = parseInt(assignmentsCountRes.rows[0].count);
    const totalGroups = parseInt(groupsCountRes.rows[0].count);
    const totalStudents = parseInt(studentsCountRes.rows[0].count);

    let overallCompletionRate = 0;
    
    const assignedQuery = `
      SELECT a.id, a.target,
             (SELECT COUNT(*) FROM assignment_targets at WHERE at.assignment_id = a.id) as target_count
      FROM assignments a
    `;
    const assignments = await db.query(assignedQuery);
    
    let totalExpectedSubmissions = 0;
    assignments.rows.forEach(a => {
      if (a.target === 'all') {
        totalExpectedSubmissions += totalGroups;
      } else {
        totalExpectedSubmissions += parseInt(a.target_count);
      }
    });

    const confirmedSubmissionsRes = await db.query(`
      SELECT COUNT(*) FROM submissions WHERE status IN ('confirmed', 'accepted')
    `);
    const totalConfirmed = parseInt(confirmedSubmissionsRes.rows[0].count);

    if (totalExpectedSubmissions > 0) {
      overallCompletionRate = Math.round((totalConfirmed / totalExpectedSubmissions) * 100);
    }

    res.json({
      summary: {
        totalAssignments,
        totalGroups,
        totalStudents,
        overallCompletionRate,
        totalExpectedSubmissions,
        totalConfirmed
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssignmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assignmentRes = await db.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignmentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = assignmentRes.rows[0];

    let groupsQuery = '';
    let queryParams = [];

    if (assignment.target === 'all') {
      groupsQuery = `
        SELECT g.id, g.name, 
          COALESCE(s.status, 'pending') AS submission_status,
          s.submission_link,
          s.admin_remarks,
          s.confirmed_at,
          (
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = g.id
          ) AS members
        FROM groups g
        LEFT JOIN submissions s ON s.group_id = g.id AND s.assignment_id = $1
        ORDER BY g.name ASC
      `;
      queryParams = [id];
    } else {
      groupsQuery = `
        SELECT g.id, g.name, 
          COALESCE(s.status, 'pending') AS submission_status,
          s.submission_link,
          s.admin_remarks,
          s.confirmed_at,
          (
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = g.id
          ) AS members
        FROM assignment_targets at
        JOIN groups g ON at.group_id = g.id
        LEFT JOIN submissions s ON s.group_id = g.id AND s.assignment_id = $1
        WHERE at.assignment_id = $1
        ORDER BY g.name ASC
      `;
      queryParams = [id];
    }

    const groupsRes = await db.query(groupsQuery, queryParams);

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        target: assignment.target
      },
      statuses: groupsRes.rows
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptSubmission = async (req, res, next) => {
  try {
    const { id, groupId } = req.params;
    
    const result = await db.query(
      `UPDATE submissions 
       SET status = 'accepted' 
       WHERE assignment_id = $1 AND group_id = $2 
       RETURNING *`,
      [id, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ message: 'Submission accepted', submission: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.rejectSubmission = async (req, res, next) => {
  try {
    const { id, groupId } = req.params;
    
    const result = await db.query(
      `UPDATE submissions 
       SET status = 'rejected' 
       WHERE assignment_id = $1 AND group_id = $2 
       RETURNING *`,
      [id, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ message: 'Submission rejected', submission: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
