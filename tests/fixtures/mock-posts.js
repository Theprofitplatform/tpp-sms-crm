/**
 * Mock WordPress posts for testing
 */

export const mockPosts = {
  perfect: {
    id: 1,
    title: { rendered: 'Perfect SEO Title Between 50 and 60 Characters Long' },
    content: {
      rendered: `
        <h1>Perfect Main Heading</h1>
        <p>${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(30)}</p>
        <h2>First Section</h2>
        <p>${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(25)}</p>
        <img src="test1.jpg" alt="Descriptive alt text for image one" />
        <h2>Second Section</h2>
        <p>${'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. '.repeat(20)}</p>
        <img src="test2.jpg" alt="Another descriptive alt text" />
        <a href="https://example.com/internal">Internal link</a>
      `
    },
    excerpt: { rendered: 'Perfect SEO excerpt between 150 and 160 characters long, containing relevant keywords and compelling copy that encourages clicks from search results.' },
    link: 'https://example.com/perfect-seo-post',
    slug: 'perfect-seo-post',
    status: 'publish',
    yoast_head_json: {
      og_description: 'Perfect meta description between 150 and 160 characters long, containing relevant keywords and a clear call to action for potential visitors.'
    }
  },

  poorTitle: {
    id: 2,
    title: { rendered: 'Short' },
    content: {
      rendered: `
        <h1>Main Heading</h1>
        <p>Some content here with sufficient length to pass content checks.</p>
        ${'<p>Additional paragraph content. </p>'.repeat(40)}
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/short-title',
    slug: 'short-title',
    status: 'publish'
  },

  missingH1: {
    id: 3,
    title: { rendered: 'Post With No H1 Tag in Content' },
    content: {
      rendered: `
        <p>This post has no H1 tag, which is a critical SEO issue.</p>
        <h2>Starting with H2</h2>
        <p>${'Content here. '.repeat(50)}</p>
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/no-h1',
    slug: 'no-h1',
    status: 'publish'
  },

  thinContent: {
    id: 4,
    title: { rendered: 'Post With Thin Content - Not Enough Words' },
    content: {
      rendered: '<h1>Thin Content</h1><p>This is too short.</p>'
    },
    excerpt: { rendered: 'Short' },
    link: 'https://example.com/thin-content',
    slug: 'thin-content',
    status: 'publish'
  },

  missingImages: {
    id: 5,
    title: { rendered: 'Post With Images Missing Alt Text' },
    content: {
      rendered: `
        <h1>Images Without Alt</h1>
        <p>${'Content here. '.repeat(50)}</p>
        <img src="test1.jpg" />
        <img src="test2.jpg" alt="" />
        <img src="test3.jpg" />
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/no-alt',
    slug: 'no-alt',
    status: 'publish'
  },

  brokenHierarchy: {
    id: 6,
    title: { rendered: 'Post With Broken Heading Hierarchy' },
    content: {
      rendered: `
        <h1>Main Title</h1>
        <p>Some content.</p>
        <h4>Skipped to H4 - Bad Hierarchy</h4>
        <p>${'More content. '.repeat(50)}</p>
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/broken-hierarchy',
    slug: 'broken-hierarchy',
    status: 'publish'
  },

  noInternalLinks: {
    id: 7,
    title: { rendered: 'Post With No Internal Links' },
    content: {
      rendered: `
        <h1>No Internal Links</h1>
        <p>${'Content with no links to other pages on the site. '.repeat(40)}</p>
        <a href="https://external.com">External link</a>
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/no-internal-links',
    slug: 'no-internal-links',
    status: 'publish'
  },

  longTitle: {
    id: 8,
    title: { rendered: 'This is an Extremely Long Title That Exceeds the Recommended Sixty Character Limit for SEO' },
    content: {
      rendered: `
        <h1>Content</h1>
        <p>${'Valid content here. '.repeat(50)}</p>
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/long-title',
    slug: 'long-title',
    status: 'publish'
  },

  keywordStuffing: {
    id: 9,
    title: { rendered: 'SEO SEO SEO Best Practices SEO SEO Guide' },
    content: {
      rendered: `
        <h1>SEO SEO SEO Guide</h1>
        <p>${'SEO '.repeat(100)}is important for SEO and SEO optimization.</p>
        <p>More SEO content with SEO keywords and SEO best practices.</p>
      `
    },
    excerpt: { rendered: 'Test excerpt' },
    link: 'https://example.com/keyword-stuffing',
    slug: 'keyword-stuffing-seo-seo-seo',
    status: 'publish'
  },

  draft: {
    id: 10,
    title: { rendered: 'Draft Post - Not Published' },
    content: {
      rendered: '<h1>Draft Content</h1><p>This is a draft.</p>'
    },
    excerpt: { rendered: 'Draft excerpt' },
    link: 'https://example.com/draft',
    slug: 'draft',
    status: 'draft'
  }
};

export const mockPages = {
  homepage: {
    id: 1,
    title: { rendered: 'Homepage - Instant Auto Traders' },
    content: {
      rendered: `
        <h1>Welcome to Instant Auto Traders</h1>
        <p>We buy cars in Sydney. Cash for cars service.</p>
        ${'<p>Additional content. </p>'.repeat(30)}
      `
    },
    link: 'https://instantautotraders.com.au/',
    slug: 'home',
    status: 'publish',
    template: 'homepage'
  },

  about: {
    id: 2,
    title: { rendered: 'About Us - Our Car Buying Service' },
    content: {
      rendered: `
        <h1>About Instant Auto Traders</h1>
        <p>Professional car buying service established in 2020.</p>
        ${'<p>Company information. </p>'.repeat(40)}
      `
    },
    link: 'https://instantautotraders.com.au/about-us/',
    slug: 'about-us',
    status: 'publish'
  }
};

export const mockAPIResponses = {
  success: {
    data: mockPosts.perfect,
    status: 200,
    statusText: 'OK'
  },

  notFound: {
    response: {
      status: 404,
      data: {
        code: 'rest_post_invalid_id',
        message: 'Invalid post ID.',
        data: { status: 404 }
      }
    }
  },

  unauthorized: {
    response: {
      status: 401,
      data: {
        code: 'rest_forbidden',
        message: 'Sorry, you are not allowed to do that.',
        data: { status: 401 }
      }
    }
  },

  serverError: {
    response: {
      status: 500,
      data: {
        code: 'internal_server_error',
        message: 'Internal server error',
        data: { status: 500 }
      }
    }
  }
};
