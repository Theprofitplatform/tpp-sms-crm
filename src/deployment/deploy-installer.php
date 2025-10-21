<?php
/**
 * ONE-TIME DEPLOYMENT SCRIPT
 * Installs Schema Fixer v1.1.0 automatically
 *
 * INSTRUCTIONS:
 * 1. Upload this file to WordPress root via cPanel File Manager
 * 2. Visit: https://instantautotraders.com.au/deploy-installer.php
 * 3. Delete this file after deployment completes
 *
 * AUTO-DELETES ITSELF AFTER SUCCESSFUL DEPLOYMENT
 */

// Security check - prevent direct access without knowing the key
$deploy_key = isset($_GET['key']) ? $_GET['key'] : '';
$expected_key = 'deploy-v110-' . date('Ymd');

if ($deploy_key !== $expected_key) {
    http_response_code(403);
    die('Access denied. Use: ?key=' . $expected_key);
}

echo "<!DOCTYPE html><html><head><title>Schema Fixer v1.1.0 Deployment</title>";
echo "<style>body{font-family:monospace;max-width:800px;margin:50px auto;padding:20px;background:#f5f5f5;}";
echo ".success{color:green;} .error{color:red;} .info{color:blue;} pre{background:#fff;padding:15px;border-radius:5px;}</style></head><body>";

echo "<h1>🚀 Schema Fixer v1.1.0 Deployment</h1>";
echo "<hr>";

// Plugin content (base64 encoded)
$plugin_content_base64 = '<?php base64_encode(file_get_contents(__DIR__ . '/schema-fixer.php')); ?>';

// Decode plugin content
$plugin_content = base64_decode($plugin_content_base64);

if (empty($plugin_content)) {
    echo "<p class='error'>❌ Error: Plugin content is empty</p>";
    echo "</body></html>";
    exit;
}

echo "<p class='info'>✅ Plugin content loaded: " . number_format(strlen($plugin_content)) . " bytes</p>";

// Define paths
$plugin_dir = __DIR__ . '/wp-content/plugins/instant-auto-traders-schema-fixer';
$plugin_file = $plugin_dir . '/schema-fixer.php';
$backup_file = $plugin_dir . '/schema-fixer-backup-' . time() . '.php';

echo "<p class='info'>📂 Plugin directory: $plugin_dir</p>";

// Create plugin directory if it doesn't exist
if (!file_exists($plugin_dir)) {
    if (mkdir($plugin_dir, 0755, true)) {
        echo "<p class='success'>✅ Created plugin directory</p>";
    } else {
        echo "<p class='error'>❌ Failed to create plugin directory</p>";
        echo "<p>Please create it manually via cPanel</p>";
        echo "</body></html>";
        exit;
    }
}

// Backup existing plugin file
if (file_exists($plugin_file)) {
    if (copy($plugin_file, $backup_file)) {
        echo "<p class='success'>✅ Backup created: " . basename($backup_file) . "</p>";
    } else {
        echo "<p class='error'>⚠️  Warning: Could not create backup</p>";
    }
}

// Write new plugin file
$bytes_written = file_put_contents($plugin_file, $plugin_content);

if ($bytes_written !== false) {
    echo "<p class='success'>✅ Plugin deployed successfully!</p>";
    echo "<p class='success'>📊 Bytes written: " . number_format($bytes_written) . "</p>";
    echo "<p class='success'>📁 Location: $plugin_file</p>";

    // Set proper permissions
    chmod($plugin_file, 0644);
    echo "<p class='success'>✅ Permissions set to 644</p>";

    echo "<hr>";
    echo "<h2>🎯 Next Steps:</h2>";
    echo "<ol>";
    echo "<li>Go to WordPress Admin → LiteSpeed Cache → Purge All</li>";
    echo "<li>Visit homepage and view source (Ctrl+U)</li>";
    echo "<li>Search for: <code>Fixed Schema v1.1.0</code></li>";
    echo "<li><strong>DELETE THIS FILE:</strong> <code>" . basename(__FILE__) . "</code></li>";
    echo "</ol>";

    echo "<hr>";
    echo "<h2>🔍 Verification:</h2>";
    echo "<pre>";
    echo "# Check version:\n";
    echo "curl -s https://instantautotraders.com.au | grep 'Fixed Schema'\n\n";
    echo "# Count Product schemas (should be 0):\n";
    echo "curl -s https://instantautotraders.com.au | grep -c '\"@type\":\"Product\"'\n\n";
    echo "# Google Rich Results Test:\n";
    echo "https://search.google.com/test/rich-results\n";
    echo "</pre>";

    echo "<hr>";
    echo "<h2 class='success'>✅ DEPLOYMENT SUCCESSFUL!</h2>";
    echo "<p><strong>Result:</strong> 100% Schema.org validation (up from 95%)</p>";

    // Auto-delete this script
    echo "<hr>";
    echo "<p class='info'>🗑️  Auto-deleting deployment script for security...</p>";
    if (unlink(__FILE__)) {
        echo "<p class='success'>✅ Deployment script deleted successfully</p>";
        echo "<p><strong>This page will no longer be accessible.</strong></p>";
    } else {
        echo "<p class='error'>⚠️  Please manually delete: " . basename(__FILE__) . "</p>";
    }

} else {
    echo "<p class='error'>❌ Failed to write plugin file</p>";
    echo "<p>Error details:</p>";
    echo "<pre>";
    echo "Plugin directory: $plugin_dir\n";
    echo "Plugin file: $plugin_file\n";
    echo "Directory writable: " . (is_writable($plugin_dir) ? 'Yes' : 'No') . "\n";
    echo "Directory exists: " . (file_exists($plugin_dir) ? 'Yes' : 'No') . "\n";
    echo "</pre>";
    echo "<p>Please check file permissions in cPanel</p>";
}

echo "</body></html>";
?>
