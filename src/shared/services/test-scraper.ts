import { NestFactory } from '@nestjs/core';
import { StarkscanScraperService } from './starkscan-scraper.service';

async function testScraper() {
  console.log('🚀 Testing Starkscan scraper...');
  
  const scraper = new StarkscanScraperService();
  
  // Test with Sepolia token
  const contractAddress = '0x07a180f7b88a18d9003b8279a37f458de9fdeee4e592453f8d61269620e62d3c';
  
  const holders = await scraper.getTokenHolders(contractAddress);
  console.log(`✅ Found ${holders} holders for contract ${contractAddress}`);
}

testScraper(); 