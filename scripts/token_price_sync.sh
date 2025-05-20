#!/bin/bash

LOG_FILE="test_dexscreener_prices.log"

# Log levels: 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG
LOG_LEVEL=3

# Set to 1 to enable logging to file, 0 to disable (more efficient)
LOG_TO_FILE=0

# Function to echo to console and optionally append to log file
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Write to log file only if LOG_TO_FILE is enabled
    if [[ $LOG_TO_FILE -eq 1 ]]; then
        echo -e "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
    
    # Only show on console based on current log level
    if [[ "$level" == "ERROR" ]] || 
       [[ "$level" == "WARN" && $LOG_LEVEL -ge 2 ]] || 
       [[ "$level" == "INFO" && $LOG_LEVEL -ge 3 ]] || 
       [[ "$level" == "DEBUG" && $LOG_LEVEL -ge 4 ]]; then
        echo -e "[$level] $message"
    fi
}

# Clear log file at start if logging to file is enabled
if [[ $LOG_TO_FILE -eq 1 ]]; then
    > "$LOG_FILE"
fi

log_message "INFO" "Starting token price update process"

# Trap for unexpected exit
trap 'log_message "ERROR" "Script ended unexpectedly at or before line $LINENO (previous command exit code: $?)."; exit 1' ERR

set -e

# Configuration variables
API_BASE_URL="http://127.0.0.1:8080/api"
API_KEY="secret"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
ADDRESS_BATCH_SIZE=30
API_CALL_DELAY_SECONDS=1

# Array to store tokens that need price updates
declare -a successfully_fetched_prices_payload_array=()
declare -a not_found_token_symbols=()

# Fetch all tokens from API instead of reading from a file
log_message "DEBUG" "Fetching tokens from API: $API_BASE_URL/token-master"
# api_response_json=$(curl -s -H "X-API-KEY: $API_KEY" "$API_BASE_URL/token-master")

response=$(curl -s -f -H "X-API-KEY: $API_KEY" --write-out "\n%{http_code}" "$API_BASE_URL/token-master")
http_code=$(echo "$response" | tail -n1)
api_response_json=$(echo "$response" | sed '$d')

# Validate HTTP status code
if [[ "$http_code" -ne 200 ]]; then
    log_message "ERROR" "Failed to fetch tokens from API. HTTP status code: $http_code. Response: $api_response_json"
    exit 1
fi

# Validate API response (basic check for valid JSON array)
# The -f flag in curl above will cause curl to exit with an error on HTTP errors,
# so the script would likely exit before this if http_code is not 2xx.
# However, keeping this check for non-array valid JSON is still good.
if ! echo "$api_response_json" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    log_message "ERROR" "Invalid JSON response from API (not an array) after successful HTTP GET. Response: $api_response_json"
    exit 1
fi

token_entries_json="$api_response_json"

total_input_tokens=$(echo "$token_entries_json" | jq 'length')
log_message "INFO" "Fetched $total_input_tokens tokens from API"

if [ "$total_input_tokens" -eq 0 ]; then
    log_message "WARN" "No tokens received from API. Exiting."
    exit 0
fi

success_count=0
failure_count=0
processed_tokens_count=0
chain_success_counts=()

unique_chain_ids_for_dexscreener=()
while IFS= read -r chain; do
    if [[ -n "$chain" ]]; then
        unique_chain_ids_for_dexscreener+=("$chain")
    fi
done < <(echo "$token_entries_json" | jq -r '.[] | .chainID' | sort -u | grep -v -e 'paradex')

