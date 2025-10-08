'use client';

import { useState, useEffect } from 'react';

interface Budget {
  dailySpentCents: number;
  dailyBudgetCents: number;
  monthlySpentCents: number;
  monthlyBudgetCents: number;
}

export default function Settings() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Primary tenant

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/${tenantId}/budget`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => setBudget(data))
      .catch(() => {});
  }, []);

  const handlePause = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/${tenantId}/pause`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsPaused(true);
      alert('Tenant paused');
    } catch {
      alert('Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/${tenantId}/resume`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsPaused(false);
      alert('Tenant resumed');
    } catch {
      alert('Failed to resume');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="card mb-6">
        <h3 className="font-medium mb-4">Budget & Spend</h3>

        {budget && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Daily Budget</p>
              <p className="text-lg font-semibold">
                ${(budget.dailySpentCents / 100).toFixed(2)} / $
                {(budget.dailyBudgetCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Budget</p>
              <p className="text-lg font-semibold">
                ${(budget.monthlySpentCents / 100).toFixed(2)} / $
                {(budget.monthlyBudgetCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-medium mb-4">Kill Switch</h3>
        <p className="text-sm text-gray-600 mb-4">
          Pause all sending immediately. Existing queued messages will not be sent.
        </p>

        <div className="flex gap-4">
          <button onClick={handlePause} disabled={isPaused} className="btn btn-danger">
            Pause Sending
          </button>
          <button onClick={handleResume} disabled={!isPaused} className="btn btn-primary">
            Resume Sending
          </button>
        </div>
      </div>
    </div>
  );
}
