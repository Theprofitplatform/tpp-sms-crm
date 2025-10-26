import React, { useState, useMemo } from 'react';
import { Badge } from '../common/Badge';
import { formatNumber, formatCurrency, getIntentBadgeClass } from '@/utils/format';
import type { Keyword } from '@/types';
import { Search, ArrowUpDown } from 'lucide-react';

interface KeywordTableProps {
  keywords: Keyword[];
  loading?: boolean;
}

type SortField = 'text' | 'volume' | 'difficulty' | 'opportunity' | 'traffic_potential';
type SortDirection = 'asc' | 'desc';

export const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('opportunity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedKeywords = useMemo(() => {
    let filtered = keywords;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((kw) =>
        kw.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Intent filter
    if (intentFilter !== 'all') {
      filtered = filtered.filter((kw) => kw.intent === intentFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Convert string numbers to numbers
      if (typeof aVal === 'string') aVal = parseFloat(aVal) || 0;
      if (typeof bVal === 'string') bVal = parseFloat(bVal) || 0;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [keywords, searchTerm, intentFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const intents = ['all', ...new Set(keywords.map((k) => k.intent))];

  if (loading) {
    return <div className="text-center py-8">Loading keywords...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
        >
          {intents.map((intent) => (
            <option key={intent} value={intent}>
              {intent === 'all' ? 'All Intents' : intent}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('text')}
              >
                <div className="flex items-center gap-1">
                  Keyword
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Intent
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center gap-1">
                  Volume
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPC
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('difficulty')}
              >
                <div className="flex items-center gap-1">
                  Difficulty
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('opportunity')}
              >
                <div className="flex items-center gap-1">
                  Opportunity
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('traffic_potential')}
              >
                <div className="flex items-center gap-1">
                  Traffic
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedKeywords.map((keyword, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{keyword.text}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={keyword.intent === 'informational' ? 'info' : keyword.intent === 'commercial' ? 'warning' : 'success'} size="sm">
                    {keyword.intent}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(keyword.volume)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {typeof keyword.cpc === 'number' ? formatCurrency(keyword.cpc) : keyword.cpc}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {keyword.difficulty}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                  {keyword.opportunity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(keyword.traffic_potential)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 text-center">
        Showing {filteredAndSortedKeywords.length} of {keywords.length} keywords
      </div>
    </div>
  );
};
