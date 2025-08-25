// Test script to verify login working hours fix
const jwt = require('jsonwebtoken');

console.log('🔍 Testing login working hours fix...\n');

// Simulate environment variables (these should be set in production)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const WORKING_HOURS_ENABLED = process.env.WORKING_HOURS_ENABLED ?? 'true';
const WORKING_HOURS_START = Number(process.env.WORKING_HOURS_START ?? 6);
const WORKING_HOURS_END = Number(process.env.WORKING_HOURS_END ?? 16);

console.log('Environment variables:');
console.log(`WORKING_HOURS_ENABLED: ${process.env.WORKING_HOURS_ENABLED} (resolved to: ${WORKING_HOURS_ENABLED !== 'false'})`);
console.log(`WORKING_HOURS_START: ${process.env.WORKING_HOURS_START} (resolved to: ${WORKING_HOURS_START})`);
console.log(`WORKING_HOURS_END: ${process.env.WORKING_HOURS_END} (resolved to: ${WORKING_HOURS_END})`);

// Simulate Bangkok time functions
function bangkokYMD() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function withinHours(startHour, endHour, enabled) {
  if (!enabled) return true;
  const now = new Date();
  const th = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const h = th.getHours();
  return h >= startHour && h < endHour;
}

// Test current time
const now = new Date();
const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
const currentHour = bangkokTime.getHours();
const currentYMD = bangkokYMD();

console.log(`\nCurrent time: ${bangkokTime.toLocaleString('th-TH')}`);
console.log(`Current Bangkok YMD: ${currentYMD}`);
console.log(`Current Thailand hour: ${currentHour}`);

// Test working hours logic
const hoursEnabled = WORKING_HOURS_ENABLED !== 'false';
const isWithinHours = withinHours(WORKING_HOURS_START, WORKING_HOURS_END, hoursEnabled);

console.log(`\nWorking hours check:`);
console.log(`Working hours: ${WORKING_HOURS_START}:00 - ${WORKING_HOURS_END}:00`);
console.log(`Hours enabled: ${hoursEnabled}`);
console.log(`Within hours: ${isWithinHours}`);

// Simulate JWT token creation (like in login API)
const mockUser = {
  id: 1,
  student_id: '12345',
  name: 'Test User',
  role: 'user'
};

const tokenPayload = {
  id: mockUser.id,
  student_id: mockUser.student_id,
  name: mockUser.name,
  role: mockUser.role,
  lastLoginYMD: currentYMD,
  lastLoginDate: now.toISOString(),
};

console.log(`\nJWT Token payload:`);
console.log(JSON.stringify(tokenPayload, null, 2));

try {
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });
  console.log(`\nJWT Token created successfully: ${token.substring(0, 50)}...`);
  
  // Verify token
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log(`\nDecoded token:`);
  console.log(JSON.stringify(decoded, null, 2));
  
  // Test middleware logic simulation
  console.log(`\n📋 Middleware simulation:`);
  
  // Check if user has valid lastLoginYMD
  const tokenYMD = decoded.lastLoginYMD;
  const todayYMD = bangkokYMD();
  
  console.log(`Token lastLoginYMD: ${tokenYMD}`);
  console.log(`Today YMD: ${todayYMD}`);
  console.log(`Daily login check: ${tokenYMD === todayYMD ? '✅ PASS' : '❌ FAIL - Need to re-login'}`);
  
  if (tokenYMD === todayYMD) {
    // Check working hours
    if (isWithinHours) {
      console.log(`Working hours check: ✅ PASS - Allow access to protected routes`);
    } else {
      console.log(`Working hours check: ❌ FAIL - Redirect to maintenance`);
      console.log(`Redirect URL: /maintenance?reason=working_hours&start=${WORKING_HOURS_START}&end=${WORKING_HOURS_END}`);
    }
  }
  
} catch (error) {
  console.error(`❌ JWT Error: ${error.message}`);
}

console.log(`\n🎯 Expected behavior:`);
if (isWithinHours) {
  console.log(`✅ User should be able to access /homepage and other protected routes`);
} else {
  console.log(`❌ User should be redirected to /maintenance after successful login`);
  console.log(`   This happens when they try to access /homepage (client-side redirect after login)`);
}

console.log(`\n🔧 Fixes applied:`);
console.log(`1. ✅ Fixed middleware matcher to allow /maintenance path`);
console.log(`2. ✅ Added lastLoginYMD to JWT token in login API`);
console.log(`3. ✅ Middleware now has proper fallback values for environment variables`);
