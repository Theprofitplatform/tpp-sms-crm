'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  phoneE164: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  consentStatus: string;
  lastSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchContacts = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/contacts?${params}`);
      const data = await response.json();

      if (response.ok) {
        setContacts(data.contacts);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch contacts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(currentPage, search);
  }, [currentPage, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchContacts(1, search);
  };

  const formatPhone = (phone: string) => {
    // Format Australian numbers
    if (phone.startsWith('+61')) {
      return `0${phone.slice(3)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Contacts</h2>
        <div className="text-sm text-gray-500">
          {pagination && `Total: ${pagination.total} contacts`}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Contacts Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {search ? 'No contacts found matching your search.' : 'No contacts found.'}
            </p>
            {!search && (
              <a href="/imports/new" className="btn btn-primary mt-4 inline-block">
                Import Contacts
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.location.href = `/contacts/${contact.id}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {contact.firstName || contact.lastName ? (
                                `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                              ) : (
                                <span className="text-gray-400">Unknown</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatPhone(contact.phoneE164)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contact.consentStatus === 'explicit'
                              ? 'bg-green-100 text-green-800'
                              : contact.consentStatus === 'implied'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {contact.consentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.lastSentAt ? formatDate(contact.lastSentAt) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((currentPage - 1) * 50) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 50, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> contacts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}