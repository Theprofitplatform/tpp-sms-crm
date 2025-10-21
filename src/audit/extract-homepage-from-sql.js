// Extract Homepage Content from SQL Backup
import fs from 'fs';
import path from 'path';

console.log('🔍 Processing SQL backup for homepage content...');

// Read the SQL file
const sqlFile = './instanta_dnrv1.sql';
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

console.log(`📁 SQL file size: ${sqlContent.length} characters`);

// Look for homepage content with Visual Composer/RevSlider
const homepagePatterns = [
    // Pattern 1: Look for INSERT INTO ggeq_posts with homepage content
    /INSERT INTO `ggeq_posts` VALUES\s*\([^,]+,\s*[^,]+\s*'[^']*Instant Auto Traders[^']*'\s*,\s*'([^']*(?:\\.[^']*Instant Auto Traders[^']*|[^']*vc_row[^']*|[^']*rev_slider[^'']*)[^']*)'/gs,
    // Pattern 2: Look for post_content field in homepage posts
    /'post_content',\s*'([^']*(?:\\.[^']*vc_row[^']*|[^']*rev_slider[^'']*)[^']*)'[^,]*,'[^',]*,'[^']*Instant Auto Traders[^']*'[^,]*,[^,]*,/gs,
    // Pattern 3: More generic - look for any content with Visual Composer
    /INSERT INTO.*ggeq_posts.*\(([^,]+,)*[^,]*'([^']*(?:\[vc_row.*|\[rev_slider.*)[^']*)[^']*)[^']*',/gs
];

let foundHomepage = false;
let homepageContent = '';

for (const pattern of homepagePatterns) {
    const matches = [...sqlContent.matchAll(pattern)];
    
    if (matches.length > 0) {
        const content = matches[1]; // First capture group is content
        console.log(`✅ Found homepage content with Pattern ${(homepagePatterns.indexOf(pattern) + 1)}`);
        console.log(`📏 Content length: ${content.length} characters`);
        
        // Check if this looks like the right homepage content
        if (content.includes('[vc_row') && (content.includes('Instant Auto Traders') || content.includes('INSTANT AUTO'))) {
            homepageContent = content;
            foundHomepage = true;
            console.log('✅ This appears to be the main homepage content');
            break;
        }
    }
}

// If not found with patterns, try broader search
if (!foundHomepage) {
    console.log('🔍 Trying broader search for homepage content...');
    
    // Look for any content with both Instant Auto Traders and Visual Composer
    const broadPattern = /'([^']*(?:\[vc_row[^']*|[^']*Instant Auto Traders[^']*|[^']*rev_slider[^']*|[^']*wpbakery[^'']*)[^']*)'/gs;
    const broadMatches = [...sqlContent.matchAll(broadPattern)];
    
    for (let i = 0; i < broadMatches.length; i++) {
        const content = broadMatches[i];
        if (content.includes('Instant Auto Traders') && content.includes('[vc_row') && content.length > 1000) {
            homepageContent = content;
            foundHomepage = true;
            console.log(`✅ Found homepage content with broad search (match ${i + 1})`);
            console.log(`📏 Content length: ${content.length} characters`);
            break;
        }
    }
}

if (foundHomepage) {
    const outputFile = './homepage-from-sql-extracted.html';
    fs.writeFileSync(outputFile, homepageContent);
    
    console.log('\n' + '='*60);
    console.log('   ✅ HOMEPAGE EXTRACTION COMPLETE');
    console.log('='*60);
    console.log(`📄 Original homepage file: ${outputFile}`);
    console.log(`📏 Content length: ${homepageContent.length} characters`);
    console.log(`✅ Contains Visual Composer: ${homepageContent.includes('[vc_row') ? 'Yes' : 'No'}`);
    console.log(`✅ Contains Revolution Slider: ${homepageContent.includes('[rev_slider') ? 'Yes' : 'No'}`);
    console.log(`✅ Contains JS Composer: ${homepageContent.includes('[wpb_') ? 'Yes' : 'No'}`);
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
    console.log('\n💡 Try searching manually in the SQL file for:');
    console.log('   • INSERT INTO ggeq_posts');
    console.log('   • Look for "Instant Auto Traders"');
    console.log('   • Look for [vc_row] and [rev_slider] shortcodes');
}
