// Run with: npm run seed
// Adds/updates a user in data/users.json with a securely hashed password.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  console.log('--- Redot Global Tracker: add or update a user ---');
  const username = (await ask('Username: ')).trim();
  const name = (await ask('Display name: ')).trim();
  const password = (await ask('Password (min 6 chars): ')).trim();

  if (!username || password.length < 6) {
    console.log('Username required and password must be at least 6 characters.');
    rl.close();
    return;
  }

  const users = readUsers();
  const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  const passwordHash = bcrypt.hashSync(password, 10);

  if (existing) {
    existing.name = name || existing.name;
    existing.passwordHash = passwordHash;
    console.log(`Updated existing user "${username}".`);
  } else {
    users.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      username,
      name: name || username,
      passwordHash
    });
    console.log(`Created new user "${username}".`);
  }

  writeUsers(users);
  rl.close();
})();
