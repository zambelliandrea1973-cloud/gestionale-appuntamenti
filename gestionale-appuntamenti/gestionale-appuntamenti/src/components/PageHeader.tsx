import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}