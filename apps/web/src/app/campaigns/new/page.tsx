'use client';

import { useState } from 'react';

export default function NewCampaign() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    templateIds: '',
    targetUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert comma-separated templateIds to array
      const templateIdsArray = formData.templateIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (templateIdsArray.length === 0) {
        alert('Please provide at least one template ID');
        setLoading(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          templateIds: templateIdsArray,
          targetUrl: formData.targetUrl || undefined,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Failed to create campaign: ${error.message || 'Unknown error'}`);
        return;
      }

      await res.json();
      alert('Campaign created successfully!');
      window.location.href = '/campaigns';
    } catch (error) {
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Create Campaign</h2>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Campaign Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Summer Sale Promotion"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Template IDs</label>
          <input
            type="text"
            required
            value={formData.templateIds}
            onChange={(e) => setFormData({ ...formData, templateIds: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., template-id-1, template-id-2 (comma-separated)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter one or more template IDs separated by commas. Messages will rotate through templates.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Target URL (Optional)</label>
          <input
            type="url"
            value={formData.targetUrl}
            onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/offer"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, a short link will be generated for tracking clicks
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
          <a
            href="/campaigns"
            className="btn btn-secondary"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
