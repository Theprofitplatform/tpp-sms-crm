'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    segmentId: '',
    scheduledAt: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          message: formData.message,
          segmentId: formData.segmentId || null,
          scheduledAt: formData.scheduledAt || null,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Failed to create campaign: ${error.message || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      alert('Campaign created successfully!');
      router.push('/campaigns');
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
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Your SMS message (160 characters recommended)"
            maxLength={1600}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.message.length} characters</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Segment ID (Optional)</label>
          <input
            type="text"
            value={formData.segmentId}
            onChange={(e) => setFormData({ ...formData, segmentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty to send to all contacts"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Schedule For (Optional)</label>
          <input
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/campaigns')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
