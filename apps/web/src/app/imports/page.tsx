'use client';

export default function Imports() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Import History</h2>
        <a href="/imports/new" className="btn btn-primary">
          New Import
        </a>
      </div>

      <div className="card">
        <p className="text-gray-500">No import history yet. Start by importing your first CSV.</p>
      </div>
    </div>
  );
}
