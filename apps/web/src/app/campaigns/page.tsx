'use client';

export default function Campaigns() {

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Campaigns</h2>
        <a href="/campaigns/new" className="btn btn-primary">
          Create Campaign
        </a>
      </div>

      <div className="card">
        <p className="text-gray-500">No campaigns yet. Create your first campaign to get started.</p>
      </div>
    </div>
  );
}
