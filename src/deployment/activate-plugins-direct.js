/**
 * Activate plugins via direct database update
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read wp-config.php to get database credentials
const wpConfigPath = path.join(__dirname, 'public_html', 'wp-config.php');

console.log('🔌 ACTIVATING PLUGINS DIRECTLY VIA DATABASE\n');

if (!fs.existsSync(wpConfigPath)) {
    console.log('❌ wp-config.php not found at:', wpConfigPath);
    console.log('\n💡 TIP: The WordPress installation might be on the VPS, not local.');
    console.log('Please run this via SSH on the VPS instead.\n');
    process.exit(1);
}

const wpConfig = fs.readFileSync(wpConfigPath, 'utf8');

// Extract database credentials
const dbName = wpConfig.match(/DB_NAME['"],\s*['"](.+?)['"]/)?.[1];
const dbUser = wpConfig.match(/DB_USER['"],\s*['"](.+?)['"]/)?.[1];
const dbPassword = wpConfig.match(/DB_PASSWORD['"],\s*['"](.+?)['"]/)?.[1];
const dbHost = wpConfig.match(/DB_HOST['"],\s*['"](.+?)['"]/)?.[1];
const tablePrefix = wpConfig.match(/\$table_prefix\s*=\s*['"](.+?)['"]/)?.[1] || 'wp_';

console.log('📊 Database Configuration:');
console.log(`   Host: ${dbHost}`);
console.log(`   Database: ${dbName}`);
console.log(`   User: ${dbUser}`);
console.log(`   Table Prefix: ${tablePrefix}`);
console.log('');

async function activatePlugins() {
    try {
        const connection = await mysql.createConnection({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbName
        });

        console.log('✅ Connected to database\n');

        // Get current active plugins
        const [rows] = await connection.execute(
            `SELECT option_value FROM ${tablePrefix}options WHERE option_name = 'active_plugins'`
        );

        if (rows.length === 0) {
            console.log('❌ Could not find active_plugins option');
            await connection.end();
            return;
        }

        let activePlugins = [];
        try {
            // WordPress stores this as a serialized PHP array
            const serialized = rows[0].option_value;
            console.log('📋 Current active_plugins value:');
            console.log(serialized);
            console.log('');
            
            // Parse the serialized data (simple approach)
            const matches = serialized.match(/s:\d+:"(.+?)";/g);
            if (matches) {
                activePlugins = matches.map(m => m.match(/s:\d+:"(.+?)";/)[1]);
            }
        } catch (e) {
            console.log('⚠️  Could not parse active plugins');
        }

        console.log('✅ Currently active plugins:');
        activePlugins.forEach(p => console.log(`   - ${p}`));
        console.log('');

        // Plugins that MUST be active
        const requiredPlugins = [
            'js_composer/js_composer.php',
            'revslider/revslider.php',
            'wprt-addons/wprt-addons.php'
        ];

        const toActivate = requiredPlugins.filter(p => !activePlugins.includes(p));

        if (toActivate.length === 0) {
            console.log('✅ All required plugins are already active!');
        } else {
            console.log('🔧 Activating missing plugins:');
            toActivate.forEach(p => console.log(`   - ${p}`));
            console.log('');

            const newActivePlugins = [...activePlugins, ...toActivate];
            
            // Create PHP serialized array
            let serialized = `a:${newActivePlugins.length}:{`;
            newActivePlugins.forEach((plugin, index) => {
                serialized += `i:${index};s:${plugin.length}:"${plugin}";`;
            });
            serialized += '}';

            console.log('📝 New serialized value:');
            console.log(serialized);
            console.log('');

            // Update database
            await connection.execute(
                `UPDATE ${tablePrefix}options SET option_value = ? WHERE option_name = 'active_plugins'`,
                [serialized]
            );

            console.log('✅ Plugins activated in database!');
        }

        await connection.end();
        console.log('\n🎉 Done! Clear WordPress cache and refresh your homepage.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Database connection refused. This might mean:');
            console.log('   1. WordPress is hosted on VPS, not locally');
            console.log('   2. MySQL is not running locally');
            console.log('   3. Need to run this on the actual WordPress server');
        }
    }
}

activatePlugins();
