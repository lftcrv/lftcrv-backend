const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportTokenMaster() {
  try {
    // Fetch all token master records from the database
    const tokens = await prisma.tokenMaster.findMany();

    console.log(`Found ${tokens.length} tokens in the database.`);

    // Transform the data to match the format in token_master_list_fixed.json
    const formattedTokens = tokens.map((token) => ({
      CanonicalSymbol: token.canonicalSymbol,
      ChainID: token.chainID,
      DexScreenerSymbol: token.dexScreenerSymbol,
      ContractAddress: token.contractAddress,
      FoundQuoteSymbol: token.foundQuoteSymbol,
      PriceUSD: token.priceUSD,
      Method: token.method,
    }));

    // Write to a JSON file
    const outputPath = path.join(process.cwd(), 'token_master_export.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(formattedTokens, null, 2),
      'utf8',
    );

    console.log(
      `Successfully exported ${tokens.length} tokens to ${outputPath}`,
    );
  } catch (error) {
    console.error('Error exporting token master data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the export function
exportTokenMaster()
  .then(() => console.log('Export completed successfully'))
  .catch((error) => {
    console.error('Error during export:', error);
    process.exit(1);
  });
