const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.user.findFirst();
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    await prisma.$disconnect();
    return false;
  }
}

async function initializeDatabase() {
  try {
    // First try to connect to existing database
    console.log('Testing database connection...');
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      console.log('Existing database is working, skipping initialization');
      return;
    }

    console.log('Database needs initialization...');

    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run migrations
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.log('Continuing with application startup...');
  }
}

// Handle cleanup on process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Cleaning up...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Cleaning up...');
  process.exit(0);
});

// Convert to async/await execution
(async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.log('Continuing with application startup...');
  }
})();