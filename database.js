// database.js - Prisma Client Singleton
const { PrismaClient } = require('@prisma/client');

// Global BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Handle graceful shutdown
async function disconnect() {
  await prisma.$disconnect();
}

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = prisma;
