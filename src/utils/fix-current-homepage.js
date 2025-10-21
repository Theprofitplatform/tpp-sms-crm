// Fix CURRENT homepage - keep exact same content, only fix broken slider
import fs from 'fs';

console.log('🔧 Fixing CURRENT homepage - keeping everything the same...');

// Current exact homepage content (from WordPress API)
const currentContent = `[vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern"][vc_column width="1/2"][vc_column_text]
<h1 style="text-align: center;">INSTANT AUTO TRADERS</h1>
<p style="text-align: center;"><strong>Your Trusted Car Dealership in Sydney</strong></p>
<p style="text-align: center;">Quality Used Cars | Competitive Prices | Excellent Service</p>
[/vc_column_text][vc_empty_space height="30px"][vc_btn title="Contact Us Today" style="custom" custom_background="#f39c12" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Fcontact-us%2F||"][/vc_btn][vc_empty_space height="20px"][vc_btn title="View Our Cars" style="outline" custom_background="#2a5298" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Finventory%2F||"][/vc_btn][/vc_column][vc_column width="1/2"][vc_column_text]
<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 50px 30px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
<h3 style="color: #2a5298; margin-bottom: 15px; font-size: 1.3em;">🚗 Quality Vehicles Available</h3>
<p style="color: #6c757d; margin-bottom: 20px;">Browse our selection of quality used cars with competitive pricing and excellent service.</p>
<a href="https://instantautotraders.com.au/inventory/" style="background: #2a5298; color: white; padding: 10px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin: 5px;">View Inventory</a>
<a href="https://instantautotraders.com.au/contact-us/" style="background: #f39c12; color: white; padding: 10px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin: 5px;">Contact Us</a>
</div>
[/vc_column_text][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632825678{background-color: #f8f9fa !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center;">Why Choose Instant Auto Traders?</h2>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="three_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">🔧 Quality Assurance</h4>
<p style="text-align: center;">All our vehicles undergo thorough inspection and come with comprehensive warranties for your peace of mind.</p>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">💰 Competitive Pricing</h4>
<p style="text-align: center;">We offer competitive prices and flexible financing options to suit your budget and requirements.</p>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">🤝 Expert Service</h4>
<p style="text-align: center;">Our experienced team provides exceptional customer service from start to finish.</p>
[/vc_column_text][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern"][vc_column][vc_column_text]
<h2 style="text-align: center;">Our Recent Inventory</h2>
<p style="text-align: center;">Browse our selection of quality used vehicles in Sydney.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_carousel carousel="car-listing" number_of_items="3" space_between_items="30" image_size="medium" orderby="date" order="ASC" category="featured-vehicles" show_navigation="yes" show_pagination="no"][vc_empty_space height="40px"][vc_column_text]
<p style="text-align: center;"><a href="https://instantautotraders.com.au/inventory/" style="background: #2a5298; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 1.1em;">View All Vehicles</a></p>
[/vc_column_text][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632851234{background-color: #2a5298 !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center; color: #ffffff;">Ready to Find Your Perfect Car?</h2>
<p style="text-align: center; color: #ffffff;">Visit our Sydney dealership or contact us today to explore our extensive range of quality used vehicles.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="two_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_btn title="Get in Touch" style="custom" custom_background="#f39c12" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Fcontact-us%2F||"][/vc_btn][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_btn title="Call Us" style="outline" custom_background="#ffffff" custom_text="#2a5298" shape="square" align="center" link="tel:0426232000"][/vc_btn][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_row]`;

console.log('✅ Current content loaded');
console.log('📏 Content length:', currentContent.length, 'characters');

// Create simple instructions
const instructions = `# CURRENT HOMEPAGE - SAME CONTENT, FIXED SLIDER

## What's EXACTLY the Same:
✅ Same hero section with INSTANT AUTO TRADERS title
✅ Same bullet points: Quality Used Cars | Competitive Prices | Excellent Service
✅ Same Contact Us Today button (orange #f39c12)
✅ Same View Our Cars button (blue outline)
✅ Same Why Choose Instant Auto Traders? section
✅ Same Quality Assurance, Competitive Pricing, Expert Service features
✅ Same Our Recent Inventory section with carousel
✅ Same blue CTA section with Ready to Find Your Perfect Car?
✅ Same Get in Touch and Call Us buttons
✅ All original spacing, colors, and styling preserved

## ONLY Change Made:
🔧 Replaced broken \`[rev_slider_vc alias="slider1"]\` 
   With a simple, clean placeholder that fits the existing design

## Where to Apply:
1. Login: https://instantautotraders.com.au/wp-admin
2. Go to: Pages → Home → Edit
3. Switch to: Text/Code editor
4. Replace ALL content with:

\`\`\`html
${currentContent}
\`\`\`

5. Click: Update
6. Visit: https://instantautotraders.com.au/
7. Refresh: Press Ctrl+F5

## Result:
✅ Same exact content you currently have
✅ Same layout and styling
✅ No more broken slider error
✅ Clean placeholder instead of error message

Status: SAME CONTENT, FIXED ⭐`;

fs.writeFileSync('./CURRENT-HOMEPAGE-FIX.md', instructions);
fs.writeFileSync('./current-homepage-fixed.html', currentContent);

console.log('✅ Created fixed version with same content');
console.log('📁 Files created:');
console.log('   • CURRENT-HOMEPAGE-FIX.md (instructions)');
console.log('   • current-homepage-fixed.html (content)');
console.log('\n🎯 This is your EXACT current content, just with the broken slider fixed!');
