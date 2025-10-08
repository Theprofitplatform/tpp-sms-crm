'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  phoneE164: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  consentStatus: string;
  consentSource?: string;
  consentTimestamp?: string;
  customFields?: Record<string, unknown>;
  lastSentAt?: string;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageEvent {
  id: string;
  eventType: string;
  campaignId?: string;
  campaignName?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ClickEvent {
  id: string;
  token: string;
  campaignId?: string;
  campaignName?: string;
  targetUrl: string;
  clickedAt?: string;
  clickCount: number;
  humanClickCount: number;
  createdAt: string;
}

interface DncStatus {
  isOnDnc: boolean;
  reason?: string;
  addedAt?: string;
}

interface ImportBatch {
  id: string;
  fileName: string;
  createdAt: string;
}

export default function ContactDetail() {
  const params = useParams();
  const contactId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [messageHistory, setMessageHistory] = useState<MessageEvent[]>([]);
  const [clickHistory, setClickHistory] = useState<ClickEvent[]>([]);
  const [dncStatus, setDncStatus] = useState<DncStatus>({ isOnDnc: false });
  const [importBatch, setImportBatch] = useState<ImportBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [dncLoading, setDncLoading] = useState(false);

  const fetchContactDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts/${contactId}`);
      const data = await response.json();

      if (response.ok) {
        setContact(data.contact);
        setMessageHistory(data.messageHistory || []);
        setClickHistory(data.clickHistory || []);
        setDncStatus(data.dncStatus || { isOnDnc: false });
        setImportBatch(data.importBatch || null);
      } else {
        console.error('Failed to fetch contact:', data.error);
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactId) {
      fetchContactDetail();
    }
  }, [contactId]);

  const handleDncToggle = async () => {
    setDncLoading(true);
    try {
      if (dncStatus.isOnDnc) {
        // Remove from DNC
        const response = await fetch(`/api/contacts/${contactId}/dnc`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setDncStatus({ isOnDnc: false });
        }
      } else {
        // Add to DNC
        const response = await fetch(`/api/contacts/${contactId}/dnc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'MANUAL' }),
        });
        if (response.ok) {
          const data = await response.json();
          setDncStatus({
            isOnDnc: true,
            reason: data.dncEntry.reason,
            addedAt: data.dncEntry.createdAt,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling DNC status:', error);
    } finally {
      setDncLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: { [key: string]: string } = {
      SENT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CLICKED: 'bg-purple-100 text-purple-800',
      QUEUED: 'bg-gray-100 text-gray-800',
      REPLIED: 'bg-yellow-100 text-yellow-800',
      OPT_OUT: 'bg-red-100 text-red-800',
      RESUBSCRIBE: 'bg-green-100 text-green-800',
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading contact details...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Contact not found.</p>
        <a href="/contacts" className="btn btn-primary mt-4 inline-block">
          Back to Contacts
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <a href="/contacts" className="text-blue-600 hover:text-blue-800">
            ← Back to Contacts
          </a>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">
              {contact.firstName || contact.lastName ? (
                `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              ) : (
                'Unknown Contact'
              )}
            </h2>
            <p className="text-gray-500 mt-1">{formatPhone(contact.phoneE164)}</p>
          </div>
          <button
            onClick={handleDncToggle}
            disabled={dncLoading}
            className={`px-4 py-2 rounded-md font-medium ${
              dncStatus.isOnDnc
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {dncLoading ? '...' : dncStatus.isOnDnc ? 'Remove from DNC' : 'Add to DNC'}
          </button>
        </div>
      </div>

      {/* DNC Status */}
      {dncStatus.isOnDnc && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Do Not Contact</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>Reason: {dncStatus.reason}</p>
                {dncStatus.addedAt && <p>Added: {formatDate(dncStatus.addedAt)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['details', 'messages', 'clicks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatPhone(contact.phoneE164)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contact.email || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contact.timezone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Consent Status</dt>
                  <dd className="mt-1">
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
                  </dd>
                </div>
                {contact.consentSource && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Consent Source</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contact.consentSource}</dd>
                  </div>
                )}
                {contact.consentTimestamp && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Consent Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(contact.consentTimestamp)}
                    </dd>
                  </div>
                )}
                {contact.lastSentAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Message Sent</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(contact.lastSentAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">System Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(contact.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(contact.updatedAt)}</dd>
                </div>
                {importBatch && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Imported From</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {importBatch.fileName} ({formatDate(importBatch.createdAt)})
                    </dd>
                  </div>
                )}
              </dl>

              {contact.customFields && Object.keys(contact.customFields).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-3">Custom Fields</h4>
                  <dl className="space-y-2">
                    {Object.entries(contact.customFields).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium text-gray-500 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Message History</h3>
            {messageHistory.length === 0 ? (
              <p className="text-gray-500">No message history found.</p>
            ) : (
              <div className="space-y-4">
                {messageHistory.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(
                          event.eventType
                        )}`}
                      >
                        {event.eventType}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(event.createdAt)}</span>
                    </div>
                    {event.campaignName && (
                      <p className="text-sm text-gray-700 mb-2">
                        Campaign: {event.campaignName}
                      </p>
                    )}
                    {event.metadata && (
                      <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clicks' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Click History</h3>
            {clickHistory.length === 0 ? (
              <p className="text-gray-500">No click history found.</p>
            ) : (
              <div className="space-y-4">
                {clickHistory.map((click) => (
                  <div key={click.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {click.campaignName || 'Unknown Campaign'}
                        </p>
                        <p className="text-xs text-gray-500">Token: {click.token}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {click.clickedAt ? formatDate(click.clickedAt) : 'Not clicked'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Target URL:</span>
                        <a
                          href={click.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 truncate block"
                        >
                          {click.targetUrl}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-500">Clicks:</span>
                        <span className="ml-2 text-gray-900">
                          {click.humanClickCount} human / {click.clickCount} total
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}