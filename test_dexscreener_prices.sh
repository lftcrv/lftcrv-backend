#!/bin/bash

LOG_FILE="test_dexscreener_prices.log"

# Function to echo to console and append to log file
log_message() {
    echo -e "$1"
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Clear log file at start
> "$LOG_FILE"

log_message "Script started. Logging to $LOG_FILE"

# Trap for unexpected exit
trap 'log_message "Script ended unexpectedly at or before line $LINENO (previous command exit code: $?)."; exit 1' ERR

set -e

INPUT_FILE="token_master_list_fixed.json"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
ADDRESS_BATCH_SIZE=30
API_CALL_DELAY_SECONDS=1

if [ ! -f "$INPUT_FILE" ]; then
    log_message "Error: Input file '$INPUT_FILE' not found."
    exit 1
fi

log_message "Reading all tokens from $INPUT_FILE..."
token_entries_json=$(jq -c '.' "$INPUT_FILE")

if [ "$(echo "$token_entries_json" | jq 'length')" -eq 0 ]; then
    log_message "No tokens found in $INPUT_FILE. Exiting."
    exit 0
fi

total_input_tokens=$(echo "$token_entries_json" | jq 'length')
log_message "Total tokens to process from input file: $total_input_tokens"

success_count=0
failure_count=0
processed_tokens_count=0

unique_chain_ids_for_dexscreener=()
while IFS= read -r chain; do
    if [[ -n "$chain" ]]; then
        unique_chain_ids_for_dexscreener+=("$chain")
    fi
done < <(echo "$token_entries_json" | jq -r '.[] | .ChainID' | sort -u | grep -v -e 'paradex')

log_message "Found chains to process via DexScreener (incl. hyperliquid if present): ${unique_chain_ids_for_dexscreener[*]}"

# --- Main DexScreener Processing Loop ---
for chain_id in "${unique_chain_ids_for_dexscreener[@]}"; do
    log_message "---"
    log_message "Processing chain (DexScreener): $chain_id"

    tokens_on_current_chain=()
    while IFS= read -r token_line; do
        if [[ -n "$token_line" ]]; then
            tokens_on_current_chain+=("$token_line")
        fi
    done < <(echo "$token_entries_json" | jq -c --arg chid "$chain_id" '.[] | select(.ChainID == $chid)')

    if [ ${#tokens_on_current_chain[@]} -eq 0 ]; then
        log_message "No tokens found for chain $chain_id for DexScreener processing. Skipping."
        continue
    fi

    num_address_batches=$(((${#tokens_on_current_chain[@]} + ADDRESS_BATCH_SIZE - 1) / ADDRESS_BATCH_SIZE))
    log_message "Found ${#tokens_on_current_chain[@]} tokens for $chain_id. Will process in $num_address_batches address batch(es) (size $ADDRESS_BATCH_SIZE)."

    for ((addr_batch_num = 0; addr_batch_num < num_address_batches; addr_batch_num++)); do
        start_idx=$((addr_batch_num * ADDRESS_BATCH_SIZE))
        current_batch_contract_addresses_with_duplicates=()

        log_message "Preparing Address Batch #$((addr_batch_num + 1))/$num_address_batches for chain $chain_id..."

        for ((i = 0; i < ADDRESS_BATCH_SIZE && (start_idx + i) < ${#tokens_on_current_chain[@]}; i++)); do
            token_json_str="${tokens_on_current_chain[$((start_idx + i))]}"
            contract_addr=$(echo "$token_json_str" | jq -r '.ContractAddress')

            is_valid_for_api_call=false
            if [[ "$chain_id" == "solana" ]]; then
                if echo "$contract_addr" | grep -E -q '^[1-9A-HJ-NP-Za-km-z]{32,44}$'; then
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "aptos" ]]; then
                if [[ "$contract_addr" == "0xa" ]]; then
                    is_valid_for_api_call=true
                elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{64}$'; then # Standard 64-char Aptos hex accounts
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "injective" ]]; then
                if [[ "$contract_addr" == "inj" ]]; then
                    is_valid_for_api_call=true
                elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{40}$'; then # Injective also uses EVM-like addresses
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "hyperliquid" ]]; then
                if echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]+$'; then # Generic 0x-prefixed hex for Hyperliquid
                    is_valid_for_api_call=true
                fi
            elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{40}$'; then # Default to EVM-like for other chains
                is_valid_for_api_call=true
            fi

            if $is_valid_for_api_call; then
                current_batch_contract_addresses_with_duplicates+=("$contract_addr")
            else
                # This address is considered invalid for THIS chain type for an API call,
                # It will be marked as a failure when current_addr_batch_input_tokens_for_api_call is built
                :
            fi
        done

        current_batch_contract_addresses=()
        if [ ${#current_batch_contract_addresses_with_duplicates[@]} -gt 0 ]; then
            while IFS= read -r distinct_addr; do
                if [[ -n "$distinct_addr" ]]; then
                    current_batch_contract_addresses+=("$distinct_addr")
                fi
            done < <(printf "%s\n" "${current_batch_contract_addresses_with_duplicates[@]}" | sort -u)
        fi

        current_addr_batch_input_tokens_for_api_call=()
        for ((i = 0; i < ADDRESS_BATCH_SIZE && (start_idx + i) < ${#tokens_on_current_chain[@]}; i++)); do
            token_idx_in_chain_array=$((start_idx + i))
            token_json_str_for_processing="${tokens_on_current_chain[$token_idx_in_chain_array]}"
            contract_addr_for_processing=$(echo "$token_json_str_for_processing" | jq -r '.ContractAddress')
            canonical_symbol_for_log=$(echo "$token_json_str_for_processing" | jq -r '.CanonicalSymbol // "N/A"')

            is_address_in_api_list=false
            for api_call_addr in "${current_batch_contract_addresses[@]}"; do
                # Case-insensitive comparison for addresses for robustness, though DexScreener usually uses lowercase for EVM in path
                addr1_lc=$(echo "$contract_addr_for_processing" | tr '[:upper:]' '[:lower:]')
                addr2_lc=$(echo "$api_call_addr" | tr '[:upper:]' '[:lower:]')
                if [ "$addr1_lc" == "$addr2_lc" ]; then
                    is_address_in_api_list=true
                    break
                fi
            done

            if $is_address_in_api_list; then
                current_addr_batch_input_tokens_for_api_call+=("$token_json_str_for_processing")
            else
                log_message "FAILURE (DexScreener - Invalid/Skipped Address): $canonical_symbol_for_log ($chain_id) - ContractAddress '$contract_addr_for_processing' invalid for chain type or not included in API call list."
                ((failure_count++))
                ((processed_tokens_count++))
            fi
        done

        # Proceed with API call only if there are tokens that passed validation and addresses to call
        if [ ${#current_addr_batch_input_tokens_for_api_call[@]} -gt 0 ] && [ ${#current_batch_contract_addresses[@]} -gt 0 ]; then
            token_addresses_str=$(
                IFS=,
                echo "${current_batch_contract_addresses[*]}"
            )
            log_message "Address Batch (DexScreener) #$((addr_batch_num + 1)): Fetching for ${#current_batch_contract_addresses[@]} distinct addresses on $chain_id: $token_addresses_str"

            api_url="https://api.dexscreener.com/tokens/v1/$chain_id/$token_addresses_str"
            api_response_root_json=$(curl -s -H "User-Agent: $USER_AGENT" "$api_url")
            api_response_pairs_json=$(echo "$api_response_root_json" | jq '. // []')

            if ! echo "$api_response_root_json" | jq -e . >/dev/null 2>&1 || ! echo "$api_response_pairs_json" | jq -e '. | type == "array"' >/dev/null 2>&1; then
                log_message "Error (DexScreener): API response for address batch #$((addr_batch_num + 1)) (Chain: $chain_id) was not valid JSON, or root was not an array, or curl failed."
                log_message "Response (DexScreener): $(echo "$api_response_root_json" | head -c 300)"
                log_message "Marking all ${#current_addr_batch_input_tokens_for_api_call[@]} tokens in this address batch as failed."
                for token_json_str_in_failed_batch in "${current_addr_batch_input_tokens_for_api_call[@]}"; do
                    canonical_symbol=$(echo "$token_json_str_in_failed_batch" | jq -r '.CanonicalSymbol // "N/A"')
                    log_message "FAILURE (DexScreener - API Error): $canonical_symbol ($chain_id) - API call for its address batch failed or returned unusable data."
                    ((failure_count++))
                    ((processed_tokens_count++))
                done
            else
                log_message "Address Batch (DexScreener) #$((addr_batch_num + 1)): API Call Complete. Processing results for ${#current_addr_batch_input_tokens_for_api_call[@]} input tokens..."
                for input_token_json_str in "${current_addr_batch_input_tokens_for_api_call[@]}"; do
                    input_contract_addr_lc=$(echo "$input_token_json_str" | jq -r '.ContractAddress' | tr '[:upper:]' '[:lower:]')
                    input_canonical_symbol=$(echo "$input_token_json_str" | jq -r '.CanonicalSymbol')
                    input_found_quote_symbol=$(echo "$input_token_json_str" | jq -r '.FoundQuoteSymbol')
                    input_method_info=$(echo "$input_token_json_str" | jq -r '.Method // "N/A"')

                    matched_pair_details=$(echo "$api_response_pairs_json" | jq -c --arg addr_lc "$input_contract_addr_lc" --arg fqs "$input_found_quote_symbol" \
                        'map(select((.baseToken.address | ascii_downcase) == $addr_lc and .quoteToken.symbol == $fqs)) | .[0]')

                    if [ "$matched_pair_details" = "null" ] || [ -z "$matched_pair_details" ]; then
                        matched_pair_details=$(echo "$api_response_pairs_json" | jq -c --arg addr_lc "$input_contract_addr_lc" \
                            'map(select((.baseToken.address | ascii_downcase) == $addr_lc)) | .[0]')
                    fi

                    price_usd="null"
                    api_quote_symbol="N/A"
                    if [ "$matched_pair_details" != "null" ] && [ -n "$matched_pair_details" ]; then
                        price_usd=$(echo "$matched_pair_details" | jq -r '.priceUsd // "null"')
                        api_quote_symbol=$(echo "$matched_pair_details" | jq -r '.quoteToken.symbol // "N/A"')
                    fi

                    if [ "$price_usd" != "null" ] && [ -n "$price_usd" ] && [[ ! "$price_usd" =~ ^0(\.0+)?$ ]]; then
                        log_message "SUCCESS (DexScreener): $input_canonical_symbol ($chain_id) PriceUSD: $price_usd (API Quote: $api_quote_symbol, Our PrefQuote: $input_found_quote_symbol). Method: $input_method_info"
                        ((success_count++))
                    else
                        log_message "FAILURE (DexScreener): $input_canonical_symbol ($chain_id). No valid price found for address $input_contract_addr_lc (API price: '$price_usd'). (Our PrefQuote: $input_found_quote_symbol). Method: $input_method_info"
                        ((failure_count++))
                    fi
                    ((processed_tokens_count++))
                done
            fi # End of processing successful API call
        else   # This 'else' corresponds to: if [ ${#current_addr_batch_input_tokens_for_api_call[@]} -gt 0 ] && [ ${#current_batch_contract_addresses[@]} -gt 0 ]
            # This means there were no valid tokens/addresses for this batch segment to even attempt an API call.
            # Failures for these were already logged when building current_addr_batch_input_tokens_for_api_call.
            log_message "Address Batch (DexScreener) #$((addr_batch_num + 1)): Skipped API call as no valid tokens/addresses were prepared for it."
        fi

        # Sleep logic (always runs if not the absolute last API call)
        is_last_api_call_for_dexscreener_loop=false
        if ((addr_batch_num == num_address_batches - 1)); then
            current_chain_array_idx=-1
            for idx in "${!unique_chain_ids_for_dexscreener[@]}"; do
                if [[ "${unique_chain_ids_for_dexscreener[$idx]}" == "$chain_id" ]]; then
                    current_chain_array_idx=$idx
                    break
                fi
            done
            if ((current_chain_array_idx != -1 && current_chain_array_idx == ${#unique_chain_ids_for_dexscreener[@]} - 1)); then
                is_last_api_call_for_dexscreener_loop=true # This is the last batch of the last chain for DexScreener
            fi
        fi
        
        # Determine if there are Paradex tokens to process later
        paradex_token_count=$(echo "$token_entries_json" | jq 'map(select(.ChainID == "paradex")) | length')
        # Sleep if not the last DexScreener call OR if there are Paradex tokens still to come
        if ( ! $is_last_api_call_for_dexscreener_loop || (( paradex_token_count > 0 )) ) && [[ $API_CALL_DELAY_SECONDS -gt 0 ]]; then
            log_message "Sleeping for $API_CALL_DELAY_SECONDS second(s)..."
            sleep $API_CALL_DELAY_SECONDS
        fi
    done
done

# --- Paradex Processing Loop ---
log_message "---"
log_message "Processing tokens flagged for Paradex API..."

paradex_tokens_processed_this_run=0
while IFS= read -r token_json_str; do
    if [[ -z "$token_json_str" ]]; then continue; fi
    ((paradex_tokens_processed_this_run++))
    ((processed_tokens_count++)) # Count towards total processed

    canonical_symbol=$(echo "$token_json_str" | jq -r '.CanonicalSymbol')
    log_message "Attempting to fetch $canonical_symbol price from Paradex API..."
    
    paradex_api_url="https://api.prod.paradex.trade/v1/bbo/${canonical_symbol}-USD-PERP"
    paradex_response=$(curl -s -X GET "$paradex_api_url" -H "Accept: application/json")
    paradex_price=$(echo "$paradex_response" | jq -r '.ask // "null"') 

    if [ "$paradex_price" != "null" ] && [ -n "$paradex_price" ] && [[ ! "$paradex_price" =~ ^0(\.0+)?$ ]]; then
        log_message "SUCCESS (Paradex): $canonical_symbol Price: $paradex_price"
        ((success_count++))
    else
        log_message "FAILURE (Paradex): Could not fetch a valid price for $canonical_symbol. Response: $(echo "$paradex_response" | head -c 100)"
        ((failure_count++))
    fi
    
    # Delay if there are more paradex tokens
    if [[ $API_CALL_DELAY_SECONDS -gt 0 && $paradex_tokens_processed_this_run -lt $(echo "$token_entries_json" | jq 'map(select(.ChainID == "paradex")) | length') ]]; then
        log_message "Sleeping for $API_CALL_DELAY_SECONDS second(s) (Paradex call)..."
        sleep $API_CALL_DELAY_SECONDS
    fi
done < <(echo "$token_entries_json" | jq -c '.[] | select(.ChainID == "paradex")')

log_message "---"
log_message "Final Summary:"
log_message "Total tokens from input file: $total_input_tokens"
log_message "Total tokens attempted via API calls (DexScreener or Paradex): $processed_tokens_count"
log_message "Successfully found prices: $success_count (out of $processed_tokens_count attempted)"
log_message "Failed to find prices (or bad address): $failure_count (out of $processed_tokens_count attempted)"

overall_failures=$failure_count
if [ "$processed_tokens_count" -ne "$total_input_tokens" ]; then
    unaccounted_tokens=$((total_input_tokens - processed_tokens_count))
    log_message "Warning: $unaccounted_tokens tokens were not accounted for. This might indicate an issue with ChainID filtering or processing logic. These are counted as overall failures."
    overall_failures=$((overall_failures + unaccounted_tokens))
fi

trap - ERR

if [ "$overall_failures" -gt 0 ]; then
    log_message "Exiting with status 1 due to some failures or processing issues."
    exit 1
fi

log_message "All tokens processed successfully. Script finished."
exit 0
 