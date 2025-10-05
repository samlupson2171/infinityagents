'use client';

import React, { ReactNode } from 'react';

interface DestinationSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function DestinationSection({
  title,
  children,
  className = ''
}: DestinationSectionProps) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="prose max-w-none">
        {children}
      </div>
    </div>
  );
}