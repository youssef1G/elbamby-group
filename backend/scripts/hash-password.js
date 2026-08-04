import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('Admin password hasher for BG\n');
  const password = await ask('Password to hash: ');
  const rounds = parseInt((await ask('Rounds (default 12): ')) || '12', 10);
  const hash = await bcrypt.hash(password.trim(), rounds);
  console.log(`\nHashed password:\n${hash}\n`);
  rl.close();
}

main();