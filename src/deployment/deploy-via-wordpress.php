<?php
/**
 * WordPress Plugin Deployer
 *
 * Upload this file to WordPress root, visit it once to deploy the schema fixer,
 * then DELETE this file immediately for security.
 *
 * Usage: https://instantautotraders.com.au/deploy-via-wordpress.php?key=SECURE_KEY_HERE
 */

// Security key (change this!)
$SECURE_KEY = 'deploy-schema-' . date('Ymd-His');

// Check security key
if (!isset($_GET['key']) || $_GET['key'] !== $SECURE_KEY) {
    http_response_code(403);
    die('Access denied. Incorrect key.');
}

// Plugin content (base64 encoded for safety)
$plugin_content_base64 = '<?php
/**
 * Plugin Name: Instant Auto Traders - Schema Error Fixer
 * Description: Fixes all SEMrush structured data errors - missing prices, addresses, and images
 * Version: 1.1.0
 * Author: SEO Expert
 *
 * Version 1.1.0 Changes:
 * - Added homepage Product schema filter to eliminate remaining 3 warnings
 * - Removes Product schemas on homepage (AutomotiveBusiness is more appropriate)
 *
 * This plugin fixes all 3 types of schema errors found in SEMrush audit:
 * 1. Missing price/priceCurrency in Product/Offer schemas
 * 2. Missing address in LocalBusiness schemas
 * 3. Missing images in Merchant listing schemas
 */

if (!defined(\'ABSPATH\')) exit;

class InstantAutoTraders_Schema_Fixer {
    // ... [full plugin code will be embedded here]
}

// Initialize the plugin
new InstantAutoTraders_Schema_Fixer();
';

// Paths
$plugin_dir = __DIR__ . '/wp-content/plugins/instant-auto-traders-schema-fixer';
$plugin_file = $plugin_dir . '/schema-fixer.php';
$backup_file = $plugin_dir . '/schema-fixer-v1.0.0-backup-' . date('YmdHis') . '.php';

// Create directory if needed
if (!file_exists($plugin_dir)) {
    mkdir($plugin_dir, 0755, true);
    echo "✅ Created plugin directory<br>\n";
}

// Backup existing file
if (file_exists($plugin_file)) {
    copy($plugin_file, $backup_file);
    echo "✅ Backed up existing plugin to: " . basename($backup_file) . "<br>\n";
}

// Deploy new version
$plugin_content = file_get_contents(__DIR__ . '/schema-fixer-v1.1.0.php');
if ($plugin_content === false) {
    die("❌ Error: schema-fixer-v1.1.0.php not found in WordPress root<br>\n");
}

$written = file_put_contents($plugin_file, $plugin_content);

if ($written !== false) {
    echo "✅ Plugin deployed successfully!<br>\n";
    echo "📊 Bytes written: " . number_format($written) . "<br>\n";
    echo "📁 Location: " . $plugin_file . "<br><br>\n";

    echo "<h3>Next Steps:</h3>\n";
    echo "<ol>\n";
    echo "<li>Go to WordPress Admin → Plugins</li>\n";
    echo "<li>Ensure 'Instant Auto Traders - Schema Error Fixer' is active</li>\n";
    echo "<li>Visit homepage and view source (Ctrl+U)</li>\n";
    echo "<li>Search for: 'Fixed Schema v1.1.0'</li>\n";
    echo "<li>Clear LiteSpeed Cache</li>\n";
    echo "<li>Test with Google Rich Results: https://search.google.com/test/rich-results</li>\n";
    echo "<li><strong>DELETE THIS FILE (deploy-via-wordpress.php) IMMEDIATELY!</strong></li>\n";
    echo "</ol>\n";

    echo "<h3>Verification Commands:</h3>\n";
    echo "<pre>\n";
    echo "# Check version\n";
    echo "curl -s https://instantautotraders.com.au | grep 'Fixed Schema'\n\n";
    echo "# Check for Product schemas (should be 0)\n";
    echo "curl -s https://instantautotraders.com.au | grep -c '\"@type\":\"Product\"'\n";
    echo "</pre>\n";

    echo "<hr>\n";
    echo "<p style='color: red; font-weight: bold;'>⚠️ SECURITY: Delete this file NOW!</p>\n";

} else {
    echo "❌ Failed to write plugin file<br>\n";
    echo "Check file permissions on: " . $plugin_dir . "<br>\n";
}
?>
