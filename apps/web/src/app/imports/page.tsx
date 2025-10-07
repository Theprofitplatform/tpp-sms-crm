'use client';

import { useState } from 'react';

export default function Imports() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDryRun = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/imports/contacts/dry-run`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      setPreview(data);
    } catch (error) {
      alert('Dry-run failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/imports/contacts/commit`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      alert(`Import completed: ${data.summary.created} created, ${data.summary.updated} updated`);
      setPreview(null);
      setFile(null);
    } catch (error) {
      alert('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        phone: '+61412345678',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'Australia/Sydney',
        consentStatus: 'explicit',
        consentSource: 'website_signup',
      },
      {
        phone: '+61498765432',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'Australia/Melbourne',
        consentStatus: 'implied',
        consentSource: 'previous_customer',
      },
      {
        phone: '+61411223344',
        email: '',
        firstName: 'Bob',
        lastName: 'Wilson',
        timezone: 'Australia/Brisbane',
        consentStatus: 'explicit',
        consentSource: 'phone_call',
      },
    ];

    // Convert to CSV
    const headers = ['phone', 'email', 'firstName', 'lastName', 'timezone', 'consentStatus', 'consentSource'];
    const csvRows = [
      headers.join(','),
      ...sampleData.map(row => headers.map(h => row[h as keyof typeof row] || '').join(',')),
    ];
    const csvContent = csvRows.join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-contacts.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Import Contacts</h2>

      <div className="card mb-6">
        <h3 className="font-medium mb-4">Upload CSV</h3>
        <p className="text-sm text-gray-600 mb-4">
          CSV must include: phone, email (optional), firstName, lastName, consentStatus (explicit/implied)
        </p>

        <button
          onClick={downloadSampleCSV}
          className="btn btn-secondary mb-4 text-sm"
        >
          Download Sample CSV
        </button>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4 block"
        />

        <div className="flex gap-4">
          <button
            onClick={handleDryRun}
            disabled={!file || loading}
            className="btn btn-secondary"
          >
            Preview
          </button>
        </div>
      </div>

      {preview && (
        <div className="card">
          <h3 className="font-medium mb-4">Preview Results</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Will Create</p>
              <p className="text-2xl font-semibold text-green-600">{preview.summary.createCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Will Update</p>
              <p className="text-2xl font-semibold text-blue-600">{preview.summary.updateCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Invalid/DNC</p>
              <p className="text-2xl font-semibold text-red-600">
                {preview.summary.invalidPhoneCount + preview.summary.dncCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Suppressed</p>
              <p className="text-2xl font-semibold text-yellow-600">{preview.summary.suppressedCount}</p>
            </div>
          </div>

          <button onClick={handleCommit} disabled={loading} className="btn btn-primary">
            Commit Import
          </button>
        </div>
      )}
    </div>
  );
}
