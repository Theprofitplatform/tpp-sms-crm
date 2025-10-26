import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable, onClick }) => {
  return (
    <motion.div
      className={clsx(
        'bg-white rounded-lg shadow-md p-6',
        hoverable && 'hover:shadow-lg transition-shadow cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={hoverable ? { y: -4 } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'primary' }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className={clsx('text-3xl font-bold', `text-${color}-600`)}>{value}</h3>
          {trend && (
            <p className={clsx('text-sm mt-2', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && <div className={clsx('text-4xl', `text-${color}-500`)}>{icon}</div>}
      </div>
    </Card>
  );
};
