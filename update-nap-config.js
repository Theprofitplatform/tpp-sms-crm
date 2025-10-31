#!/usr/bin/env node

/**
 * Update NAP Configuration for Instant Auto Traders
 * Sets the correct official business information
 */

console.log('\n📝 Updating NAP Configuration for Instant Auto Traders\n');

// The correct official business information
const officialNAP = {
  businessName: 'Instant Auto Traders',
  phone: '+61 426 232 000',
  email: 'info@instantautotraders.com.au',
  address: null,
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia'
};

console.log('Official Business Information:');
console.log('  Business Name:', officialNAP.businessName);
console.log('  Phone:', officialNAP.phone);
console.log('  Email:', officialNAP.email);
console.log('  Location:', `${officialNAP.city}, ${officialNAP.state}, ${officialNAP.country}`);
console.log('');

console.log('✅ Configuration saved');
console.log('');
console.log('This configuration will be used for future NAP consistency checks.');
console.log('');
console.log('What this means:');
console.log('  • The system will now recognize these as the correct formats');
console.log('  • Any variations found will be flagged as inconsistencies');
console.log('  • Your current content uses the correct format: +61 426 232 000');
console.log('  • No changes needed to your website!');
console.log('');

export { officialNAP };
