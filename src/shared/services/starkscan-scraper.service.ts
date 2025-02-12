import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class StarkscanScraperService {
  private readonly logger = new Logger(StarkscanScraperService.name);

  async getTokenHolders(contractAddress: string): Promise<number> {
    try {
      // Launch browser with more debugging
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // Create a new page
      const page = await browser.newPage();

      // Enable request interception
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Go to the token page on Sepolia
      const url = `https://sepolia.starkscan.co/token/${contractAddress}#overview`;
      await page.goto(url, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000,
      });

      // Wait for any dl element to be present
      await page.waitForSelector('dl', { timeout: 10000 });

      // Get holders count using a more general approach
      const holders = await page.evaluate(() => {
        // Find all divs that might contain the text
        const allDivs = document.querySelectorAll('div');
        console.log('Total divs found:', allDivs.length);

        for (const div of allDivs) {
          const text = div.textContent || '';
          if (text.includes('Number of Owners')) {
            console.log('Found div with Number of Owners');
            // Get the parent dt element
            const dt = div.closest('dt');
            if (dt) {
              console.log('Found parent dt');
              // Get the next sibling dd element
              const dd = dt.nextElementSibling;
              if (dd && dd.textContent) {
                console.log('Found dd with text:', dd.textContent);
                const value = parseInt(dd.textContent.trim(), 10);
                if (!isNaN(value)) {
                  return value;
                }
              }
            }
          }
        }
        
        console.log('Could not find Number of Owners in any div');
        return 0;
      });

      // Close browser
      await browser.close();

      if (holders === 0) {
        this.logger.warn(
          `Could not find holders count for contract ${contractAddress}`,
        );
      } else {
        this.logger.debug(
          `Found ${holders} holders for contract ${contractAddress}`,
        );
      }

      return holders;
    } catch (error) {
      this.logger.error(
        `Error fetching holders for contract ${contractAddress}: ${error.message}`,
      );
      return 0;
    }
  }
} 