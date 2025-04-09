import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

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
   * Load cryptocurrency data from a static source or database
   * This could be replaced with a database query or an API call
   */
  private async getCryptoCurrencyList(): Promise<any[]> {
    // This is a sample list - in production, you'd fetch this from a database or API
    return [
      {
        Cryptocurrency: 'AAVE',
        Summary:
          'Decentralized lending platform enabling users to earn interest or borrow crypto assets.',
        'Seriousness (1-5)': 4,
        Rationale:
          'Strong DeFi protocol with real utility, governance, and institutional partnerships.',
        Launched: '2017',
        'Market Cap': '$1.4 billion',
        'Left vs. Right (1-100)': 80,
      },
      {
        Cryptocurrency: 'ADA',
        Summary:
          'Blockchain platform focused on academic research and formal methods, powering Cardano.',
        'Seriousness (1-5)': 3,
        Rationale:
          'Solid tech ambition, but criticized for delays and lack of dApp traction.',
        Launched: '2017',
        'Market Cap': '$16.4 billion',
        'Left vs. Right (1-100)': 70,
      },
      {
        Cryptocurrency: 'ARB',
        Summary:
          'Ethereum layer-2 scaling solution using optimistic rollups by Arbitrum Foundation.',
        'Seriousness (1-5)': 4,
        Rationale:
          'Widely used L2 with growing ecosystem; important in Ethereum scaling roadmap.',
        Launched: '2021',
        'Market Cap': '$2.1 billion',
        'Left vs. Right (1-100)': 65,
      },
      {
        Cryptocurrency: 'AVAX',
        Summary:
          'Layer-1 blockchain known for fast finality and subnet architecture.',
        'Seriousness (1-5)': 4,
        Rationale:
          'Popular L1 with active developer ecosystem, though L2 competitors gaining share.',
        Launched: '2020',
        'Market Cap': '$5.9 billion',
        'Left vs. Right (1-100)': 70,
      },
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
      // Add more cryptocurrencies as needed
    ];
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
