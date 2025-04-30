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
      // Récupérer la liste complète des cryptos
      const fullCryptoList = await this.getCryptoCurrencyList();
      
      // Log pour vérifier les valeurs
      this.logger.log(`Agent parameters - curveSide: ${curveSide}, riskProfile: ${riskProfile}`);
      
      // Trier la liste par score Left vs. Right
      const sortedList = [...fullCryptoList].sort((a, b) => 
        Number(a['Left vs. Right (1-100)']) - Number(b['Left vs. Right (1-100)'])
      );
      
      // Déterminer le quartile approprié pour l'agent
      let quartileList: any[] = [];
      
      // Cas par défaut: profil de risque non spécifié ou équilibré
      if (!riskProfile || (riskProfile >= 40 && riskProfile <= 60)) {
        // Pour les agents équilibrés, prendre des cryptos de l'ensemble du spectre
        quartileList = sortedList;
        this.logger.log(`Using full range for balanced agent`);
      }
      // Profil très degen/left curve
      else if (riskProfile > 75) {
        // Premier quartile: les cryptos les plus "left"
        const quartileSize = Math.ceil(sortedList.length / 4);
        quartileList = sortedList.slice(0, quartileSize);
        this.logger.log(`Using 1st quartile (most LEFT) for high risk agent (${riskProfile}): ${quartileList.length} options`);
      }
      // Profil modérément degen/left curve
      else if (riskProfile > 60) {
        // Deuxième quartile
        const quartileSize = Math.ceil(sortedList.length / 4);
        quartileList = sortedList.slice(quartileSize, quartileSize * 2);
        this.logger.log(`Using 2nd quartile for moderate-high risk agent (${riskProfile}): ${quartileList.length} options`);
      }
      // Profil modérément serious/right curve
      else if (riskProfile >= 25) {
        // Troisième quartile
        const quartileSize = Math.ceil(sortedList.length / 4);
        quartileList = sortedList.slice(quartileSize * 2, quartileSize * 3);
        this.logger.log(`Using 3rd quartile for moderate-low risk agent (${riskProfile}): ${quartileList.length} options`);
      }
      // Profil très serious/right curve
      else {
        // Quatrième quartile: les cryptos les plus "right"
        const quartileSize = Math.ceil(sortedList.length / 4);
        quartileList = sortedList.slice(quartileSize * 3);
        this.logger.log(`Using 4th quartile (most RIGHT) for low risk agent (${riskProfile}): ${quartileList.length} options`);
      }
      
      // Vérifier que la liste du quartile contient au moins 5 cryptos
      if (quartileList.length < 5) {
        this.logger.warn(`Not enough cryptocurrencies in selected quartile (${quartileList.length}). Using extended range.`);
        // Étendre à un demi-quartile supplémentaire si nécessaire
        const halfQuartileSize = Math.ceil(sortedList.length / 8);
        
        if (riskProfile > 75) {
          quartileList = sortedList.slice(0, Math.ceil(sortedList.length / 4) + halfQuartileSize);
        } else if (riskProfile > 60) {
          quartileList = sortedList.slice(Math.ceil(sortedList.length / 4) - halfQuartileSize, Math.ceil(sortedList.length / 4) * 2 + halfQuartileSize);
        } else if (riskProfile >= 25) {
          quartileList = sortedList.slice(Math.ceil(sortedList.length / 4) * 2 - halfQuartileSize, Math.ceil(sortedList.length / 4) * 3 + halfQuartileSize);
        } else {
          quartileList = sortedList.slice(Math.ceil(sortedList.length / 4) * 3 - halfQuartileSize);
        }
      }
      
      // Sélectionner 5 cryptos aléatoirement dans le quartile
      const selectedCryptos: string[] = [];
      const selectedIndices = new Set<number>();
      
      while (selectedCryptos.length < 5) {
        const randomIndex = Math.floor(Math.random() * quartileList.length);
        
        // Éviter les doublons
        if (!selectedIndices.has(randomIndex)) {
          selectedIndices.add(randomIndex);
          selectedCryptos.push(quartileList[randomIndex].Cryptocurrency);
        }
      }
      
      // Log des cryptos sélectionnées
      this.logger.log(`Randomly selected cryptocurrencies: ${selectedCryptos.join(', ')}`);
      
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
