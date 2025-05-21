const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importTokenMaster() {
  try {
    // Path to the JSON file with token data
    const filePath =
      process.argv[2] || path.join(process.cwd(), 'token_master_export.json');

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read and parse the JSON file
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const tokenData = JSON.parse(fileContents);

    if (!Array.isArray(tokenData)) {
      throw new Error(
        'Token data is not an array. Check the JSON file format.',
      );
    }

    console.log(
      `Found ${tokenData.length} tokens to import into TokenMaster table.`,
    );

    // Map JSON fields to Prisma model fields
    const dataToCreate = tokenData.map((token) => ({
      canonicalSymbol: token.CanonicalSymbol,
      chainID: token.ChainID,
      dexScreenerSymbol: token.DexScreenerSymbol,
      contractAddress: token.ContractAddress,
      foundQuoteSymbol: token.FoundQuoteSymbol,
      priceUSD: token.PriceUSD, // This will include the actual price values
      method: token.Method,
    }));

    // Use createMany for efficiency with skipDuplicates to prevent errors on re-import
    const result = await prisma.tokenMaster.createMany({
      data: dataToCreate,
      skipDuplicates: true,
    });

    console.log(
      `Successfully imported ${result.count} tokens into TokenMaster table.`,
    );
    console.log(
      `${tokenData.length - result.count} tokens were skipped (likely duplicates).`,
    );
  } catch (error) {
    console.error('Error during importing TokenMaster:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Use top-level await to run the import function
importTokenMaster()
  .then(() => console.log('Import completed successfully'))
  .catch((error) => {
    console.error('Error during import:', error);
    process.exit(1);
  });
