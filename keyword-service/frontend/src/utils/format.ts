import { format as dateFnsFormat, formatDistanceToNow } from 'date-fns';

export const formatNumber = (num: number | string | undefined): string => {
  if (num === undefined || num === null || num === '') return 'N/A';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return 'N/A';

  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  } else if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toLocaleString();
};

export const formatCurrency = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null || amount === '') return 'N/A';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return 'N/A';
  return `$${n.toFixed(2)}`;
};

export const formatPercent = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return 'N/A';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return 'N/A';
  return `${n.toFixed(1)}%`;
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return dateFnsFormat(new Date(date), 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
};

export const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return dateFnsFormat(new Date(date), 'MMM d, yyyy HH:mm');
  } catch {
    return 'N/A';
  }
};

export const formatRelativeTime = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'N/A';
  }
};

export const formatDifficulty = (difficulty: number | string | undefined): {
  label: string;
  color: string;
  value: string;
} => {
  if (difficulty === undefined || difficulty === null || difficulty === 'N/A') {
    return { label: 'Unknown', color: 'gray', value: 'N/A' };
  }

  const d = typeof difficulty === 'string' ? parseFloat(difficulty) : difficulty;

  if (d < 30) {
    return { label: 'Easy', color: 'green', value: d.toFixed(1) };
  } else if (d < 50) {
    return { label: 'Medium', color: 'yellow', value: d.toFixed(1) };
  } else if (d < 70) {
    return { label: 'Hard', color: 'orange', value: d.toFixed(1) };
  } else {
    return { label: 'Very Hard', color: 'red', value: d.toFixed(1) };
  }
};

export const getIntentColor = (intent: string): string => {
  const colors: Record<string, string> = {
    informational: 'blue',
    commercial: 'yellow',
    transactional: 'green',
    navigational: 'purple',
    local: 'orange',
  };
  return colors[intent.toLowerCase()] || 'gray';
};

export const getIntentBadgeClass = (intent: string): string => {
  const classes: Record<string, string> = {
    informational: 'bg-blue-100 text-blue-800',
    commercial: 'bg-yellow-100 text-yellow-800',
    transactional: 'bg-green-100 text-green-800',
    navigational: 'bg-purple-100 text-purple-800',
    local: 'bg-orange-100 text-orange-800',
  };
  return classes[intent.toLowerCase()] || 'bg-gray-100 text-gray-800';
};
