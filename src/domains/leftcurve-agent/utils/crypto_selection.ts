import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CryptoSelectionService {
  private readonly logger = new Logger(CryptoSelectionService.name);
  private readonly claudeApiKey: string;
  private readonly claudeApiUrl: string;

  constructor(private configService: ConfigService) {
    this.claudeApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.claudeApiUrl = this.configService.get<string>(
      'CLAUDE_API_URL',
      'https://api.anthropic.com/v1/messages',
    );
  }

  /**
   * Load cryptocurrency data from the tradable_crypto.json file
   */
  private async getCryptoCurrencyList(): Promise<any[]> {
    try {
      const filePath = path.resolve('config/crypto/tradable_crypto.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      const cryptoList = JSON.parse(fileData);
      this.logger.log(
        `Loaded ${cryptoList.length} cryptocurrencies from tradable_crypto.json`,
      );

      return cryptoList;
    } catch (error) {
      this.logger.error(`Error loading cryptocurrency list: ${error.message}`);

      // Return a fallback list in case of failure
      this.logger.warn('Using fallback cryptocurrency list');
      return [
        {
          Cryptocurrency: 'BTC',
          Summary:
            'The original cryptocurrency, designed as a decentralized digital currency.',
          'Seriousness (1-5)': 5,
          Rationale:
            'The most established cryptocurrency with largest market cap and institutional adoption.',
          Launched: '2009',
          'Market Cap': '$870 billion',
          'Left vs. Right (1-100)': 60,
        },
        {
          Cryptocurrency: 'ETH',
          Summary:
            'Programmable blockchain enabling smart contracts and decentralized applications.',
          'Seriousness (1-5)': 5,
          Rationale:
            'Foundational platform for DeFi, NFTs, and blockchain innovation.',
          Launched: '2015',
          'Market Cap': '$310 billion',
          'Left vs. Right (1-100)': 65,
        },
      ];
    }
  }

  /**
   * Calls Claude API to select cryptocurrencies based on agent biography
   * @param biography The agent's biography
   * @returns Array of selected cryptocurrency tickers
   */
  async selectCryptosForAgent(biography: string): Promise<string[]> {
    try {
      const cryptoList = await this.getCryptoCurrencyList();

      const prompt = this.buildClaudePrompt(biography, cryptoList);
      const response = await axios.post(
        this.claudeApiUrl,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
          },
        },
      );

      // Parse the response
      const claudeResponse = response.data.content[0].text;
      this.logger.log(`Claude API response: ${claudeResponse}`);

      // Extract cryptocurrencies from response
      // Expected format is "BTC, ETH, XRP, SOL, DOT"
      const cryptos = claudeResponse
        .trim()
        .split(',')
        .map((c) => c.trim());

      return cryptos;
    } catch (error) {
      this.logger.error(`Error calling Claude API: ${error.message}`);
      // Return default values in case of failure
      return ['BTC', 'ETH'];
    }
  }

  /**
   * Builds the prompt for Claude API
   */
  private buildClaudePrompt(biography: string, cryptoList: any[]): string {
    return `
Select cryptocurrencies that align with an agent's trading personality.

AGENT BIOGRAPHY:
"""
${biography}
"""

KEY PERSONALITY TRAITS TO CONSIDER:
- Conservative investment approach with focus on established cryptocurrencies
- Values long-term potential over short-term gains
- Eccentric but experienced trader
- Strong believer in Bitcoin and Ethereum fundamentals
- Relies on intuition derived from experience
- Likely prefers cryptocurrencies that align with traditional value investment principles

SELECTION CRITERIA:
- Choose cryptocurrencies that match the agent's risk tolerance and investment philosophy
- Consider the agent's political leanings and how they might influence crypto selection
- Evaluate market capitalization and project longevity for alignment with long-term focus
- Assess technological fundamentals that would appeal to this agent's background
- Weigh the seriousness rating against the agent's preference for established projects

CRYPTOCURRENCY OPTIONS:
${JSON.stringify(cryptoList, null, 2)}

Based on the agent's profile and the provided cryptocurrency data, select AT MOST 5 cryptocurrencies this agent would most likely trade. 

IMPORTANT: Your response must ONLY contain the cryptocurrency tickers separated by commas, with no explanations or additional text. For example: "BTC,ETH,SOL,ADA,DOT" or just "BTC,ETH" if only two are appropriate.
`;
  }
}
