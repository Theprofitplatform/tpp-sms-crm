#!/bin/bash
# Monitor GitHub Actions Workflow
# Watches workflow execution and reports results

echo "🔍 Monitoring GitHub Actions Workflow"
echo ""

# Get the latest run
RUN_ID=$(gh run list --workflow="Weekly SEO Automation" --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "❌ No workflow runs found"
    exit 1
fi

echo "📊 Workflow Run ID: $RUN_ID"
echo "🔗 URL: https://github.com/Theprofitplatform/seoexpert/actions/runs/$RUN_ID"
echo ""

# Watch the run
echo "⏳ Watching workflow execution..."
gh run watch $RUN_ID

# Get final status
echo ""
echo "📊 Final Results:"
gh run view $RUN_ID

# Download artifacts if successful
STATUS=$(gh run list --workflow="Weekly SEO Automation" --limit 1 --json conclusion --jq '.[0].conclusion')

if [ "$STATUS" = "success" ]; then
    echo ""
    echo "✅ Workflow completed successfully!"
    echo ""
    echo "📥 Downloading artifacts..."

    mkdir -p downloads/workflow-$RUN_ID
    cd downloads/workflow-$RUN_ID

    gh run download $RUN_ID

    echo ""
    echo "✅ Artifacts downloaded to: downloads/workflow-$RUN_ID"
    echo ""
    ls -lh
else
    echo ""
    echo "❌ Workflow failed with status: $STATUS"
    echo ""
    echo "💡 Check logs at: https://github.com/Theprofitplatform/seoexpert/actions/runs/$RUN_ID"
fi
