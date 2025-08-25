// Test middleware working hours logic
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
  console.log(`Current Thailand hour: ${h}`);
  console.log(`Working hours: ${startHour}:00 - ${endHour}:00`);
  console.log(`Hours enabled: ${enabled}`);
  const result = h >= startHour && h < endHour;
  console.log(`Within hours: ${result}`);
  return result;
}

console.log('🔍 Testing middleware working hours logic...\n');

// Test current environment variables (simulated)
const HOURS_ENABLED = (process.env.WORKING_HOURS_ENABLED ?? "true") !== "false";
const START_HOUR = Number(process.env.WORKING_HOURS_START ?? 6);
const END_HOUR = Number(process.env.WORKING_HOURS_END ?? 16);

console.log('Environment variables:');
console.log(`WORKING_HOURS_ENABLED: ${process.env.WORKING_HOURS_ENABLED} (resolved to: ${HOURS_ENABLED})`);
console.log(`WORKING_HOURS_START: ${process.env.WORKING_HOURS_START} (resolved to: ${START_HOUR})`);
console.log(`WORKING_HOURS_END: ${process.env.WORKING_HOURS_END} (resolved to: ${END_HOUR})`);
console.log();

// Test current time
const now = new Date();
const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
console.log(`Current time: ${thailandTime.toLocaleString('th-TH')}`);
console.log(`Current Bangkok YMD: ${bangkokYMD()}`);
console.log();

// Test working hours check
console.log('Testing working hours check:');
const isWithinHours = withinHours(START_HOUR, END_HOUR, HOURS_ENABLED);

console.log('\n📋 Result:');
if (HOURS_ENABLED && !isWithinHours) {
  console.log('❌ OUTSIDE WORKING HOURS - Should redirect to maintenance');
  console.log(`   URL should be: /maintenance?reason=working_hours&start=${START_HOUR}&end=${END_HOUR}`);
} else if (!HOURS_ENABLED) {
  console.log('✅ Working hours disabled - Should allow access');
} else {
  console.log('✅ Within working hours - Should allow access');
}
