'use client';

import React from 'react';
import Link from 'next/link';

interface DestinationHeroProps {
  name: string;
  description: string;
  region: string;
  country: string;
  quickInfo: string[];
  gradientColors: string;
}

export default function DestinationHero({
  name,
  description,
  region,
  country,
  quickInfo,
  gradientColors
}: DestinationHeroProps) {
  return (
    <div className={`relative h-96 ${gradientColors}`}>
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="text-white">
          <nav className="mb-4">
            <Link href="/destinations" className="text-blue-200 hover:text-white">
              Destinations
            </Link>
            <span className="mx-2">/</span>
            <span>{name}</span>
          </nav>
          <h1 className="text-5xl font-bold mb-4">{name}</h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              📍 {region}, {country}
            </div>
            {quickInfo.map((info, index) => (
              <div key={index} className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                {info}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}