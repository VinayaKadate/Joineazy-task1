const http = require('http');

const API_URL = 'http://localhost:5000';

async function testPhase1() {
  console.log('🧪 Starting Phase 1 Tests (Auth)...');
  
  // Helper to make requests
  const request = (path, method, body, token = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch(e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  const randomString = Math.random().toString(36).substring(7);
  const testStudent = {
    name: `Student ${randomString}`,
    email: `student_${randomString}@test.com`,
    password: 'password123',
    role: 'student'
  };

  try {
    // 1. Test Registration
    console.log('\n--- 1. Testing Registration ---');
    console.log(`Sending POST /auth/register for ${testStudent.email}`);
    const regRes = await request('/auth/register', 'POST', testStudent);
    console.log(`Status: ${regRes.status}`);
    console.log('Response:', regRes.body);
    
    if (regRes.status !== 201) throw new Error('Registration failed!');
    
    // 2. Test Login
    console.log('\n--- 2. Testing Login ---');
    console.log(`Sending POST /auth/login for ${testStudent.email}`);
    const loginRes = await request('/auth/login', 'POST', {
      email: testStudent.email,
      password: testStudent.password
    });
    console.log(`Status: ${loginRes.status}`);
    console.log('Response:', loginRes.body);

    if (loginRes.status !== 200 || !loginRes.body.token) throw new Error('Login failed!');

    console.log('\n✅ ALL PHASE 1 TESTS PASSED!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
}

testPhase1();
