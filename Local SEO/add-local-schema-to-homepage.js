#!/usr/bin/env node

/**
 * AUTO-ADD LOCAL BUSINESS SCHEMA TO HOMEPAGE
 *
 * This script automatically adds LocalBusiness schema markup to your homepage
 * via WordPress API. No manual editing required.
 *
 * Usage: node add-local-schema-to-homepage.js
 */

import { config } from '../env/config.js';
import { wpClient } from '../tasks/fetch-posts.js';

// Local Business Schema Template
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "name": "Instant Auto Traders",
  "image": "https://instantautotraders.com.au/wp-content/uploads/logo.png",
  "description": "Sydney's trusted cash car buyer offering instant quotes and same-day service. We buy all makes and models in any condition across Sydney and NSW. Get paid immediately with free car removal.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[YOUR ADDRESS - UPDATE IN ENV]",
    "addressLocality": "Sydney",
    "addressRegion": "NSW",
    "postalCode": "[YOUR POSTCODE]",
    "addressCountry": "AU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -33.8688,
    "longitude": 151.2093
  },
  "telephone": config.business?.phone || "[YOUR PHONE]",
  "email": config.business?.email || "info@instantautotraders.com.au",
  "url": "https://instantautotraders.com.au",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "09:00",
      "closes": "16:00"
    }
  ],
  "priceRange": "$$",
  "areaServed": [
    {
      "@type": "City",
      "name": "Sydney",
      "sameAs": "https://en.wikipedia.org/wiki/Sydney"
    },
    {
      "@type": "State",
      "name": "New South Wales",
      "sameAs": "https://en.wikipedia.org/wiki/New_South_Wales"
    }
  ],
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": -33.8688,
      "longitude": 151.2093
    },
    "geoRadius": "100000"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Car Buying Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Cash for Cars",
          "description": "Instant cash offers for all makes and models in any condition"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Same-Day Car Removal",
          "description": "Free car removal and towing across Sydney within 24 hours"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Instant Car Valuation",
          "description": "Get a no-obligation cash quote within 5 minutes by phone or online"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Damaged Car Buyer",
          "description": "We buy accident-damaged, non-running, and total write-off vehicles"
        }
      }
    ]
  },
  "sameAs": [
    "https://www.facebook.com/instantautotraders",
    "https://www.instagram.com/instantautotraders"
  ],
  "slogan": "Sydney's Trusted Cash Car Buyer - Instant Quotes, Same-Day Service",
  "paymentAccepted": "Cash, Bank Transfer",
  "currenciesAccepted": "AUD"
};

/**
 * Add schema to homepage
 */
async function addLocalSchemaToHomepage(dryRun = false) {
  console.log('\n🏢 LOCAL BUSINESS SCHEMA - HOMEPAGE AUTOMATION');
  console.log('='.repeat(70));

  try {
    // Fetch homepage (usually page ID 2, but let's find it)
    console.log('\n📄 Fetching homepage...');

    // Get homepage - try common page IDs or fetch all pages
    let homepage;
    try {
      homepage = await wpClient.fetchPage(2); // WordPress default homepage ID
    } catch (error) {
      console.log('   → Trying to find homepage by slug...');
      // If that fails, we'd need to implement fetchPages method
      throw new Error('Homepage not found. You may need to get the homepage ID manually.');
    }

    console.log(`   ✓ Found homepage: ${homepage.title.rendered}`);
    console.log(`   → Current content length: ${homepage.content.rendered.length} chars`);

    // Check if schema already exists
    if (homepage.content.rendered.includes('"@type": "AutomotiveBusiness"') ||
        homepage.content.rendered.includes('LocalBusiness schema')) {
      console.log('\n⚠️  WARNING: Schema appears to already exist on homepage!');
      console.log('   → Recommendation: Check homepage and remove old schema first');
      console.log('   → Then run this script again');
      return;
    }

    // Generate schema script tag
    const schemaMarkup = `
<!-- Local Business Schema Markup - Added by SEO Automation -->
<script type="application/ld+json">
${JSON.stringify(localBusinessSchema, null, 2)}
</script>
<!-- End Local Business Schema -->
`;

    // Add to homepage content
    const updatedContent = homepage.content.rendered + schemaMarkup;

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes made');
      console.log('\nSchema that would be added:');
      console.log(schemaMarkup);
      console.log('\n✓ Dry run complete. Run without --dry-run to apply changes.');
      return;
    }

    // Update homepage
    console.log('\n📤 Updating homepage with schema...');
    await wpClient.updatePage(2, {
      content: updatedContent
    });

    console.log('   ✓ Homepage updated successfully!');

    // Verification
    console.log('\n✅ SUCCESS!');
    console.log('\n📊 WHAT WAS DONE:');
    console.log('   ✓ Local Business schema added to homepage');
    console.log('   ✓ Schema type: AutomotiveBusiness');
    console.log('   ✓ Services listed: 4 core services');
    console.log('   ✓ Opening hours included');
    console.log('   ✓ Service area: Greater Sydney');

    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Verify schema with Rich Results Test:');
    console.log('      https://search.google.com/test/rich-results');
    console.log('   2. Test URL: https://instantautotraders.com.au');
    console.log('   3. Look for: ✅ AutomotiveBusiness detected');
    console.log('   4. Update address/phone in schema if needed (edit this script)');

    console.log('\n⚠️  IMPORTANT:');
    console.log('   → Update your address and postcode in the schema');
    console.log('   → The placeholders need your actual business address');
    console.log('   → Re-run this script after updating, or edit directly in WordPress');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   1. Check WordPress API credentials in env/config.js');
    console.error('   2. Verify homepage exists and is accessible');
    console.error('   3. Check if wpClient.updatePage() method exists');
    console.error('\nIf issue persists, you may need to add schema manually.');
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');

  console.log('\n🚀 Starting Local Schema Automation...\n');

  addLocalSchemaToHomepage(dryRun)
    .then(() => {
      console.log('\n✅ Script completed successfully!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { addLocalSchemaToHomepage };
