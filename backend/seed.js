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

    // ── Insert Groups ──────────────────────────────────────────────────────
    console.log('📁 Creating groups…');

    const groupDefs = [
      { name: 'Alpha Squad', creator: 'alice@university.edu',   members: ['alice@university.edu', 'bob@university.edu'] },
      { name: 'Beta Team',   creator: 'charlie@university.edu', members: ['charlie@university.edu', 'diana@university.edu'] },
      { name: 'Gamma Force', creator: 'eve@university.edu',     members: ['eve@university.edu', 'frank@university.edu'] },
    ];

    const groupIds = {};

    for (const g of groupDefs) {
      const res = await client.query(
        `INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id`,
        [g.name, userIds[g.creator]]
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

    // ── Insert Assignments ─────────────────────────────────────────────────
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
        groups: [],
      },
      {
        title: 'REST API Implementation',
        description: 'Build a RESTful API with CRUD operations for a student management system. Include auth middleware and proper error handling.',
        due_date: inFuture(3),
        onedrive_link: 'https://onedrive.live.com/example-api-project',
        created_by: userIds['prof.smith@university.edu'],
        target: 'specific',
        groups: ['Alpha Squad', 'Beta Team'],
      },
      {
        title: 'Frontend UI Challenge',
        description: 'Create a responsive dashboard with charts, tables, and dark mode support using React and Tailwind CSS.',
        due_date: inPast(1), // already overdue — for demo
        onedrive_link: 'https://onedrive.live.com/example-ui-challenge',
        created_by: userIds['prof.jones@university.edu'],
        target: 'specific',
        groups: ['Gamma Force'],
      },
    ];

    const assignmentIds = {};

    for (const a of assignmentDefs) {
      const res = await client.query(
        `INSERT INTO assignments (title, description, due_date, onedrive_link, created_by, target)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [a.title, a.description, a.due_date, a.onedrive_link, a.created_by, a.target]
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
