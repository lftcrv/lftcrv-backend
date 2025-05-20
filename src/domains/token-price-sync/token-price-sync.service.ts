import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface InternalTokenMaster {
  id: string;
  canonicalSymbol: string;
  chainID: string;
  dexScreenerSymbol: string;
  contractAddress: string;
  foundQuoteSymbol: string;
  priceUSD?: number | null;
  method: string;
}

export interface PriceUpdatePayload {
  symbol: string;
  price: number;
}

// Add DexScreener specific interfaces
interface DexScreenerApiToken {
  address: string;
  name: string;
  symbol: string;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerApiToken;
  quoteToken: DexScreenerApiToken;
  priceUsd?: string;
  fdv?: number;
  liquidity?: { usd?: number; base?: number; quote?: number };
}

// interface DexScreenerSearchResponse { // Commented out as /tokens/v1 endpoint is used now
//   schemaVersion: string;
//   pairs: DexScreenerPair[] | null;
// }

@Injectable()
export class TokenPriceSyncService {
  private readonly logger = new Logger(TokenPriceSyncService.name);
  private readonly ownApiBaseUrl: string;
  private readonly ownApiKey: string;
  private readonly dexscreenerApiBaseUrl = 'https://api.dexscreener.com';
  private readonly paradexApiBaseUrl = 'https://api.prod.paradex.trade/v1';
  private readonly userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

