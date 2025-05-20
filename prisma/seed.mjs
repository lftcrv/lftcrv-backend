import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Seed TokenMaster data
    const filePath = path.join(process.cwd(), 'token_master_list_fixed.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const tokenData = JSON.parse(fileContents);

    if (!Array.isArray(tokenData)) {
      throw new Error(
        'Token data is not an array. Check the JSON file format.',
      );
    }

    console.log(
      `Found ${tokenData.length} tokens to seed into TokenMaster table.`,
    );

    // Map JSON fields to Prisma model fields
    // Note: Prisma automatically handles mapping to DB column names defined with @map
    const dataToCreate = tokenData.map((token) => ({
      canonicalSymbol: token.CanonicalSymbol,
      chainID: token.ChainID,
      dexScreenerSymbol: token.DexScreenerSymbol,
      contractAddress: token.ContractAddress,
      foundQuoteSymbol: token.FoundQuoteSymbol,
      priceUSD: token.PriceUSD, // Prisma will handle null if the type is Float?
      method: token.Method,
    }));

    // Use createMany for efficiency. This assumes your database supports it well (PostgreSQL does).
    // createMany skips records if a unique constraint is violated (e.g., if you run seed multiple times).
    // If you want to update existing records, you might need a more complex upsert logic.
    const result = await prisma.tokenMaster.createMany({
      data: dataToCreate,
      skipDuplicates: true, // This is important to prevent errors if you re-run the seed
    });

    console.log(
      `Successfully seeded ${result.count} tokens into TokenMaster table.`,
    );

  } catch (e) {
    console.error('Error during seeding TokenMaster:', e);
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
