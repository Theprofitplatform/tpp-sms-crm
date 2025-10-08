'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  totalContacts: number;
  activeCampaigns: number;
  messagesSentToday: number;
  deliveryRate: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/reports/dashboard');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        console.error('Failed to fetch dashboard stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Total Contacts</h3>
          <p className="mt-2 text-3xl font-semibold">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              stats?.totalContacts || 0
            )}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Active Campaigns</h3>
          <p className="mt-2 text-3xl font-semibold">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              stats?.activeCampaigns || 0
            )}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Messages Sent Today</h3>
          <p className="mt-2 text-3xl font-semibold">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              stats?.messagesSentToday || 0
            )}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Delivery Rate</h3>
          <p className="mt-2 text-3xl font-semibold">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              stats?.deliveryRate || '0%'
            )}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a href="/imports/new" className="card hover:shadow-lg cursor-pointer">
            <h4 className="font-medium">Import Contacts</h4>
            <p className="text-sm text-gray-500 mt-1">Upload CSV to add or update contacts</p>
          </a>
          <a href="/campaigns/new" className="card hover:shadow-lg cursor-pointer">
            <h4 className="font-medium">Create Campaign</h4>
            <p className="text-sm text-gray-500 mt-1">Start a new SMS campaign</p>
          </a>
          <a href="/reports" className="card hover:shadow-lg cursor-pointer">
            <h4 className="font-medium">View Reports</h4>
            <p className="text-sm text-gray-500 mt-1">Campaign analytics and metrics</p>
          </a>
        </div>
      </div>
    </div>
  );
}