  private readonly ADDRESS_BATCH_SIZE = 30;
  private readonly API_CALL_DELAY_SECONDS = 1;

  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const appPort = this.configService.get<string>('PORT', '8080');
    this.ownApiBaseUrl = this.configService.get<string>(
      'APP_API_BASE_URL',
      `http://127.0.0.1:${appPort}/api`,
    );
    this.ownApiKey = this.configService.get<string>('BACKEND_API_KEY');

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/json',
      },
    });
  }

  async syncPrices(): Promise<void> {
    this.logger.log(
      'Starting token price synchronization process (TypeScript version)',
    );
    if (!this.ownApiKey) {
      this.logger.error(
        'API Key for own backend (BACKEND_API_KEY from .env) is not configured. Halting.',
      );
      return;
    }
    if (!this.ownApiBaseUrl) {
      this.logger.error(
        'Own API Base URL (APP_API_BASE_URL or derived from PORT) is not configured. Halting.',
      );
      return;
    }

    let allTokens: InternalTokenMaster[] = [];
    try {
      allTokens = await this.fetchInitialTokens();
      if (allTokens.length === 0) {
        this.logger.warn('No tokens received from API. Exiting price sync.');
        return;
      }
      this.logger.log(
        `Successfully fetched ${allTokens.length} tokens from API for price sync.`,
      );
    } catch (error) {
      this.logger.error(
        'Halting price sync due to failure in fetching initial tokens.',
      );
      return;
    }

    // Initialize a set of all symbols that we expect to update.
    const pendingSymbolsToUpdate = new Set<string>(
      allTokens.map((t) => t.canonicalSymbol),
    );

    const successfullyFetchedPrices: PriceUpdatePayload[] = [];
    // notFoundOrFailedSymbols can still be useful for detailed logging of specific API failures
    const explicitApiFailuresOrInvalidPrice: string[] = [];

    // Pass pendingSymbolsToUpdate to fetching methods if they need to remove symbols upon success,
    // OR, more simply, just iterate successfullyFetchedPrices later to remove them.
    // For simplicity now, we'll update pendingSymbolsToUpdate after all fetches.

    await this._fetchPricesFromDexScreener(
      allTokens,
      successfullyFetchedPrices,
      explicitApiFailuresOrInvalidPrice, // Log specific API/parse failures here
    );

    await this._fetchPricesFromParadex(
      allTokens,
      successfullyFetchedPrices,
      explicitApiFailuresOrInvalidPrice, // Log specific API/parse failures here
    );

    // Remove symbols for which prices were successfully fetched from the pending set
    for (const fetchedPrice of successfullyFetchedPrices) {
      pendingSymbolsToUpdate.delete(fetchedPrice.symbol);
    }

    let dbUpdateCount = 0;
    let apiReportedNotFound: string[] = []; // Symbols our API said it couldn't find/update

    if (successfullyFetchedPrices.length > 0) {
      try {
        this.logger.log(
          `Attempting to batch update ${successfullyFetchedPrices.length} prices via own API.`,
        );
        const updatePayload = { updates: successfullyFetchedPrices };
        const response = await this.httpClient.put<{
          count: number;
          notFound: string[];
        }>(
          `${this.ownApiBaseUrl}/token-master/prices/batch-by-symbol`,
          updatePayload,
          {
            headers: {
              'X-API-KEY': this.ownApiKey,
              'Content-Type': 'application/json',
            },
          },
        );
        dbUpdateCount = response.data.count;
        apiReportedNotFound = response.data.notFound || [];
        this.logger.log(
          `Batch update API call successful. DB updated count: ${dbUpdateCount}. Symbols API reported not found: ${apiReportedNotFound.join(
            ', ',
          )}`,
        );
      } catch (e) {
        let errorDetails = e.message;
        if (axios.isAxiosError(e)) {
          const axiosError = e as AxiosError;
          errorDetails = `Status: ${
            axiosError.response?.status || 'N/A'
          }. Response: ${
            JSON.stringify(axiosError.response?.data) || axiosError.message
          }`;
        }
        this.logger.error(
          `Failed to update prices via batch API. ${errorDetails}`,
          e.stack,
        );
        // Add all attempted symbols to explicitApiFailuresOrInvalidPrice if API call fails entirely
        successfullyFetchedPrices.forEach((p) => {
          if (!explicitApiFailuresOrInvalidPrice.includes(p.symbol)) {
            explicitApiFailuresOrInvalidPrice.push(p.symbol);
            // Also ensure they remain in pending if they were removed, because DB update failed.
            pendingSymbolsToUpdate.add(p.symbol);
          }
        });
      }
    } else {
      this.logger.log(
        'No prices were fetched from external APIs, skipping database update call.',
      );
    }

    // finalNotFoundSymbols will now be the symbols that remained in pendingSymbolsToUpdate
    // plus any symbols the API reported as not found during the update attempt.
    const finalNotFoundSymbols = new Set([
      ...Array.from(pendingSymbolsToUpdate),
      ...apiReportedNotFound,
    ]);

    this.logger.log(
      `Price sync summary: Attempted to update/process ${allTokens.length} initial tokens. Successfully fetched and attempted to update ${successfullyFetchedPrices.length} prices. DB Update count: ${dbUpdateCount}. Not found/failed: ${Array.from(finalNotFoundSymbols).join(', ') || 'none'}.`,
    );
    this.logger.log(
      'Token price synchronization process (TypeScript version) finished.',
    );
  }

  private _isValidForDexScreenerApiCall(
    chainId: string,
    contractAddress: string,
  ): boolean {
    if (!contractAddress) return false;
    if (chainId === 'solana') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contractAddress);
    }
    if (chainId === 'aptos') {
      return (
        contractAddress === '0xa' || /^0x[0-9a-fA-F]{64}$/.test(contractAddress)
      );
    }
    if (chainId === 'injective') {
      return (
        contractAddress === 'inj' || /^0x[0-9a-fA-F]{40}$/.test(contractAddress)
      );
    }
    if (chainId === 'hyperliquid') {
      return /^0x[0-9a-fA-F]{40}$/.test(contractAddress);
    }
    return /^0x[0-9a-fA-F]{40}$/.test(contractAddress);
  }

  private async _fetchPricesFromDexScreener(
    allTokens: InternalTokenMaster[],
    successfullyFetchedPrices: PriceUpdatePayload[],
    explicitApiFailuresOrInvalidPrice: string[],
  ): Promise<void> {
    this.logger.log(
      'Starting DexScreener price fetching using /tokens/v1 endpoint style...',
    );
    const dexscreenerChains = [
      ...new Set(
        allTokens
          .map((t) => t.chainID)
          .filter((cid) => cid.toLowerCase() !== 'paradex'),
      ),
    ];
    const totalDexscreenerChains = dexscreenerChains.length;
    const paradexTokenCount = allTokens.filter(
      (t) => t.chainID.toLowerCase() === 'paradex',
    ).length;

    for (
      let chainIndex = 0;
      chainIndex < totalDexscreenerChains;
      chainIndex++
    ) {
      const chainId = dexscreenerChains[chainIndex];
      const tokensOnChain = allTokens.filter((t) => t.chainID === chainId);
      const validTokensForChain = tokensOnChain.filter((token) =>
        this._isValidForDexScreenerApiCall(
          token.chainID,
          token.contractAddress,
        ),
      );
      if (validTokensForChain.length === 0) {
        this.logger.debug(
          `No valid tokens for DexScreener on chain ${chainId}`,
        );
        continue;
      }
      for (
        let i = 0;
        i < validTokensForChain.length;
        i += this.ADDRESS_BATCH_SIZE
      ) {
        const batch = validTokensForChain.slice(i, i + this.ADDRESS_BATCH_SIZE);
        const tokenAddressesForApiCall = [
          ...new Set(batch.map((t) => t.contractAddress)),
        ];
        if (tokenAddressesForApiCall.length === 0) {
          continue;
        }
        const isLastDexscreenerCall =
          chainIndex === totalDexscreenerChains - 1 &&
          i + this.ADDRESS_BATCH_SIZE >= validTokensForChain.length;
        const apiUrl = `${this.dexscreenerApiBaseUrl}/tokens/v1/${chainId}/${tokenAddressesForApiCall.join(',')}`;
        this.logger.debug(`Fetching DexScreener URL (v1 style): ${apiUrl}`);
        try {
          const response = await this.httpClient.get<any>(apiUrl);
          const responseData = response.data;
          if (responseData && chainIndex === 0 && i === 0) {
            this.logger.debug(
              `Raw response from /tokens/v1 for ${chainId} batch: ${JSON.stringify(responseData).substring(0, 1000)}...`,
            );
          }
          let itemsToProcess: DexScreenerPair[] = [];
          if (Array.isArray(responseData)) {
            itemsToProcess = responseData;
          } else if (responseData && typeof responseData === 'object') {
            if (Array.isArray(responseData.pairs)) {
              itemsToProcess = responseData.pairs;
            } else if (Array.isArray(responseData.tokens)) {
              itemsToProcess = responseData.tokens;
            }
            if (itemsToProcess.length === 0) {
              this.logger.debug(
                `No processable items (pairs/tokens array) found in DexScreener v1 response for ${apiUrl}. Raw data: ${JSON.stringify(responseData).substring(0, 500)}`,
              );
            }
          }
          if (itemsToProcess.length === 0) {
            this.logger.debug(
              `No items (pairs/tokens) returned from DexScreener for ${apiUrl}`,
            );
            batch.forEach((token) => {
              if (
                !explicitApiFailuresOrInvalidPrice.includes(
                  token.canonicalSymbol,
                )
              ) {
                explicitApiFailuresOrInvalidPrice.push(token.canonicalSymbol);
              }
            });
            continue;
          }
          for (const inputToken of batch) {
            const inputContractAddrLc =
              inputToken.contractAddress.toLowerCase();
            let foundPriceForToken = false;
            let matchedItem = itemsToProcess.find(
              (item) =>
                item.baseToken?.address.toLowerCase() === inputContractAddrLc &&
                item.quoteToken?.symbol === inputToken.foundQuoteSymbol,
            );
            if (!matchedItem) {
              matchedItem = itemsToProcess.find(
                (item) =>
                  item.baseToken?.address.toLowerCase() === inputContractAddrLc,
              );
            }
            /*
            if (!matchedItem && itemsToProcess[0]?.address) { 
                matchedItem = itemsToProcess.find(
                    (item: any) => item.address?.toLowerCase() === inputContractAddrLc
                ) as DexScreenerPair; 
            }
            */
            const priceUsdFromItem =
              matchedItem?.priceUsd || (matchedItem as any)?.priceUSD;
            if (priceUsdFromItem) {
              const price = parseFloat(priceUsdFromItem as string);
              if (!isNaN(price) && price > 0) {
                successfullyFetchedPrices.push({
                  symbol: inputToken.canonicalSymbol,
                  price,
                });
                foundPriceForToken = true;
                this.logger.debug(
                  `DexScreener (v1) price for ${inputToken.canonicalSymbol} (${chainId}): ${price}`,
                );
              } else {
                this.logger.debug(
                  `Invalid priceUsd '${priceUsdFromItem}' for ${inputToken.canonicalSymbol} from DexScreener (v1).`,
                );
                if (
                  !explicitApiFailuresOrInvalidPrice.includes(
                    inputToken.canonicalSymbol,
                  )
                ) {
                  explicitApiFailuresOrInvalidPrice.push(
                    inputToken.canonicalSymbol,
                  );
                }
              }
            }
            if (!foundPriceForToken) {
              if (
                !explicitApiFailuresOrInvalidPrice.includes(
                  inputToken.canonicalSymbol,
                )
              ) {
                explicitApiFailuresOrInvalidPrice.push(
                  inputToken.canonicalSymbol,
                );
              }
              this.logger.debug(
                `No valid DexScreener (v1) price found for ${inputToken.canonicalSymbol} (${chainId}) in received items.`,
              );
            }
          }
        } catch (e) {
          let errorDetails = e.message;
          if (axios.isAxiosError(e)) {
            const axiosError = e as AxiosError;
            errorDetails = `Status: ${
              axiosError.response?.status || 'N/A'
            }. Response: ${
              JSON.stringify(axiosError.response?.data) || axiosError.message
            }`;
          }
          this.logger.error(
            `DexScreener (v1) API call failed for URL ${apiUrl}. ${errorDetails}`,
            e.stack,
          );
          batch.forEach((token) => {
            if (
              !explicitApiFailuresOrInvalidPrice.includes(token.canonicalSymbol)
            ) {
              explicitApiFailuresOrInvalidPrice.push(token.canonicalSymbol);
            }
          });
        }
        const isLastOverallApiCall =
          isLastDexscreenerCall && paradexTokenCount === 0;
        if (!isLastOverallApiCall && this.API_CALL_DELAY_SECONDS > 0) {
          this.logger.debug(
            `Delaying for ${this.API_CALL_DELAY_SECONDS}s after DexScreener (v1) call.`,
          );
          await this.delay(this.API_CALL_DELAY_SECONDS);
        }
      }
    }
    this.logger.log(
      `Finished DexScreener (v1) price fetching. Found ${successfullyFetchedPrices.length} prices so far.`,
    );
  }

  private async _fetchPricesFromParadex(
    allTokens: InternalTokenMaster[],
    successfullyFetchedPrices: PriceUpdatePayload[],
    explicitApiFailuresOrInvalidPrice: string[],
  ): Promise<void> {
    this.logger.log('Starting Paradex price fetching...');
    const paradexTokens = allTokens.filter(
      (t) => t.chainID.toLowerCase() === 'paradex',
    );

    if (paradexTokens.length === 0) {
      this.logger.log('No tokens configured for Paradex. Skipping.');
      return;
    }

    for (let i = 0; i < paradexTokens.length; i++) {
      const token = paradexTokens[i];
      const apiUrl = `${this.paradexApiBaseUrl}/bbo/${token.canonicalSymbol}-USD-PERP`;
      this.logger.debug(
        `Fetching Paradex price for ${token.canonicalSymbol} from ${apiUrl}`,
      );

      try {
        const response = await this.httpClient.get<any>(apiUrl);
        const askPriceStr = response.data?.ask;

        if (askPriceStr) {
          const price = parseFloat(askPriceStr);
          if (!isNaN(price) && price > 0) {
            successfullyFetchedPrices.push({
              symbol: token.canonicalSymbol,
              price,
            });
            this.logger.debug(
              `Paradex price for ${token.canonicalSymbol}: ${price}`,
            );
          } else {
            this.logger.warn(
              `Invalid ask price '${askPriceStr}' for ${token.canonicalSymbol} from Paradex.`,
            );
            if (
              !explicitApiFailuresOrInvalidPrice.includes(token.canonicalSymbol)
            ) {
              explicitApiFailuresOrInvalidPrice.push(token.canonicalSymbol);
            }
          }
        } else {
          this.logger.warn(
            `No ask price found for ${token.canonicalSymbol} from Paradex. Response: ${JSON.stringify(response.data).substring(0, 200)}`,
          );
          if (
            !explicitApiFailuresOrInvalidPrice.includes(token.canonicalSymbol)
          ) {
            explicitApiFailuresOrInvalidPrice.push(token.canonicalSymbol);
          }
        }
      } catch (e) {
        let errorDetails = e.message;
        if (axios.isAxiosError(e)) {
          const axiosError = e as AxiosError;
          errorDetails = `Status: ${
            axiosError.response?.status || 'N/A'
          }. Response: ${
            JSON.stringify(axiosError.response?.data) || axiosError.message
          }`;
        }
        this.logger.error(
          `Paradex API call failed for ${token.canonicalSymbol} at ${apiUrl}. ${errorDetails}`,
          e.stack,
        );
        if (
          !explicitApiFailuresOrInvalidPrice.includes(token.canonicalSymbol)
        ) {
          explicitApiFailuresOrInvalidPrice.push(token.canonicalSymbol);
        }
      }

      const isLastParadexCall = i === paradexTokens.length - 1;
      if (!isLastParadexCall && this.API_CALL_DELAY_SECONDS > 0) {
        this.logger.debug(
          `Delaying for ${this.API_CALL_DELAY_SECONDS}s after Paradex call.`,
        );
        await this.delay(this.API_CALL_DELAY_SECONDS);
      }
    }
    this.logger.log(
      `Finished Paradex price fetching. Total successful prices now: ${successfullyFetchedPrices.length}.`,
    );
  }

  private async fetchInitialTokens(): Promise<InternalTokenMaster[]> {
    const fetchUrl = `${this.ownApiBaseUrl}/token-master`;
    this.logger.debug(`Fetching initial tokens from own API: ${fetchUrl}`);
    try {
      const response = await this.httpClient.get<InternalTokenMaster[]>(
        fetchUrl,
        {
          headers: {
            'X-API-KEY': this.ownApiKey,
            Accept: 'application/json',
          },
        },
      );

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      this.logger.warn(
        `Received non-array or unexpected data from ${fetchUrl}. Data: ${JSON.stringify(
          response.data,
        )}`,
      );
      return [];
    } catch (e) {
      let errorDetails = e.message;
      if (axios.isAxiosError(e)) {
        const axiosError = e as AxiosError;
        errorDetails = `Status: ${
          axiosError.response?.status || 'N/A'
        }. Response: ${
          JSON.stringify(axiosError.response?.data) || axiosError.message
        }`;
      }
      this.logger.error(
        `Failed to fetch initial tokens from ${fetchUrl}. ${errorDetails}`,
        e.stack,
      );
      throw e;
    }
  }

  private async delay(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}
