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
   * and add risk_tolerance field
   */
  private async getCryptoCurrencyList(): Promise<any[]> {
    try {
      const filePath = path.resolve('config/crypto/tradable_crypto.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      const cryptoList = JSON.parse(fileData);
      
      // Ajouter le champ risk_tolerance à chaque crypto
      cryptoList.forEach(crypto => {
        crypto.risk_tolerance = 100 - Number(crypto['Left vs. Right (1-100)']);
      });
      
      this.logger.log(
        `Loaded ${cryptoList.length} cryptocurrencies from tradable_crypto.json with risk_tolerance field`,
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
          risk_tolerance: 40, // 100 - 60
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
          risk_tolerance: 35, // 100 - 65
        },
      ];
    }
  }

  /**
   * Builds the prompt for Claude API
   */
  private buildClaudePrompt(
    biography: string, 
    cryptoList: any[], 
    curveSide?: string, 
    riskProfile?: number
  ): string {
    return `
I need you to select 5 cryptocurrencies that match this agent's risk profile and preferences.

AGENT BIOGRAPHY:
"""
${biography}
"""

AGENT DETAILS:
${curveSide ? `Curve Side: ${curveSide}` : ''}
${riskProfile ? `Risk Tolerance: ${riskProfile}/100` : ''}

CRYPTOCURRENCY OPTIONS:
${JSON.stringify(cryptoList, null, 2)}

SELECTION CRITERIA:
1. PRIMARY: Select a set of cryptocurrencies based on two criteria:
Risk Alignment: The overall selection should reflect the agent’s Risk Tolerance (${riskProfile}/100), aiming for an average risk_tolerance score close to that value.
Agent Preferences: Respect any specific constraints or preferences stated in the agent’s description (e.g., mandatory inclusion of certain assets).
When the description imposes low- or high-risk assets, adjust the remaining selections accordingly to balance the average risk profile.
2. SECONDARY: If the agent's biography mentions specific cryptocurrencies, blockchain technologies, or investment themes, prioritize those.
3. RANDOMNES : Keep all cryptos selected in 'secondary' — they must be included. For the remaining slots to reach a total of 5, randomly pick from the cryptos selected in 'primary' and for two identical agent's profile, pick the most diversed cryptos.

You MUST select EXACTLY 5 cryptocurrencies from the provided list, no more, no less.

IMPORTANT: Your response must ONLY contain the cryptocurrency tickers separated by commas, with no explanations or additional text. For example: "DOGE,SHIB,PEPE,WIF,BOME"
`;
  }

  /**
   * Calls Claude API to select cryptocurrencies based on agent biography
   * @param biography The agent's biography
   * @param curveSide The agent's curve side
   * @param riskProfile The agent's risk profile
   * @returns Array of selected cryptocurrency tickers
   */
  async selectCryptosForAgent(
    biography: string, 
    curveSide?: string, 
    riskProfile?: number
  ): Promise<string[]> {
    try {
      const fullCryptoList = await this.getCryptoCurrencyList();
      
      this.logger.log(`Agent parameters - curveSide: ${curveSide}, riskProfile: ${riskProfile}`);
      
      // Construire le prompt avec la liste complète
      const prompt = this.buildClaudePrompt(biography, fullCryptoList, curveSide, riskProfile);
      
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
        }
      );

      // Parse la réponse
      const claudeResponse = response.data.content[0].text;
      this.logger.log(`Claude API response: ${claudeResponse}`);

      // Extrait les cryptos de la réponse
      const cryptos = claudeResponse
        .trim()
        .split(',')
        .map((c) => c.trim());
      
      this.logger.log(`Selected cryptocurrencies: ${cryptos.join(', ')}`);
      
      return cryptos;
    } catch (error) {
      this.logger.error(`Error selecting cryptocurrencies: ${error.message}`);
      
      // Retourner des valeurs par défaut adaptées au profil de risque
      if (riskProfile && riskProfile > 70) {
        return ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BOME'];
      } else if (riskProfile && riskProfile < 30) {
        return ['BTC', 'ETH', 'LINK', 'AAVE', 'MKR'];
      } else {
        return ['BTC', 'ETH', 'SOL', 'DOT', 'DOGE'];
      }
    }
  }

  private extractRiskProfileFromObjectives(objectives: string[]): number | undefined {
    for (const objective of objectives) {
      const match = objective.match(/Risk profile: (\d+)\/100/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return undefined;
  }
}
