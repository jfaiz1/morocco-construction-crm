// database.js - Prisma Client Initialization
// Handles PostgreSQL connection with proper error handling and connection pooling

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Params: ' + JSON.stringify(e.params));
    console.log('Duration: ' + e.duration + 'ms');
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nClosing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nClosing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
