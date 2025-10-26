import React, { useState } from 'react';
import { Search, Globe, Users, Lightbulb, Loader } from 'lucide-react';

interface SeedDiscoveryProps {
  onSeedsDiscovered?: (seeds: string[]) => void;
}

interface DiscoveryResult {
  from_website: string[];
  from_description: string[];
  from_competitors: string[];
  from_niche: string[];
  recommended: string[];
}

export const SeedDiscovery: React.FC<SeedDiscoveryProps> = ({ onSeedsDiscovered }) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveryResult | null>(null);

  const discoverSeeds = async () => {
    if (!url && !description && !niche) {
      alert('Please provide at least a URL, description, or niche');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/automation/discover-seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url || undefined,
          description: description || undefined,
          competitors: competitors ? competitors.split(',').map(c => c.trim()).filter(Boolean) : undefined,
          niche: niche || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.seeds);
        if (onSeedsDiscovered && data.seeds.recommended) {
          onSeedsDiscovered(data.seeds.recommended);
        }
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Discovery error:', error);
      alert('Failed to discover seeds. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const copySeeds = (seeds: string[]) => {
    navigator.clipboard.writeText(seeds.join(', '));
    alert('✅ Seeds copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          Auto-Discover Seed Keywords
        </h2>
        <p className="text-gray-600 text-sm">
          Automatically discover relevant keywords from your website, competitors, or industry niche
        </p>
      </div>

      {!results ? (
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              System will crawl and extract topics automatically
            </p>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Business Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Digital marketing agency in Sydney specializing in SEO and PPC'"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Competitors Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Competitors (optional, comma-separated)
            </label>
            <input
              type="text"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="competitor1.com, competitor2.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Niche Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry/Niche (optional)
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., 'digital marketing', 'plumbing services'"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Discover Button */}
          <button
            onClick={discoverSeeds}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Lightbulb className="w-5 h-5" />
                Auto-Discover Seeds
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">✅ Discovery Complete!</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">From Website</p>
                <p className="text-2xl font-bold text-blue-600">{results.from_website?.length || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">From Niche</p>
                <p className="text-2xl font-bold text-purple-600">{results.from_niche?.length || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">From Competitors</p>
                <p className="text-2xl font-bold text-red-600">{results.from_competitors?.length || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Recommended</p>
                <p className="text-2xl font-bold text-green-600">{results.recommended?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Recommended Seeds */}
          {results.recommended && results.recommended.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">🎯 Top Recommended Seeds</h3>
                <button
                  onClick={() => copySeeds(results.recommended)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  Copy All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.recommended.slice(0, 30).map((seed, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 rounded-full text-sm font-medium border border-blue-200"
                  >
                    {index + 1}. {seed}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* From Website */}
          {results.from_website && results.from_website.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  From Website ({results.from_website.length})
                </h3>
                <button
                  onClick={() => copySeeds(results.from_website)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Copy
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.from_website.slice(0, 20).map((seed, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm border border-blue-100"
                  >
                    {seed}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* From Niche */}
          {results.from_niche && results.from_niche.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-500" />
                  From Niche ({results.from_niche.length})
                </h3>
                <button
                  onClick={() => copySeeds(results.from_niche)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Copy
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.from_niche.slice(0, 20).map((seed, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-sm border border-purple-100"
                  >
                    {seed}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => setResults(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discover Again
            </button>
            <button
              onClick={() => copySeeds(results.recommended)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Use These Seeds
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!results && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Pro Tip:</strong> Provide multiple inputs for best results. The system will cross-reference and recommend the most relevant seeds.
          </p>
        </div>
      )}
    </div>
  );
};
