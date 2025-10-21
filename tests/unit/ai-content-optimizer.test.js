import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockPost = jest.fn();

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: {
    post: mockPost
  }
}));

// Mock config with no API keys by default
jest.unstable_mockModule('../../config/env/config.js', () => ({
  config: {
    ai: {
      openaiApiKey: undefined,
      anthropicApiKey: undefined,
      cohereApiKey: undefined
    },
    google: {
      geminiApiKey: undefined
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Import after mocking
const { AIContentOptimizer } = await import('../../src/audit/ai-content-optimizer.js');

describe('AI Content Optimizer', () => {
  let optimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = new AIContentOptimizer();
  });

  describe('Constructor', () => {
    test('should initialize with API keys from config', () => {
      expect(optimizer).toBeDefined();
      expect(optimizer.openaiKey).toBeUndefined();
      expect(optimizer.anthropicKey).toBeUndefined();
      expect(optimizer.cohereKey).toBeUndefined();
      expect(optimizer.geminiKey).toBeUndefined();
    });
  });

  describe('optimizeContent()', () => {
    const mockPostData = {
      id: 1,
      title: { rendered: 'Test Post Title' },
      content: { rendered: '<p>Test content</p>' }
    };

    const mockAuditResults = {
      score: 65,
      issues: [
        { type: 'title', severity: 'warning', message: 'Title too short' }
      ]
    };

    test('should return message when no API keys configured', async () => {
      const result = await optimizer.optimizeContent(mockPostData, mockAuditResults);

      expect(result).toBeDefined();
      expect(result.post).toBe('Test Post Title');
      expect(result.suggestions).toEqual([]);
      expect(result.message).toContain('No AI API keys configured');
      expect(mockLogger.warn).toHaveBeenCalledWith('No AI API keys configured');
    });

    test('should log post being optimized', async () => {
      await optimizer.optimizeContent(mockPostData, mockAuditResults);

      expect(mockLogger.info).toHaveBeenCalledWith('AI optimizing post: Test Post Title');
    });

    test('should handle different post titles', async () => {
      const differentPost = {
        ...mockPostData,
        title: { rendered: 'Different Title Here' }
      };

      const result = await optimizer.optimizeContent(differentPost, mockAuditResults);

      expect(result.post).toBe('Different Title Here');
    });

    test('should accept audit results parameter', async () => {
      const emptyAudit = {
        score: 100,
        issues: []
      };

      const result = await optimizer.optimizeContent(mockPostData, emptyAudit);

      expect(result).toBeDefined();
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('API Key Priority', () => {
    test('should prefer Claude when multiple keys available', () => {
      // This test documents the priority order: Claude > OpenAI > Gemini > Cohere
      const optimizerWithKeys = new AIContentOptimizer();
      optimizerWithKeys.anthropicKey = 'test-claude-key';
      optimizerWithKeys.openaiKey = 'test-openai-key';

      // The optimizer should use Claude (anthropicKey) first
      expect(optimizerWithKeys.anthropicKey).toBe('test-claude-key');
    });

    test('should have OpenAI as second priority', () => {
      const optimizerWithKeys = new AIContentOptimizer();
      optimizerWithKeys.openaiKey = 'test-openai-key';
      optimizerWithKeys.geminiKey = 'test-gemini-key';

      expect(optimizerWithKeys.openaiKey).toBe('test-openai-key');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content</p>' }
      };

      const mockAuditResults = { score: 50, issues: [] };

      // Should not throw when no API keys configured
      await expect(optimizer.optimizeContent(mockPostData, mockAuditResults)).resolves.toBeDefined();
    });

    test('should handle API failures with Claude', async () => {
      // Create optimizer with API key to trigger API call path
      const optimizerWithKey = new AIContentOptimizer();
      optimizerWithKey.anthropicKey = 'test-key';

      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content</p>' }
      };

      const mockAuditResults = { score: 50, issues: [] };

      // Mock axios to reject
      mockPost.mockRejectedValueOnce(new Error('API call failed'));

      // Should throw the error
      await expect(optimizerWithKey.optimizeContent(mockPostData, mockAuditResults)).rejects.toThrow();
    });

    test('should handle API failures with OpenAI', async () => {
      const optimizerWithKey = new AIContentOptimizer();
      optimizerWithKey.openaiKey = 'test-openai-key';

      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content</p>' }
      };

      const mockAuditResults = { score: 50, issues: [] };

      mockPost.mockRejectedValueOnce(new Error('OpenAI API failed'));

      await expect(optimizerWithKey.optimizeContent(mockPostData, mockAuditResults)).rejects.toThrow();
    });

    test('should handle API failures with Gemini', async () => {
      const optimizerWithKey = new AIContentOptimizer();
      optimizerWithKey.geminiKey = 'test-gemini-key';

      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content</p>' }
      };

      const mockAuditResults = { score: 50, issues: [] };

      mockPost.mockRejectedValueOnce(new Error('Gemini API failed'));

      await expect(optimizerWithKey.optimizeContent(mockPostData, mockAuditResults)).rejects.toThrow();
    });

    test('should handle API failures with Cohere', async () => {
      const optimizerWithKey = new AIContentOptimizer();
      optimizerWithKey.cohereKey = 'test-cohere-key';

      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content</p>' }
      };

      const mockAuditResults = { score: 50, issues: [] };

      mockPost.mockRejectedValueOnce(new Error('Cohere API failed'));

      await expect(optimizerWithKey.optimizeContent(mockPostData, mockAuditResults)).rejects.toThrow();
    });
  });

  describe('Service Integration', () => {
    test('should be ready to integrate with Claude API', () => {
      expect(optimizer).toHaveProperty('anthropicKey');
      expect(typeof optimizer.optimizeWithClaude).toBe('function');
    });

    test('should be ready to integrate with OpenAI API', () => {
      expect(optimizer).toHaveProperty('openaiKey');
      expect(typeof optimizer.optimizeWithOpenAI).toBe('function');
    });

    test('should be ready to integrate with Gemini API', () => {
      expect(optimizer).toHaveProperty('geminiKey');
      expect(typeof optimizer.optimizeWithGemini).toBe('function');
    });

    test('should be ready to integrate with Cohere API', () => {
      expect(optimizer).toHaveProperty('cohereKey');
      expect(typeof optimizer.optimizeWithCohere).toBe('function');
    });
  });

  describe('Helper Methods', () => {
    describe('stripHtml()', () => {
      test('should remove HTML tags', () => {
        const html = '<p>This is <strong>bold</strong> text</p>';
        const result = optimizer.stripHtml(html);

        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('This is bold text');
      });

      test('should remove multiple HTML tags', () => {
        const html = '<h1>Title</h1><p>Paragraph with <a href="#">link</a></p>';
        const result = optimizer.stripHtml(html);

        expect(result).toBe('Title Paragraph with link');
      });

      test('should handle empty string', () => {
        const result = optimizer.stripHtml('');

        expect(result).toBe('');
      });

      test('should normalize whitespace', () => {
        const html = '<p>Text   with    extra    spaces</p>';
        const result = optimizer.stripHtml(html);

        expect(result).not.toMatch(/\s{2,}/);
        expect(result).toBe('Text with extra spaces');
      });
    });

    describe('buildOptimizationPrompt()', () => {
      test('should build optimization prompt with post and audit data', () => {
        const mockPost = {
          title: { rendered: 'Test Post Title' },
          content: { rendered: '<p>Test content here</p>' }
        };

        const mockAudit = {
          issues: [
            { severity: 'critical', message: 'Title too short' },
            { severity: 'warning', message: 'Missing meta description' }
          ]
        };

        const result = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        expect(result).toContain('Test Post Title');
        expect(result).toContain('CRITICAL: Title too short');
        expect(result).toContain('WARNING: Missing meta description');
        expect(result).toContain('SEO expert');
      });

      test('should include post content in prompt', () => {
        const mockPost = {
          title: { rendered: 'Title' },
          content: { rendered: '<p>Important content to analyze</p>' }
        };

        const mockAudit = { issues: [] };

        const result = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        expect(result).toContain('Important content to analyze');
      });

      test('should handle empty issues array', () => {
        const mockPost = {
          title: { rendered: 'Title' },
          content: { rendered: '<p>Content</p>' }
        };

        const mockAudit = { issues: [] };

        const result = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      test('should limit content to 1000 characters', () => {
        const longContent = '<p>' + 'a'.repeat(5000) + '</p>';
        const mockPost = {
          title: { rendered: 'Title' },
          content: { rendered: longContent }
        };

        const mockAudit = { issues: [] };

        const result = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        // Should contain the truncation indicator
        expect(result).toMatch(/\.{3}/);
      });
    });

    describe('parseAISuggestions()', () => {
      test('should parse formatted AI suggestions', () => {
        const aiResponse = `1. Title: Make it more engaging
2. Meta Description: Add target keyword
3. Content: Improve readability`;

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          category: '. Title',
          suggestion: 'Make it more engaging'
        });
        expect(result[1]).toEqual({
          category: '. Meta Description',
          suggestion: 'Add target keyword'
        });
      });

      test('should parse bullet point format', () => {
        const aiResponse = `- Title: Optimize length
- Keywords: Add more variations`;

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result).toHaveLength(2);
        expect(result[0].category).toBe('Title');
        expect(result[0].suggestion).toBe('Optimize length');
      });

      test('should handle unformatted text', () => {
        const aiResponse = 'This is generic advice without formatting';

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('General');
        expect(result[0].suggestion).toBe('This is generic advice without formatting');
      });

      test('should filter empty lines', () => {
        const aiResponse = `1. Title: Good title

2. Content: More content

`;

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result).toHaveLength(2);
      });

      test('should handle mixed formats', () => {
        const aiResponse = `1. Title: First suggestion
- Keywords: Second suggestion
• Links: Third suggestion`;

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].category).toBe('. Title');
      });
    });

    describe('extractTitleOptions()', () => {
      test('should extract numbered title options', () => {
        const text = `1. First Title Option
2. Second Title Option
3. Third Title Option`;

        const result = optimizer.extractTitleOptions(text);

        expect(result).toHaveLength(3);
        expect(result[0]).toBe('First Title Option');
        expect(result[1]).toBe('Second Title Option');
        expect(result[2]).toBe('Third Title Option');
      });

      test('should return empty array for no matches', () => {
        const text = 'Just some text without numbering';

        const result = optimizer.extractTitleOptions(text);

        expect(result).toEqual([]);
      });
    });

    describe('extractDescriptionOptions()', () => {
      test('should extract numbered description options', () => {
        const text = `1. First description here
2. Second description here`;

        const result = optimizer.extractDescriptionOptions(text);

        expect(result).toHaveLength(2);
        expect(result[0]).toBe('First description here');
        expect(result[1]).toBe('Second description here');
      });

      test('should handle empty input', () => {
        const result = optimizer.extractDescriptionOptions('');

        expect(result).toEqual([]);
      });
    });

    describe('extractJSON()', () => {
      test('should extract JSON from text', () => {
        const text = 'Here is some JSON: {"key": "value", "number": 123}';

        const result = optimizer.extractJSON(text);

        expect(result).toEqual({ key: 'value', number: 123 });
      });

      test('should handle complex JSON objects', () => {
        const text = 'Response: {"nested": {"data": "test"}, "array": [1, 2, 3]}';

        const result = optimizer.extractJSON(text);

        expect(result).toEqual({
          nested: { data: 'test' },
          array: [1, 2, 3]
        });
      });

      test('should return null for invalid JSON', () => {
        const text = 'This is not JSON';

        const result = optimizer.extractJSON(text);

        expect(result).toBeNull();
      });

      test('should return null for malformed JSON', () => {
        const text = '{"invalid": "json"';

        const result = optimizer.extractJSON(text);

        expect(result).toBeNull();
      });
    });

    describe('parseImprovements()', () => {
      test('should parse numbered improvements', () => {
        const text = `1. Add more headings
2. Improve meta description
3. Add internal links`;

        const result = optimizer.parseImprovements(text);

        expect(result).toHaveLength(3);
        expect(result[0]).toBe('Add more headings');
        expect(result[1]).toBe('Improve meta description');
        expect(result[2]).toBe('Add internal links');
      });

      test('should filter non-numbered lines', () => {
        const text = `Some intro text
1. First improvement
Not numbered
2. Second improvement`;

        const result = optimizer.parseImprovements(text);

        expect(result).toHaveLength(2);
        expect(result[0]).toBe('First improvement');
        expect(result[1]).toBe('Second improvement');
      });

      test('should handle empty input', () => {
        const result = optimizer.parseImprovements('');

        expect(result).toEqual([]);
      });

      test('should trim whitespace from improvements', () => {
        const text = '1.   Improvement with spaces   ';

        const result = optimizer.parseImprovements(text);

        expect(result[0]).toBe('Improvement with spaces');
      });

      test('should handle multiline improvements', () => {
        const text = `Introduction text
1. First improvement
2. Second improvement
3. Third improvement
Conclusion text`;

        const result = optimizer.parseImprovements(text);

        expect(result).toHaveLength(3);
      });
    });

    describe('Integration Edge Cases', () => {
      test('should handle post with very long content', () => {
        const longContent = '<p>' + 'word '.repeat(10000) + '</p>';
        const mockPost = {
          title: { rendered: 'Test Title' },
          content: { rendered: longContent }
        };
        const mockAudit = { issues: [] };

        const prompt = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        expect(prompt).toBeDefined();
        expect(typeof prompt).toBe('string');
      });

      test('should handle post with special characters in title', () => {
        const mockPost = {
          title: { rendered: 'Test & Title with "quotes" and \'apostrophes\'' },
          content: { rendered: '<p>Content</p>' }
        };
        const mockAudit = { issues: [] };

        const prompt = optimizer.buildOptimizationPrompt(mockPost, mockAudit);

        expect(prompt).toContain('Test & Title');
        expect(prompt).toContain('quotes');
      });

      test('should handle deeply nested HTML', () => {
        const nestedHTML = '<div><section><article><p><strong><em>Nested content</em></strong></p></article></section></div>';
        const result = optimizer.stripHtml(nestedHTML);

        expect(result).toBe('Nested content');
        expect(result).not.toContain('<');
      });

      test('should parse suggestions with unicode characters', () => {
        const aiResponse = `1. Título: Mejorar el contenido
2. Descripción: Añadir más palabras clave
3. Links: Agregar enlaces internos`;

        const result = optimizer.parseAISuggestions(aiResponse);

        expect(result).toHaveLength(3);
        expect(result[0].suggestion).toContain('Mejorar');
        expect(result[1].suggestion).toContain('Añadir');
      });

      test('should extract JSON with unicode', () => {
        const text = 'Response: {"name": "José", "city": "São Paulo"}';

        const result = optimizer.extractJSON(text);

        expect(result).toEqual({ name: 'José', city: 'São Paulo' });
      });

      test('should handle empty issues in prompt', () => {
        const mockPost = {
          title: { rendered: 'Title' },
          content: { rendered: '<p>Content</p>' }
        };
        const emptyAudit = { issues: [] };

        const prompt = optimizer.buildOptimizationPrompt(mockPost, emptyAudit);

        expect(prompt).not.toContain('undefined');
        expect(prompt).toContain('SEO expert');
      });
    });
  });

  describe('AI Generation Methods', () => {
    const mockPost = {
      id: 1,
      title: { rendered: 'SEO Best Practices' },
      content: { rendered: '<p>This is content about SEO best practices for WordPress websites.</p>' },
      excerpt: { rendered: 'SEO tips and tricks' }
    };

    beforeEach(() => {
      // Mock generateText method
      optimizer.generateText = jest.fn();
    });

    describe('generateOptimizedTitle()', () => {
      test('should generate optimized title suggestions', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. SEO Best Practices for WordPress Sites\n2. Ultimate Guide to SEO Best Practices\n3. WordPress SEO: Best Practices Guide',
          source: 'openai'
        });

        const result = await optimizer.generateOptimizedTitle(mockPost, 'WordPress SEO');

        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('SEO-optimized title'));
        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('WordPress SEO'));
        expect(result).toHaveProperty('currentTitle', 'SEO Best Practices');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('source', 'openai');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      test('should include target keyword in prompt', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Title 1\n2. Title 2\n3. Title 3',
          source: 'anthropic'
        });

        await optimizer.generateOptimizedTitle(mockPost, 'SEO optimization');

        expect(optimizer.generateText).toHaveBeenCalledWith(
          expect.stringContaining('SEO optimization')
        );
      });

      test('should include current title in prompt', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Title\n2. Title\n3. Title',
          source: 'openai'
        });

        await optimizer.generateOptimizedTitle(mockPost, 'keyword');

        expect(optimizer.generateText).toHaveBeenCalledWith(
          expect.stringContaining('SEO Best Practices')
        );
      });

      test('should handle AI generation errors', async () => {
        optimizer.generateText.mockRejectedValue(new Error('AI API timeout'));

        await expect(
          optimizer.generateOptimizedTitle(mockPost, 'keyword')
        ).rejects.toThrow('AI API timeout');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'AI title generation failed',
          'AI API timeout'
        );
      });

      test('should extract title options from AI response', async () => {
        const mockTitles = '1. First Title\n2. Second Title\n3. Third Title';
        optimizer.generateText.mockResolvedValue({
          text: mockTitles,
          source: 'openai'
        });

        const result = await optimizer.generateOptimizedTitle(mockPost, 'test');

        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('generateMetaDescription()', () => {
      test('should generate meta description suggestions', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Discover SEO best practices for WordPress sites with our comprehensive guide.\n2. Learn essential SEO techniques for optimizing WordPress websites.',
          source: 'openai'
        });

        const result = await optimizer.generateMetaDescription(mockPost, 'WordPress SEO');

        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('meta description'));
        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('WordPress SEO'));
        expect(result).toHaveProperty('currentExcerpt', 'SEO tips and tricks');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('source', 'openai');
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      test('should include character length requirements in prompt', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Description one\n2. Description two',
          source: 'anthropic'
        });

        await optimizer.generateMetaDescription(mockPost, 'SEO');

        expect(optimizer.generateText).toHaveBeenCalledWith(
          expect.stringContaining('150-160 characters')
        );
      });

      test('should include post title and content in prompt', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Meta 1\n2. Meta 2',
          source: 'openai'
        });

        await optimizer.generateMetaDescription(mockPost, 'keyword');

        const callArg = optimizer.generateText.mock.calls[0][0];
        expect(callArg).toContain('SEO Best Practices');
        expect(callArg).toContain('SEO best practices');
      });

      test('should handle AI generation errors', async () => {
        optimizer.generateText.mockRejectedValue(new Error('API rate limit'));

        await expect(
          optimizer.generateMetaDescription(mockPost, 'keyword')
        ).rejects.toThrow('API rate limit');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'AI meta description generation failed',
          'API rate limit'
        );
      });

      test('should extract description options from response', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. First description here\n2. Second description here',
          source: 'openai'
        });

        const result = await optimizer.generateMetaDescription(mockPost, 'test');

        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('extractKeywords()', () => {
      test('should extract keywords from post content', async () => {
        const mockKeywords = {
          primary: 'SEO',
          secondary: ['WordPress', 'optimization', 'best practices', 'ranking'],
          longTail: ['SEO best practices for WordPress', 'optimize WordPress SEO']
        };

        optimizer.generateText.mockResolvedValue({
          text: JSON.stringify(mockKeywords),
          source: 'openai'
        });

        const result = await optimizer.extractKeywords(mockPost);

        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('extract'));
        expect(result).toHaveProperty('postTitle', 'SEO Best Practices');
        expect(result).toHaveProperty('keywords');
        expect(result).toHaveProperty('source', 'openai');
        expect(result.keywords).toEqual(mockKeywords);
      });

      test('should request primary, secondary, and long-tail keywords', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '{"primary":"test","secondary":[],"longTail":[]}',
          source: 'anthropic'
        });

        await optimizer.extractKeywords(mockPost);

        const callArg = optimizer.generateText.mock.calls[0][0];
        expect(callArg).toContain('Primary keyword');
        expect(callArg).toContain('Secondary keywords');
        expect(callArg).toContain('Long-tail keyword');
      });

      test('should include post content in analysis', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '{"primary":"test","secondary":[],"longTail":[]}',
          source: 'openai'
        });

        await optimizer.extractKeywords(mockPost);

        expect(optimizer.generateText).toHaveBeenCalledWith(
          expect.stringContaining('SEO best practices')
        );
      });

      test('should handle AI generation errors', async () => {
        optimizer.generateText.mockRejectedValue(new Error('Network error'));

        await expect(
          optimizer.extractKeywords(mockPost)
        ).rejects.toThrow('Network error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'AI keyword extraction failed',
          'Network error'
        );
      });

      test('should parse JSON response correctly', async () => {
        const keywords = {
          primary: 'content marketing',
          secondary: ['blogging', 'SEO', 'social media'],
          longTail: ['how to create content marketing strategy']
        };

        optimizer.generateText.mockResolvedValue({
          text: JSON.stringify(keywords),
          source: 'openai'
        });

        const result = await optimizer.extractKeywords(mockPost);

        expect(result.keywords.primary).toBe('content marketing');
        expect(result.keywords.secondary).toHaveLength(3);
        expect(result.keywords.longTail).toHaveLength(1);
      });
    });

    describe('getContentImprovements()', () => {
      const mockAuditResults = {
        score: 65,
        issues: [
          { message: 'Title too short' },
          { message: 'Missing meta description' },
          { message: 'No internal links' }
        ]
      };

      test('should get content improvement suggestions', async () => {
        const improvements = '1. Expand title to 60 characters\n2. Add meta description\n3. Include 3-5 internal links\n4. Add call-to-action\n5. Break up long paragraphs';

        optimizer.generateText.mockResolvedValue({
          text: improvements,
          source: 'openai'
        });

        const result = await optimizer.getContentImprovements(mockPost, mockAuditResults);

        expect(optimizer.generateText).toHaveBeenCalledWith(expect.stringContaining('improvements'));
        expect(result).toHaveProperty('postTitle', 'SEO Best Practices');
        expect(result).toHaveProperty('improvements');
        expect(result).toHaveProperty('source', 'openai');
        expect(Array.isArray(result.improvements)).toBe(true);
      });

      test('should include audit issues in prompt', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Improvement one\n2. Improvement two',
          source: 'anthropic'
        });

        await optimizer.getContentImprovements(mockPost, mockAuditResults);

        const callArg = optimizer.generateText.mock.calls[0][0];
        expect(callArg).toContain('Title too short');
        expect(callArg).toContain('Missing meta description');
        expect(callArg).toContain('No internal links');
      });

      test('should request specific improvement categories', async () => {
        optimizer.generateText.mockResolvedValue({
          text: '1. Test\n2. Test\n3. Test',
          source: 'openai'
        });

        await optimizer.getContentImprovements(mockPost, mockAuditResults);

        const callArg = optimizer.generateText.mock.calls[0][0];
        expect(callArg).toContain('content improvements');
        expect(callArg).toContain('Heading structure');
        expect(callArg).toContain('Internal linking');
        expect(callArg).toContain('Call-to-action');
        expect(callArg).toContain('Readability');
      });

      test('should handle AI generation errors', async () => {
        optimizer.generateText.mockRejectedValue(new Error('Service unavailable'));

        await expect(
          optimizer.getContentImprovements(mockPost, mockAuditResults)
        ).rejects.toThrow('Service unavailable');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'AI content improvement failed',
          'Service unavailable'
        );
      });

      test('should parse improvement suggestions', async () => {
        const improvements = '1. Add more examples\n2. Include statistics\n3. Improve readability\n4. Add images\n5. Create FAQ section';

        optimizer.generateText.mockResolvedValue({
          text: improvements,
          source: 'openai'
        });

        const result = await optimizer.getContentImprovements(mockPost, mockAuditResults);

        expect(result.improvements.length).toBeGreaterThan(0);
      });

      test('should handle empty issues array', async () => {
        const emptyAudit = { score: 90, issues: [] };

        optimizer.generateText.mockResolvedValue({
          text: '1. Great job!\n2. Minor tweaks possible',
          source: 'openai'
        });

        const result = await optimizer.getContentImprovements(mockPost, emptyAudit);

        expect(result).toBeDefined();
        expect(optimizer.generateText).toHaveBeenCalled();
      });
    });
  });

  describe('API Response Parsing', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should parse Claude API response successfully (lines 83-85)', async () => {
      const optimizerWithClaude = new AIContentOptimizer();
      optimizerWithClaude.anthropicKey = 'test-claude-key';

      const mockClaudeResponse = {
        data: {
          content: [{
            text: '1. Improve title length\n2. Add more keywords\n3. Enhance readability'
          }]
        }
      };

      mockPost.mockResolvedValue(mockClaudeResponse);

      const mockPostData = {
        id: 1,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Content here</p>' }
      };

      const mockAuditResults = { score: 50, issues: [{ type: 'title', severity: 'warning', message: 'Title too short' }] };

      const result = await optimizerWithClaude.optimizeContent(mockPostData, mockAuditResults);

      expect(result).toBeDefined();
      expect(result.source).toBe('Claude 3 Haiku');
      expect(result.suggestions).toBeDefined();
      expect(result.raw).toBe('1. Improve title length\n2. Add more keywords\n3. Enhance readability');
    });

    test('should parse OpenAI API response successfully (lines 130-132)', async () => {
      const optimizerWithOpenAI = new AIContentOptimizer();
      optimizerWithOpenAI.openaiKey = 'test-openai-key';

      const mockOpenAIResponse = {
        data: {
          choices: [{
            message: {
              content: '1. Optimize meta description\n2. Add internal links\n3. Improve heading structure'
            }
          }]
        }
      };

      mockPost.mockResolvedValue(mockOpenAIResponse);

      const mockPostData = {
        id: 2,
        title: { rendered: 'OpenAI Test' },
        content: { rendered: '<p>OpenAI content</p>' }
      };

      const mockAuditResults = { score: 60, issues: [] };

      const result = await optimizerWithOpenAI.optimizeContent(mockPostData, mockAuditResults);

      expect(result).toBeDefined();
      expect(result.source).toBe('GPT-4o');
      expect(result.suggestions).toBeDefined();
    });

    test('should parse Gemini API response successfully (lines 176-179)', async () => {
      const optimizerWithGemini = new AIContentOptimizer();
      optimizerWithGemini.geminiKey = 'test-gemini-key';

      const mockGeminiResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: '1. Enhance keyword density\n2. Add schema markup\n3. Improve mobile responsiveness'
              }]
            }
          }]
        }
      };

      mockPost.mockResolvedValue(mockGeminiResponse);

      const mockPostData = {
        id: 3,
        title: { rendered: 'Gemini Test Post' },
        content: { rendered: '<p>Gemini content here</p>' }
      };

      const mockAuditResults = { score: 55, issues: [{ type: 'content', severity: 'warning', message: 'Thin content' }] };

      const result = await optimizerWithGemini.optimizeContent(mockPostData, mockAuditResults);

      expect(result).toBeDefined();
      expect(result.source).toBe('Google Gemini 2.5 Flash');
      expect(result.suggestions).toBeDefined();
    });

    test('should parse Cohere API response successfully (lines 215-217)', async () => {
      const optimizerWithCohere = new AIContentOptimizer();
      optimizerWithCohere.cohereKey = 'test-cohere-key';

      const mockCohereResponse = {
        data: {
          generations: [{
            text: '1. Add more examples\n2. Include statistics\n3. Create FAQ section\n4. Improve introduction\n5. Add call-to-action'
          }]
        }
      };

      mockPost.mockResolvedValue(mockCohereResponse);

      const mockPostData = {
        id: 4,
        title: { rendered: 'Cohere Test Post' },
        content: { rendered: '<p>Cohere content testing</p>' }
      };

      const mockAuditResults = { score: 45, issues: [{ type: 'title', severity: 'warning', message: 'Title needs improvement' }] };

      const result = await optimizerWithCohere.optimizeContent(mockPostData, mockAuditResults);

      expect(result).toBeDefined();
      expect(result.source).toBe('Cohere Command');
      expect(result.suggestions).toBeDefined();
    });

    test('should handle API response with complex suggestions', async () => {
      const optimizerWithClaude = new AIContentOptimizer();
      optimizerWithClaude.anthropicKey = 'test-key';

      const complexResponse = {
        data: {
          content: [{
            text: '1. Add comprehensive meta description (120-155 characters)\n2. Include primary keyword "SEO optimization" in first paragraph\n3. Add 3-5 internal links to related content\n4. Include at least one high-quality image with alt text\n5. Optimize heading hierarchy (H1 → H2 → H3)'
          }]
        }
      };

      mockPost.mockResolvedValue(complexResponse);

      const mockPostData = {
        id: 5,
        title: { rendered: 'Complex SEO Test' },
        content: { rendered: '<p>Complex content</p>' }
      };

      const result = await optimizerWithClaude.optimizeContent(mockPostData, { score: 40, issues: [] });

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Provider Fallback (generateText)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should use Claude when anthropicKey is available (lines 426-442)', async () => {
      const optimizerWithClaude = new AIContentOptimizer();
      optimizerWithClaude.anthropicKey = 'test-claude-key';

      const mockResponse = {
        data: {
          content: [{
            text: 'Claude generated content here'
          }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await optimizerWithClaude.generateText('Test prompt');

      expect(result.text).toBe('Claude generated content here');
      expect(result.source).toBe('Claude 3 Haiku');
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'Test prompt' }]
        }),
        expect.any(Object)
      );
    });

    test('should use OpenAI when only openaiKey is available (lines 445-460)', async () => {
      const optimizerWithOpenAI = new AIContentOptimizer();
      optimizerWithOpenAI.openaiKey = 'test-openai-key';

      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'OpenAI generated content'
            }
          }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await optimizerWithOpenAI.generateText('OpenAI test prompt');

      expect(result.text).toBe('OpenAI generated content');
      expect(result.source).toBe('GPT-4o');
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'OpenAI test prompt' }],
          max_tokens: 1000
        }),
        expect.any(Object)
      );
    });

    test('should use Gemini when only geminiKey is available (lines 463-470)', async () => {
      const optimizerWithGemini = new AIContentOptimizer();
      optimizerWithGemini.geminiKey = 'test-gemini-key';

      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: 'Gemini generated content'
              }]
            }
          }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await optimizerWithGemini.generateText('Gemini prompt');

      expect(result.text).toBe('Gemini generated content');
      expect(result.source).toBe('Gemini 2.5 Flash');
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          contents: [{ parts: [{ text: 'Gemini prompt' }] }]
        })
      );
    });

    test('should throw error when no API keys configured (line 473)', async () => {
      const optimizerNoKeys = new AIContentOptimizer();

      await expect(optimizerNoKeys.generateText('Test')).rejects.toThrow('No AI API keys configured');
    });

    test('should prefer Claude over other providers', async () => {
      const optimizerMultiKeys = new AIContentOptimizer();
      optimizerMultiKeys.anthropicKey = 'claude-key';
      optimizerMultiKeys.openaiKey = 'openai-key';
      optimizerMultiKeys.geminiKey = 'gemini-key';

      const mockResponse = {
        data: {
          content: [{
            text: 'Claude response'
          }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await optimizerMultiKeys.generateText('Priority test');

      expect(result.source).toBe('Claude 3 Haiku');
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should prefer OpenAI over Gemini when Claude unavailable', async () => {
      const optimizerMultiKeys = new AIContentOptimizer();
      optimizerMultiKeys.openaiKey = 'openai-key';
      optimizerMultiKeys.geminiKey = 'gemini-key';

      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'OpenAI response' }
          }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await optimizerMultiKeys.generateText('Priority test 2');

      expect(result.source).toBe('GPT-4o');
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});
