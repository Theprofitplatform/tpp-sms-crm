#!/bin/bash
# Generate metadata.json from actual audit results

CLIENTS_DIR="logs/clients"
OUTPUT_FILE="web-dist/metadata.json"

# Client display names mapping
declare -A CLIENT_NAMES
CLIENT_NAMES["instantautotraders"]="Instant Auto Traders"
CLIENT_NAMES["hottyres"]="Hot Tyres"
CLIENT_NAMES["sadcdisabilityservices"]="SADC Disability Services"

# Start JSON
echo "{" > "$OUTPUT_FILE"
echo "  \"generated\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$OUTPUT_FILE"
echo "  \"clients\": [" >> "$OUTPUT_FILE"

# Process each client
first=true
for client_dir in "$CLIENTS_DIR"/*; do
    if [ -d "$client_dir" ]; then
        client_id=$(basename "$client_dir")

        # Find the latest JSON report
        latest_json=$(ls -t "$client_dir"/*.json 2>/dev/null | head -1)

        if [ -n "$latest_json" ] && [ -f "$latest_json" ]; then
            # Extract data from JSON using jq
            if command -v jq &> /dev/null; then
                name="${CLIENT_NAMES[$client_id]:-$client_id}"
                score=$(jq -r '.summary.avgScore // 0' "$latest_json")
                issues=$(jq -r '.summary.totalIssues // 0' "$latest_json")
                posts=$(jq -r '.summary.totalPosts // 0' "$latest_json")
            else
                # Fallback: parse JSON manually if jq not available
                name="${CLIENT_NAMES[$client_id]:-$client_id}"
                score=$(grep -oP '"avgScore":\s*\K\d+' "$latest_json" | head -1)
                issues=$(grep -oP '"totalIssues":\s*\K\d+' "$latest_json" | head -1)
                posts=$(grep -oP '"totalPosts":\s*\K\d+' "$latest_json" | head -1)

                # Default to 0 if empty
                score=${score:-0}
                issues=${issues:-0}
                posts=${posts:-0}
            fi

            # Add comma if not first
            if [ "$first" = false ]; then
                echo "," >> "$OUTPUT_FILE"
            fi
            first=false

            # Add client entry
            echo -n "    {" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo "      \"id\": \"$client_id\"," >> "$OUTPUT_FILE"
            echo "      \"name\": \"$name\"," >> "$OUTPUT_FILE"
            echo "      \"score\": $score," >> "$OUTPUT_FILE"
            echo "      \"issues\": $issues," >> "$OUTPUT_FILE"
            echo -n "      \"posts\": $posts" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo -n "    }" >> "$OUTPUT_FILE"

            echo "  📊 $name: Score $score/100, $issues issues, $posts posts"
        else
            echo "  ⚠️  No JSON report found for $client_id"
        fi
    fi
done

# Close JSON
echo "" >> "$OUTPUT_FILE"
echo "  ]" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo ""
echo "✅ Metadata generated: $OUTPUT_FILE"
