// Extract Homepage Content from SQL Backup - Simplified
import fs from 'fs';

console.log('🔍 Processing SQL backup for homepage content...');

// Read the SQL file
const sqlFile = './instanta_dnrv1.sql';
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

console.log(`📁 SQL file size: ${sqlContent.length} characters`);

// Simple search approach: Look for lines containing both Instant Auto Traders and visual composer elements
const lines = sqlContent.split('\n');
let homepageContent = '';
let foundLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line has Instant Auto Traders and visual composer elements
    if (
        line.includes('Instant Auto Traders') && 
        (line.includes('[vc_row') || line.includes('[rev_slider') || line.includes('[wpb_'))
    ) {
        foundLines.push(line);
        // Extract the content field (usually after the 9th field in INSERT)
        const fields = line.split("','");
        const closeParts = [];
        let inString = false;
        let currentContent = '';
        let fieldCount = 0;
        
        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            let fieldContent = '';
            let escapeCount = 0;
            
            // Parse the field properly handling escaped quotes
            for (let k = 0; k < field.length; k++) {
                const char = field[k];
                if (char === "'") {
                    if (escapeCount > 0) {
                        fieldContent += char;
                    }
                    escapeCount = escapeCount === 0 ? 1 : 0;
                } else {
                    fieldContent += char;
                }
                
                // Handle string concatenations
                if (!inString && escapeCount === 0 && (char === '\\' && k < field.length - 1 && field[k + 1] === "'")) {
                    fieldContent += char + field[k + 1];
                    k++; // Skip the next character
                }
            }
            
            if (fieldCount === 9) {
                currentContent = fieldContent;
            }
            
            fieldCount++;
        }
        
        if (currentContent && (currentContent.includes('[vc_row') || currentContent.includes('[rev_slider'))) {
            homepageContent = currentContent;
            break;
        }
    }
}

if (homepageContent) {
    const outputFile = './homepage-from-sql.html';
    fs.writeFileSync(outputFile, homepageContent);
    
    console.log('\n' + '='*60);
    console.log('   ✅ HOMEPAGE EXTRACTION COMPLETE');
    console.log('='*60);
    console.log(`📄 Homepage file: ${outputFile}`);
    console.log(`📏 Content length: ${homepageContent.length} characters`);
    console.log(`✅ Contains Visual Composer: ${homepageContent.includes('[vc_row') ? 'Yes' : 'No'}`);
    console.log(`✅ Contains Revolution Slider: ${homepageContent.includes('[rev_slider') ? 'Yes' : 'No'}`);
    console.log(`✅ Contains WP Bakery: ${homepageContent.includes('[wpb_') ? 'Yes' : 'No'}`);
    console.log('');
    console.log('📋 Apply this content to WordPress:');
    console.log('   1. WordPress Admin → Pages → Home → Edit');
    console.log('   2. Switch to Text/Code editor');
    console.log('   3. Replace ALL content with extracted content');
    console.log('   4. Update page');
    console.log('   5. Visit: https://instantautotraders.com.au/');
    console.log('   6. Refresh: Ctrl+F5');
    console.log('');
    console.log('🌟 This is the COMPLETE original homepage from the SQL backup!');
    
} else {
    console.log('❌ No homepage content found in SQL backup');
    console.log('\nFound lines with "Instant Auto Traders":', foundLines.length);
    console.log('But none contained Visual Composer content');
    
    // Try a broader search
    console.log('\n🔍 Trying broader search...');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('INSERT INTO') && line.includes("ggeq_posts")) {
            if (line.length > 1000 && (line.includes('vc_row') || line.includes('rev_slider'))) {
                // Try to extract content from this INSERT statement
                const afterContent = line.substring(line.indexOf("'") + 1);
                const endQuote = afterContent.indexOf("',");
                if (endQuote > -1) {
                    const content = line.substring(line.indexOf("'") + 1, endQuote);
                    if (content.length > 500 && content.includes('[vc_row')) {
                        homepageContent = content;
                        found = true;
                        console.log('✅ Found homepage with broader search');
                        break;
                    }
                }
            }
        }
        if (found) break;
    }
    
    if (!found) {
        console.log('❌ No suitable homepage content found.');
        console.log('💡 Try manual extraction from the SQL file.');
    } else {
        const outputFile = './homepage-from-sql-found.html';
        fs.writeFileSync(outputFile, homepageContent);
        console.log(`\n✅ Homepage content saved to: ${outputFile}`);
        console.log(`📏 Length: ${homepageContent.length} characters`);
    }
}
