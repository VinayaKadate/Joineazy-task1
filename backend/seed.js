/**
 * seed.js — Populate the database with demo data for Joineazy.
 *
 * Usage:
 *   node seed.js          (uses .env for DB config)
 *   npm run seed           (same, via package.json script)
 *
 * ⚠️  This script TRUNCATES all tables before inserting.
 *     Only run it on a fresh or dev database.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'joineazy_user',
  password: process.env.DB_PASSWORD || 'joineazy_pass',
  database: process.env.DB_NAME || 'joineazy_db',
});

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Truncate all tables (cascade) ──────────────────────────────────────
    console.log('🗑️  Clearing existing data…');
    await client.query(`
      TRUNCATE TABLE submissions, assignment_targets, assignments,
                     enrollments, courses,
                     group_members, groups, users
      RESTART IDENTITY CASCADE;
    `);

    // ── Hash the shared password ───────────────────────────────────────────
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // ── Insert Users ───────────────────────────────────────────────────────
    console.log('👥 Creating users…');

    const admins = [
      { name: 'Prof. Smith', email: 'prof.smith@university.edu', role: 'admin' },
      { name: 'Prof. Jones', email: 'prof.jones@university.edu', role: 'admin' },
    ];

    const students = [
      { name: 'Alice Kumar',   email: 'alice@university.edu' },
      { name: 'Bob Patel',     email: 'bob@university.edu' },
      { name: 'Charlie Singh', email: 'charlie@university.edu' },
      { name: 'Diana Sharma',  email: 'diana@university.edu' },
      { name: 'Eve Gupta',     email: 'eve@university.edu' },
      { name: 'Frank Das',     email: 'frank@university.edu' },
    ];

    const userIds = {};

    for (const admin of admins) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [admin.name, admin.email, passwordHash, admin.role]
      );
      userIds[admin.email] = res.rows[0].id;
    }

    for (const student of students) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id`,
        [student.name, student.email, passwordHash]
      );
      userIds[student.email] = res.rows[0].id;
    }

    console.log(`   ✅ ${Object.keys(userIds).length} users created`);

    // ── Insert Courses ─────────────────────────────────────────────────────
    console.log('📚 Creating courses…');

    const courseDefs = [
      {
        title: 'Database Systems',
        description: 'Relational databases, SQL, normalization, indexing, and query optimization.',
        professor: 'prof.smith@university.edu',
      },
      {
        title: 'Web Development',
        description: 'Full-stack web development with React, Node.js, Express, and REST APIs.',
        professor: 'prof.smith@university.edu',
      },
      {
        title: 'UI/UX Design',
        description: 'User interface design principles, wireframing, prototyping, and usability testing.',
        professor: 'prof.jones@university.edu',
      },
    ];

    const courseIds = {};

    for (const c of courseDefs) {
      const res = await client.query(
        `INSERT INTO courses (title, description, professor_id) VALUES ($1, $2, $3) RETURNING id`,
        [c.title, c.description, userIds[c.professor]]
      );
      courseIds[c.title] = res.rows[0].id;
    }

    console.log(`   ✅ ${Object.keys(courseIds).length} courses created`);

    // ── Insert Enrollments ─────────────────────────────────────────────────
    console.log('📋 Enrolling students…');

    const enrollmentDefs = [
      // All 6 students enrolled in Database Systems
      { student: 'alice@university.edu',   course: 'Database Systems' },
      { student: 'bob@university.edu',     course: 'Database Systems' },
      { student: 'charlie@university.edu', course: 'Database Systems' },
      { student: 'diana@university.edu',   course: 'Database Systems' },
      { student: 'eve@university.edu',     course: 'Database Systems' },
      { student: 'frank@university.edu',   course: 'Database Systems' },
      // Alpha + Beta students in Web Development
      { student: 'alice@university.edu',   course: 'Web Development' },
      { student: 'bob@university.edu',     course: 'Web Development' },
      { student: 'charlie@university.edu', course: 'Web Development' },
      { student: 'diana@university.edu',   course: 'Web Development' },
      // Gamma students in UI/UX Design
      { student: 'eve@university.edu',     course: 'UI/UX Design' },
      { student: 'frank@university.edu',   course: 'UI/UX Design' },
    ];

    let enrollmentCount = 0;
    for (const e of enrollmentDefs) {
      await client.query(
        `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)`,
        [userIds[e.student], courseIds[e.course]]
      );
      enrollmentCount++;
    }

    console.log(`   ✅ ${enrollmentCount} enrollments created`);

    // ── Insert Groups (with leader_id) ─────────────────────────────────────
    console.log('📁 Creating groups…');

    const groupDefs = [
      {
        name: 'Alpha Squad',
        creator: 'alice@university.edu',
        leader: 'alice@university.edu',
        members: ['alice@university.edu', 'bob@university.edu'],
      },
      {
        name: 'Beta Team',
        creator: 'charlie@university.edu',
        leader: 'charlie@university.edu',
        members: ['charlie@university.edu', 'diana@university.edu'],
      },
      {
        name: 'Gamma Force',
        creator: 'eve@university.edu',
        leader: 'eve@university.edu',
        members: ['eve@university.edu', 'frank@university.edu'],
      },
    ];

    const groupIds = {};

    for (const g of groupDefs) {
      const res = await client.query(
        `INSERT INTO groups (name, created_by, leader_id) VALUES ($1, $2, $3) RETURNING id`,
        [g.name, userIds[g.creator], userIds[g.leader]]
      );
      groupIds[g.name] = res.rows[0].id;

      for (const memberEmail of g.members) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`,
          [res.rows[0].id, userIds[memberEmail]]
        );
      }
    }

    console.log(`   ✅ ${Object.keys(groupIds).length} groups created`);

    // ── Insert Assignments (course-scoped, with submission_type) ───────────
    console.log('📝 Creating assignments…');

    const now = new Date();
    const inFuture = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const inPast = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const assignmentDefs = [
      {
        title: 'Database Design Report',
        description: 'Design an ER diagram and write a report explaining your schema choices, normalization level, and indexing strategy.',
        due_date: inFuture(7),
        onedrive_link: 'https://onedrive.live.com/example-db-report',
        created_by: userIds['prof.smith@university.edu'],
        target: 'all',
        submission_type: 'group',
        course: 'Database Systems',
        groups: [],
      },
      {
        title: 'REST API Implementation',
        description: 'Build a RESTful API with CRUD operations for a student management system. Include auth middleware and proper error handling.',
        due_date: inFuture(3),
        onedrive_link: 'https://onedrive.live.com/example-api-project',
        created_by: userIds['prof.smith@university.edu'],
        target: 'specific',
        submission_type: 'group',
        course: 'Web Development',
        groups: ['Alpha Squad', 'Beta Team'],
      },
      {
        title: 'Frontend UI Challenge',
        description: 'Create a responsive dashboard with charts, tables, and dark mode support using React and Tailwind CSS.',
        due_date: inPast(1), // already overdue — for demo
        onedrive_link: 'https://onedrive.live.com/example-ui-challenge',
        created_by: userIds['prof.jones@university.edu'],
        target: 'specific',
        submission_type: 'group',
        course: 'UI/UX Design',
        groups: ['Gamma Force'],
      },
      {
        title: 'SQL Query Exercises',
        description: 'Complete the 10 SQL query exercises covering JOINs, subqueries, aggregation, and window functions. Submit your .sql file.',
        due_date: inFuture(5),
        onedrive_link: 'https://onedrive.live.com/example-sql-exercises',
        created_by: userIds['prof.smith@university.edu'],
        target: 'all',
        submission_type: 'individual',
        course: 'Database Systems',
        groups: [],
      },
    ];

    const assignmentIds = {};

    for (const a of assignmentDefs) {
      const res = await client.query(
        `INSERT INTO assignments (title, description, due_date, onedrive_link, created_by, target, submission_type, course_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [a.title, a.description, a.due_date, a.onedrive_link, a.created_by, a.target, a.submission_type, courseIds[a.course]]
      );
      assignmentIds[a.title] = res.rows[0].id;

      for (const groupName of a.groups) {
        await client.query(
          `INSERT INTO assignment_targets (assignment_id, group_id) VALUES ($1, $2)`,
          [res.rows[0].id, groupIds[groupName]]
        );
      }
    }

    console.log(`   ✅ ${Object.keys(assignmentIds).length} assignments created`);

    // ── Insert Submissions (mixed states for demo) ─────────────────────────
    console.log('📤 Creating demo submissions…');

    const submissions = [
      // Alpha Squad: DB report = confirmed, API project = step1
      {
        assignment: 'Database Design Report',
        group: 'Alpha Squad',
        status: 'confirmed',
        submission_link: 'https://docs.google.com/document/d/alpha-db-report',
        confirmed_at: inPast(1),
      },
      {
        assignment: 'REST API Implementation',
        group: 'Alpha Squad',
        status: 'step1_confirmed',
        submission_link: 'https://github.com/alice/api-project',
        confirmed_at: null,
      },

      // Beta Team: DB report = accepted (admin reviewed), API project = pending
      {
        assignment: 'Database Design Report',
        group: 'Beta Team',
        status: 'accepted',
        submission_link: 'https://docs.google.com/document/d/beta-db-report',
        confirmed_at: inPast(2),
      },
      // Beta Team: API project left as pending (no row needed)

      // Gamma Force: DB report = pending, UI challenge = rejected
      {
        assignment: 'Frontend UI Challenge',
        group: 'Gamma Force',
        status: 'rejected',
        submission_link: 'https://github.com/eve/ui-challenge',
        confirmed_at: null,
      },
    ];

    for (const s of submissions) {
      await client.query(
        `INSERT INTO submissions (assignment_id, group_id, status, submission_link, confirmed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          assignmentIds[s.assignment],
          groupIds[s.group],
          s.status,
          s.submission_link,
          s.confirmed_at,
        ]
      );
    }

    console.log(`   ✅ ${submissions.length} submissions created`);

    await client.query('COMMIT');

    console.log('\n🎉 Seed complete! Demo accounts:');
    console.log('────────────────────────────────────────────');
    console.log('  Admin:   prof.smith@university.edu / password123');
    console.log('  Admin:   prof.jones@university.edu / password123');
    console.log('  Student: alice@university.edu      / password123');
    console.log('  Student: bob@university.edu        / password123');
    console.log('  Student: charlie@university.edu    / password123');
    console.log('  Student: diana@university.edu      / password123');
    console.log('  Student: eve@university.edu        / password123');
    console.log('  Student: frank@university.edu      / password123');
    console.log('────────────────────────────────────────────');
    console.log('\n📚 Courses:');
    console.log('  Database Systems  — Prof. Smith (6 students)');
    console.log('  Web Development   — Prof. Smith (4 students)');
    console.log('  UI/UX Design      — Prof. Jones (2 students)');
    console.log('────────────────────────────────────────────');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
