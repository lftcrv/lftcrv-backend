import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    // seed data
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Use top-level await to run the seed function
try {
  await seed();
  console.log('Seeding completed successfully');
} catch (error) {
  console.error('Error during seeding:', error);
  process.exit(1);
}
