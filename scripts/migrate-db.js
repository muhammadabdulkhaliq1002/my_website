const { exec } = require('child_process');

// Run database migrations
exec('npx prisma migrate deploy', (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration error: ${error}`);
    return;
  }
  console.log(`Migration output: ${stdout}`);
});