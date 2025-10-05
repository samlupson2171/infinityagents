'use client';

import React from 'react';

interface Section {
  id: string;
  name: string;
  icon: string;
}

interface DestinationSidebarProps {
  destinationName: string;
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export default function DestinationSidebar({
  destinationName,
  sections,
  activeSection,
  onSectionChange
}: DestinationSidebarProps) {
  return (
    <div className="lg:w-1/4">
      <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Explore {destinationName}
        </h3>
        <nav className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                activeSection === section.id
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-700 hover:bg-orange-50'
              }`}
            >
              <span className="mr-3">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}