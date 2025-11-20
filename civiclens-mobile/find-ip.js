#!/usr/bin/env node

const os = require('os');

console.log('\n=== Finding Your Computer\'s IP Address ===\n');

const interfaces = os.networkInterfaces();
const addresses = [];

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    // Skip internal and non-IPv4 addresses
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push({
        name: name,
        address: iface.address,
      });
    }
  }
}

if (addresses.length === 0) {
  console.log('No network interfaces found!');
  console.log('Make sure you are connected to WiFi.');
  process.exit(1);
}

console.log('Found network interfaces:\n');
addresses.forEach((addr, index) => {
  console.log(`${index + 1}. ${addr.name}: ${addr.address}`);
});

console.log('\n=== Configuration Instructions ===\n');
console.log('1. Choose the IP address that matches your WiFi network');
console.log('   (Usually starts with 192.168.x.x or 10.0.x.x)\n');

if (addresses.length > 0) {
  const recommendedIp = addresses[0].address;
  console.log(`2. Edit: civiclens-mobile/src/shared/config/env.ts`);
  console.log(`   Change: const COMPUTER_IP = 'YOUR_COMPUTER_IP';`);
  console.log(`   To:     const COMPUTER_IP = '${recommendedIp}';\n`);
  
  console.log(`3. Start backend with:`);
  console.log(`   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000\n`);
  
  console.log(`4. Test from phone browser:`);
  console.log(`   http://${recommendedIp}:8000/docs\n`);
}

console.log('===========================================\n');
