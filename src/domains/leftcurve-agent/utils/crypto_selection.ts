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
      
      // Fenêtres de sélection plus strictes
      let filteredCryptoList: any[] = [];
      
      if (riskProfile && riskProfile > 85) {
        // Agents extrêmement degen: scores <= 30
        filteredCryptoList = fullCryptoList.filter(crypto => 
          Number(crypto['Left vs. Right (1-100)']) <= 30
        );
        this.logger.log(`Ultra-LEFT: Filtered cryptos with scores <= 30 for high risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      } 
      else if (riskProfile && riskProfile > 70) {
        // Agents très degen: scores <= 40
        filteredCryptoList = fullCryptoList.filter(crypto => 
          Number(crypto['Left vs. Right (1-100)']) <= 40
        );
        this.logger.log(`Very LEFT: Filtered cryptos with scores <= 40 for high risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      } 
      else if (riskProfile && riskProfile > 60) {
        // Agents modérément degen: scores 35-55
        filteredCryptoList = fullCryptoList.filter(crypto => {
          const score = Number(crypto['Left vs. Right (1-100)']);
          return score > 35 && score <= 55;
        });
        this.logger.log(`Moderate LEFT: Filtered cryptos with scores 35-55 for moderate-high risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      }
      else if (riskProfile && riskProfile > 40) {
        // Agents légèrement degen: scores 45-65
        filteredCryptoList = fullCryptoList.filter(crypto => {
          const score = Number(crypto['Left vs. Right (1-100)']);
          return score > 45 && score <= 65;
        });
        this.logger.log(`Slight LEFT: Filtered cryptos with scores 45-65 for moderate risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      }
      else if (riskProfile && riskProfile > 30) {
        // Agents légèrement serious: scores 55-75
        filteredCryptoList = fullCryptoList.filter(crypto => {
          const score = Number(crypto['Left vs. Right (1-100)']);
          return score > 55 && score <= 75;
        });
        this.logger.log(`Slight RIGHT: Filtered cryptos with scores 55-75 for moderate-low risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      }
      else if (riskProfile && riskProfile > 15) {
        // Agents très serious: scores 65-85
        filteredCryptoList = fullCryptoList.filter(crypto => {
          const score = Number(crypto['Left vs. Right (1-100)']);
          return score > 65 && score <= 85;
        });
        this.logger.log(`Very RIGHT: Filtered cryptos with scores 65-85 for low risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      }
      else if (riskProfile) {
        // Agents extrêmement serious: scores > 75
        filteredCryptoList = fullCryptoList.filter(crypto => 
          Number(crypto['Left vs. Right (1-100)']) > 75
        );
        this.logger.log(`Ultra-RIGHT: Filtered cryptos with scores > 75 for ultra-low risk agent (${riskProfile}): ${filteredCryptoList.length} options`);
      }
      else {
        // Agents sans profil de risque: gamme complète
        filteredCryptoList = fullCryptoList;
        this.logger.log(`No risk profile: Using complete range`);
      }
      
      // Si moins de 5 cryptos disponibles, prendre les plus proches
      if (filteredCryptoList.length < 5) {
        this.logger.warn(`Not enough cryptocurrencies (${filteredCryptoList.length}). Using closest matches.`);
        
        const sortedList = [...fullCryptoList].sort((a, b) => {
          const scoreA = Number(a['Left vs. Right (1-100)']);
          const scoreB = Number(b['Left vs. Right (1-100)']);
          
          // Pour agents degen, prioriser les scores bas
          if (riskProfile && riskProfile > 50) {
            return scoreA - scoreB;
          } 
          // Pour agents sérieux, prioriser les scores élevés
          else if (riskProfile && riskProfile <= 50) {
            return scoreB - scoreA;
          }
          // Sans profil de risque, trier par score (croissant par défaut)
          return scoreA - scoreB;
        });
        
        // Prendre 10 cryptos qui correspondent le mieux
        filteredCryptoList = sortedList.slice(0, 10);
        
        // Afficher les cryptos sélectionnées avec leurs scores
        const cryptoScores = filteredCryptoList.map(c => 
          `${c.Cryptocurrency}:${c['Left vs. Right (1-100)']}`
        ).join(', ');
        this.logger.log(`Using sorted cryptos: ${cryptoScores}`);
      }
      
      // Sélection aléatoire des 5 cryptos
      const selectedCryptos: string[] = [];
      const selectedIndices = new Set<number>();
      
      while (selectedCryptos.length < 5) {
        const randomIndex = Math.floor(Math.random() * filteredCryptoList.length);
        
        if (!selectedIndices.has(randomIndex)) {
          selectedIndices.add(randomIndex);
          const selectedCrypto = filteredCryptoList[randomIndex];
          selectedCryptos.push(selectedCrypto.Cryptocurrency);
          this.logger.log(`Selected: ${selectedCrypto.Cryptocurrency} with score: ${selectedCrypto['Left vs. Right (1-100)']}`);
        }
      }
      
      this.logger.log(`Final selection: ${selectedCryptos.join(', ')}`);
      
      return selectedCryptos;
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

  /**
   * Builds the prompt for Claude API
   */
  private buildClaudePrompt(
    biography: string, 
    cryptoList: any[], 
    curveSide?: string, 
    riskProfile?: number
  ): string {
    // Déterminer le profil de l'agent
    let agentProfile = '';
    if (riskProfile && riskProfile > 70) {
      agentProfile = 'HIGH RISK (degen trader)';
    } else if (riskProfile && riskProfile < 30) {
      agentProfile = 'LOW RISK (serious investor)';
    } else {
      agentProfile = 'MODERATE RISK (balanced)';
    }

    return `
Select 5 cryptocurrencies that best match this agent's trading style and risk profile.

AGENT BIOGRAPHY:
"""
${biography}
"""

AGENT PROFILE: ${agentProfile}
${curveSide ? `CURVE SIDE: ${curveSide}` : ''}
${riskProfile ? `RISK PROFILE: ${riskProfile}/100` : ''}

CRYPTOCURRENCY OPTIONS:
${JSON.stringify(cryptoList, null, 2)}

Based on the agent's profile and these cryptocurrency options ONLY, select EXACTLY 5 cryptocurrencies this agent would most likely trade.

For MODERATE agents: Select a balanced mix from across the spectrum (and you can look at the seriousness score to help you).
Ensure selection directly reflects the agent's explicit risk profile and curve side parameters.

But also, don't hesitate to select some cryptos with total randomness, with no logic at all.

IMPORTANT: Your response must ONLY contain the cryptocurrency tickers separated by commas, with no explanations or additional text. For example: "DOGE,SHIB,PEPE,WIF,BOME"
`;
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
