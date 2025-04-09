#!/bin/bash

# Script to convert tab-delimited cryptocurrency data to JSON format
# Usage: ./crypto_to_json.sh input.txt > output.json, need jq

if [ $# -ne 1 ]; then
    echo "Usage: $0 input_file.txt > output.json"
    exit 1
fi

INPUT_FILE=$1

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File '$INPUT_FILE' not found"
    exit 1
fi

HEADERS=$(head -n 1 "$INPUT_FILE" | sed 's/\t/","/g; s/^/["/; s/$/"]/')

echo "["

# skip header line
tail -n +2 "$INPUT_FILE" | while IFS=$'\t' read -r -a values; do
    echo "  {"

    FIELD_COUNT=$(echo "$HEADERS" | jq '. | length')

    for ((i = 0; i < FIELD_COUNT; i++)); do
        FIELD_NAME=$(echo "$HEADERS" | jq -r ".[$i]")

        VALUE="${values[$i]:-}"

        if [[ "$FIELD_NAME" == "Seriousness (1-5)" || "$FIELD_NAME" == "Left vs. Right (1-100)" ]]; then
            if [[ "$VALUE" =~ ^[0-9]+$ ]]; then
                printf '    "%s": %s' "$FIELD_NAME" "$VALUE"
            else
                printf '    "%s": "%s"' "$FIELD_NAME" "$VALUE"
            fi
        else
            printf '    "%s": "%s"' "$FIELD_NAME" "$VALUE"
        fi

        if [ $i -lt $((FIELD_COUNT - 1)) ]; then
            echo ","
        else
            echo ""
        fi
    done

    if [ $(wc -l <"$INPUT_FILE") -gt 2 ]; then
        echo "  },"
    else
        echo "  }"
    fi
done | sed '$s/,$//'

echo "]"