# --- Main DexScreener Processing Loop ---
for chain_id in "${unique_chain_ids_for_dexscreener[@]}"; do
    chain_tokens_count=0
    chain_success_count=0
    chain_failure_count=0

    tokens_on_current_chain=()
    while IFS= read -r token_line; do
        if [[ -n "$token_line" ]]; then
            tokens_on_current_chain+=("$token_line")
            ((chain_tokens_count++))
        fi
    done < <(echo "$token_entries_json" | jq -c --arg chid "$chain_id" '.[] | select(.chainID == $chid)')

    if [ ${#tokens_on_current_chain[@]} -eq 0 ]; then
        log_message "DEBUG" "No tokens found for chain $chain_id"
        continue
    fi

    log_message "DEBUG" "Processing $chain_tokens_count tokens for $chain_id"
    
    num_address_batches=$(((${#tokens_on_current_chain[@]} + ADDRESS_BATCH_SIZE - 1) / ADDRESS_BATCH_SIZE))

    for ((addr_batch_num = 0; addr_batch_num < num_address_batches; addr_batch_num++)); do
        start_idx=$((addr_batch_num * ADDRESS_BATCH_SIZE))
        current_batch_contract_addresses_with_duplicates=()
        batch_success_count=0
        batch_failure_count=0

        for ((i = 0; i < ADDRESS_BATCH_SIZE && (start_idx + i) < ${#tokens_on_current_chain[@]}; i++)); do
            token_json_str="${tokens_on_current_chain[$((start_idx + i))]}"
            contract_addr=$(echo "$token_json_str" | jq -r '.contractAddress')

            is_valid_for_api_call=false
            if [[ "$chain_id" == "solana" ]]; then
                if echo "$contract_addr" | grep -E -q '^[1-9A-HJ-NP-Za-km-z]{32,44}$'; then
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "aptos" ]]; then
                if [[ "$contract_addr" == "0xa" ]]; then
                    is_valid_for_api_call=true
                elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{64}$'; then
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "injective" ]]; then
                if [[ "$contract_addr" == "inj" ]]; then
                    is_valid_for_api_call=true
                elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{40}$'; then
                    is_valid_for_api_call=true
                fi
            elif [[ "$chain_id" == "hyperliquid" ]]; then
                if echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]+$'; then
                    is_valid_for_api_call=true
                fi
            elif echo "$contract_addr" | grep -E -q '^0x[0-9a-fA-F]{40}$'; then
                is_valid_for_api_call=true
            fi

            if $is_valid_for_api_call; then
                current_batch_contract_addresses_with_duplicates+=("$contract_addr")
            else
                canonical_symbol_for_log=$(echo "$token_json_str" | jq -r '.canonicalSymbol // "N/A"')
                log_message "DEBUG" "Invalid address for $canonical_symbol_for_log: $contract_addr"
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
            contract_addr_for_processing=$(echo "$token_json_str_for_processing" | jq -r '.contractAddress')
            canonical_symbol_for_log=$(echo "$token_json_str_for_processing" | jq -r '.canonicalSymbol // "N/A"')

            is_address_in_api_list=false
            for api_call_addr in "${current_batch_contract_addresses[@]}"; do
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
                log_message "DEBUG" "Skipping $canonical_symbol_for_log - Address '$contract_addr_for_processing' not included in API call"
                ((failure_count++))
                ((chain_failure_count++))
                ((processed_tokens_count++))
                not_found_token_symbols+=("$canonical_symbol_for_log")
            fi
        done

        # Proceed with API call only if there are tokens that passed validation and addresses to call
        if [ ${#current_addr_batch_input_tokens_for_api_call[@]} -gt 0 ] && [ ${#current_batch_contract_addresses[@]} -gt 0 ]; then
            token_addresses_str=$(
                IFS=,
                echo "${current_batch_contract_addresses[*]}"
            )
            log_message "DEBUG" "Fetching for ${#current_batch_contract_addresses[@]} addresses on $chain_id"

            api_url="https://api.dexscreener.com/tokens/v1/$chain_id/$token_addresses_str"
            api_response_root_json=$(curl -s -H "User-Agent: $USER_AGENT" "$api_url")
            api_response_pairs_json=$(echo "$api_response_root_json" | jq '. // []')

            if ! echo "$api_response_root_json" | jq -e . >/dev/null 2>&1 || ! echo "$api_response_pairs_json" | jq -e '. | type == "array"' >/dev/null 2>&1; then
                log_message "ERROR" "DexScreener API response for batch #$((addr_batch_num + 1)) (Chain: $chain_id) was not valid"
                for token_json_str_in_failed_batch in "${current_addr_batch_input_tokens_for_api_call[@]}"; do
                    canonical_symbol=$(echo "$token_json_str_in_failed_batch" | jq -r '.canonicalSymbol // "N/A"')
                    log_message "DEBUG" "API error for $canonical_symbol ($chain_id)"
                    ((failure_count++))
                    ((chain_failure_count++))
                    ((processed_tokens_count++))
                    not_found_token_symbols+=("$canonical_symbol")
                done
            else
                for input_token_json_str in "${current_addr_batch_input_tokens_for_api_call[@]}"; do
                    input_contract_addr_lc=$(echo "$input_token_json_str" | jq -r '.contractAddress' | tr '[:upper:]' '[:lower:]')
                    input_canonical_symbol=$(echo "$input_token_json_str" | jq -r '.canonicalSymbol')
                    input_found_quote_symbol=$(echo "$input_token_json_str" | jq -r '.foundQuoteSymbol')
                    input_method_info=$(echo "$input_token_json_str" | jq -r '.method // "N/A"')

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
                        log_message "DEBUG" "Price found for $input_canonical_symbol ($chain_id): $price_usd"
                        
                        price_update_object="{\"symbol\":\"$input_canonical_symbol\",\"price\":$price_usd}"
                        successfully_fetched_prices_payload_array+=("$price_update_object")
                        
                        ((success_count++))
                        ((chain_success_count++))
                        ((batch_success_count++))
                    else
                        log_message "DEBUG" "No price found for $input_canonical_symbol ($chain_id)"
                        ((failure_count++))
                        ((chain_failure_count++))
                        ((batch_failure_count++))
                        not_found_token_symbols+=("$input_canonical_symbol")
                    fi
                    ((processed_tokens_count++))
                done
            fi
        else
            log_message "DEBUG" "Skipped API call - no valid tokens/addresses for batch #$((addr_batch_num + 1))"
        fi

        # Sleep logic
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
                is_last_api_call_for_dexscreener_loop=true
            fi
        fi
        
        paradex_token_count=$(echo "$token_entries_json" | jq 'map(select(.chainID == "paradex")) | length')
        if ( ! $is_last_api_call_for_dexscreener_loop || (( paradex_token_count > 0 )) ) && [[ $API_CALL_DELAY_SECONDS -gt 0 ]]; then
            sleep $API_CALL_DELAY_SECONDS
        fi
    done
    
    # Log one line per chain with results
    chain_success_counts+=("$chain_id:$chain_success_count/$chain_tokens_count")
    log_message "INFO" "Chain $chain_id: $chain_success_count/$chain_tokens_count prices found"
done

# --- Paradex Processing Loop ---
paradex_success_count=0
paradex_token_count=$(echo "$token_entries_json" | jq 'map(select(.chainID == "paradex")) | length')

if [ $paradex_token_count -gt 0 ]; then
    log_message "DEBUG" "Processing Paradex tokens"
    
    paradex_tokens_processed_this_run=0
    while IFS= read -r token_json_str; do
        if [[ -z "$token_json_str" ]]; then continue; fi
        ((paradex_tokens_processed_this_run++))
        ((processed_tokens_count++))
    
        canonical_symbol=$(echo "$token_json_str" | jq -r '.canonicalSymbol')
        log_message "DEBUG" "Fetching $canonical_symbol price from Paradex"
        
        paradex_api_url="https://api.prod.paradex.trade/v1/bbo/${canonical_symbol}-USD-PERP"
        paradex_response=$(curl -s -X GET "$paradex_api_url" -H "Accept: application/json")
        paradex_price=$(echo "$paradex_response" | jq -r '.ask // "null"') 
    
        if [ "$paradex_price" != "null" ] && [ -n "$paradex_price" ] && [[ ! "$paradex_price" =~ ^0(\.0+)?$ ]]; then
            log_message "DEBUG" "Price found for $canonical_symbol: $paradex_price"
            
            price_update_object="{\"symbol\":\"$canonical_symbol\",\"price\":$paradex_price}"
            successfully_fetched_prices_payload_array+=("$price_update_object")
            
            ((success_count++))
            ((paradex_success_count++))
        else
            log_message "DEBUG" "No price found for $canonical_symbol"
            ((failure_count++))
            not_found_token_symbols+=("$canonical_symbol")
        fi
        
        if [[ $API_CALL_DELAY_SECONDS -gt 0 && $paradex_tokens_processed_this_run -lt $paradex_token_count ]]; then
            sleep $API_CALL_DELAY_SECONDS
        fi
    done < <(echo "$token_entries_json" | jq -c '.[] | select(.chainID == "paradex")')
    
    log_message "INFO" "Chain paradex: $paradex_success_count/$paradex_token_count prices found"
    chain_success_counts+=("paradex:$paradex_success_count/$paradex_token_count")
fi

# --- Update prices in database via API ---
db_update_count=0
if [ ${#successfully_fetched_prices_payload_array[@]} -eq 0 ]; then
    log_message "WARN" "No prices fetched for database update"
else
    log_message "DEBUG" "Updating ${#successfully_fetched_prices_payload_array[@]} token prices"
    
    payload_updates_str=$(IFS=,; echo "${successfully_fetched_prices_payload_array[*]}")
    final_json_payload="{\"updates\":[$payload_updates_str]}"
    
    log_message "DEBUG" "Sending batch price update to API"
    update_response_json=$(curl -s -X PUT \
        -H "Content-Type: application/json" \
        -H "X-API-KEY: $API_KEY" \
        -d "$final_json_payload" \
        "$API_BASE_URL/token-master/prices/batch-by-symbol")
        
    if echo "$update_response_json" | jq -e . >/dev/null 2>&1; then
        db_update_count=$(echo "$update_response_json" | jq -r '.count // "0"')
        not_found_in_db=$(echo "$update_response_json" | jq -r '.notFound // []')
        
        for symbol in $(echo "$not_found_in_db" | jq -r '.[]'); do
            not_found_token_symbols+=("$symbol")
        done
    else
        log_message "ERROR" "Failed to parse API response for batch update"
        ((failure_count++))
    fi
fi

# Format non-updated token list as a compact string
if [ ${#not_found_token_symbols[@]} -gt 0 ]; then
    IFS=,
    not_found_tokens_str="${not_found_token_symbols[*]}"
    unset IFS
else
    not_found_tokens_str="none"
fi

# One line summary with all key numbers
chain_summary=$(IFS=" "; echo "${chain_success_counts[*]}")
log_message "INFO" "Summary: Fetched $total_input_tokens tokens | Updated $db_update_count/$success_count prices | Per chain: $chain_summary"

# Show list of tokens not updated in a single line
log_message "INFO" "Not updated: $not_found_tokens_str"

if [ "$failure_count" -gt 0 ]; then
    log_message "WARN" "Script completed with some failures"
    exit 1
fi

log_message "INFO" "Script completed successfully"
exit 0
 