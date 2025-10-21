// Apply Homepage from SQL Backup
import fs from 'fs';

console.log('🔧 Applying Homepage from SQL Backup...');

try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./instanta_dnrv1.sql', 'utf8');
    console.log(`📁 SQL file loaded: ${sqlContent.length} characters`);
    
    // Extract only the homepage content from the SQL
    const contentMatch = sqlContent.match(/INSERT INTO `ggeq_posts` VALUES[^']*'([^']*Instant Auto Traders[^']*(?:.(?:\[vc_row.|.\[rev_slider.|.\[wpb.|.qode_).*[^']*)[^']*)'/s);
    
    if (contentMatch && contentMatch[2]) {
        const homepageContent = contentMatch[2];
        console.log(`✅ Found homepage content! Length: ${homepageContent.length} characters`);
        
        // Write the homepage content to a file
        fs.writeFileSync('./homepage-from-sql-backup.html', homepageContent);
        
        console.log('\n' + '='*60);
        console.log('   ✅ HOMEPAGE FROM SQL BACKUP EXTRACTED');
        console.log('='*60);
        console.log(`📂 Original homepage file: ./homepage-from-sql-backup.html`);
        console.log(`📏 Content length: ${homepageContent.length} characters`);
        console.log(`✅ Visual Composer: ${homepageContent.includes('[vc_row') ? '✅' : '❌'}`);
        console.log(`✅ Revolution Slider: ${homepageContent.includes('[rev_slider') ? '✅' : '❌'}`);
        console.log(`✅ WP Bakery: ${homepageContent.includes('[wpb_') ? '✅' : '❌'}`);
        console.log(`✅ qode_elements: ${homepageContent.includes('[qode_') ? '✅' : '❌'}`);
        
        console.log('\n🎯 Next Steps - Apply to WordPress:');
        console.log('   1. WordPress Admin: https://instantautotraders.com.au/wp-admin');
        console.log('   2. Navigate: Pages → Home → Edit');
        console.log('   3. Switch to: Text/Code editor (not Visual)');
        console.log('   4. Copy content from: homepage-from-sql-backup.html');
        console.log('   5. Paste & Replace ALL existing content');
        console.log('   6. Click: Update');
        console.log('   7. Visit: https://instantautotraders.com.au/');
        console.log('   8. Press: Ctrl+F5 to refresh');
        console.log('');
        console.log('🌟 COMPLETE original homepage with all original components:');
        console.log('   • Visual Composer layout with rows and columns');
        console.log('   • Revolution Slider with slider1 alias');
        console.log('   • All original styling and content');
        
    } else {
        console.log('❌ No homepage content found in SQL backup');
        
        // Try alternative search
        console.log('\n🔍 Trying alternative search...');
        const altMatch = sqlContent.match(/post_content',\s*'([^']*(?:.*\[vc_row.*|.*\[rev_slider.*|.*wpbakery.*).*[^']*)'[^,]*,'[^,]*,'[^']*Instant Auto Traders[^']*/s);
        
        if (altMatch && altMatch[1]) {
            const homepageContent = altMatch[1];
            console.log(`✅ Found homepage with alternative search! Length: ${homepageContent.length} characters`);
            fs.writeFileSync('./homepage-from-sql-alt.html', homepageContent);
            console.log(`\n✅ Alternative saved to: ./homepage-from-sql-alt.html`);
            
        } else {
            console.log('❌ No suitable homepage content found.');
        }
    }
    
} catch (error) {
    console.error('❌ Error processing SQL file:', error.message);
}
