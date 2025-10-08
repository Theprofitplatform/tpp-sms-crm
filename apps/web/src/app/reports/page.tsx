'use client';

import { useState, useEffect } from 'react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent?: number;
  delivered?: number;
  clicks?: number;
}

export default function Reports() {
  const [campaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch campaigns with stats from API
    setLoading(false);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reports & Analytics</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
          <p className="mt-2 text-3xl font-semibold">-</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Delivered</h3>
          <p className="mt-2 text-3xl font-semibold">-</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Clicks</h3>
          <p className="mt-2 text-3xl font-semibold">-</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Opt-Outs</h3>
          <p className="mt-2 text-3xl font-semibold">-</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium mb-4">Campaign Performance</h3>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500">No campaigns to display</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Delivered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.sent || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.delivered || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.clicks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
