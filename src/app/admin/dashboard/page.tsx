'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ApprovalDashboard from '@/components/admin/ApprovalDashboard';
import UserManagement from '@/components/admin/UserManagement';
import DestinationsDashboard from '@/components/admin/DestinationsDashboard';
import OffersManager from '@/components/admin/OffersManager';
import AdminActivityManager from '@/components/admin/AdminActivityManager';
import TrainingManager from '@/components/admin/TrainingManager';
import EnquiriesManager from '@/components/admin/EnquiriesManager';
import AgencyManagement from '@/components/admin/AgencyManagement';
import SettingsManager from '@/components/admin/SettingsManager';
import QuoteStatistics from '@/components/admin/QuoteStatistics';
import QuoteSearchAndFilter from '@/components/admin/QuoteSearchAndFilter';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agencyStats, setAgencyStats] = useState<{
    counts: {
      pending: number;
      approved: number;
      rejected: number;
      contracted: number;
      total: number;
    };
    recentActivity: any[];
  } | null>(null);

  useEffect(() => {
    fetchAgencyStats();
  }, []);

  const fetchAgencyStats = async () => {
    try {
      const response = await fetch('/api/admin/agencies/stats');
      if (response.ok) {
        const data = await response.json();
        setAgencyStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agency stats:', error);
    }
  };

  const tabs = [
    { id: 'approvals', name: 'User Approvals', icon: '👥' },
    { id: 'users', name: 'User Management', icon: '🔧' },
    { 
      id: 'agencies', 
      name: 'Agency Management', 
      icon: '🏢',
      badge: agencyStats?.counts.pending || 0
    },
    { id: 'destinations', name: 'Destinations', icon: '🏖️' },
    { id: 'offers', name: 'Offers', icon: '🎯' },
    { id: 'activities', name: 'Activities', icon: '🎪' },
    { id: 'training', name: 'Training Materials', icon: '📚' },
    { id: 'enquiries', name: 'Enquiries', icon: '💬' },
    { id: 'quotes', name: 'Quote Analytics', icon: '📊' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ];

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Left Sidebar */}
        <div className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <div className="w-16 h-1 bg-orange-500 mt-2"></div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false); // Close mobile menu
                }}
                className={`relative w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 text-left ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <span className="text-lg mr-3">{tab.icon}</span>
                <span className="flex-1">{tab.name}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Admin Panel v1.0
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {tabs.find(tab => tab.id === activeTab)?.name || 'Dashboard'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage and monitor your platform
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 hidden sm:block">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {/* Agency Statistics Overview - Only show on agencies tab */}
            {activeTab === 'agencies' && agencyStats && (
              <div className="p-6 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agency Registration Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{agencyStats.counts.pending}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{agencyStats.counts.approved}</div>
                    <div className="text-sm text-gray-600">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{agencyStats.counts.contracted}</div>
                    <div className="text-sm text-gray-600">Contracted</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{agencyStats.counts.rejected}</div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">{agencyStats.counts.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={() => setActiveTab('agencies')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Manage Agencies
                  </button>
                  {agencyStats.counts.pending > 0 && (
                    <button
                      onClick={() => {
                        setActiveTab('agencies');
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Review {agencyStats.counts.pending} Pending
                    </button>
                  )}
                </div>

                {/* Recent Activity */}
                {agencyStats.recentActivity.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Recent Agency Activity</h4>
                    <div className="space-y-2">
                      {agencyStats.recentActivity.slice(0, 3).map((activity: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {activity.registrationStatus === 'pending' && (
                                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                              )}
                              {activity.registrationStatus === 'approved' && (
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                              )}
                              {activity.registrationStatus === 'contracted' && (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                              {activity.registrationStatus === 'rejected' && (
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{activity.name}</span>
                              <span className="text-gray-600"> from </span>
                              <span className="font-medium text-gray-700">{activity.company}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.registrationStatus === 'pending' && 'Registered'}
                            {activity.registrationStatus === 'approved' && 'Approved'}
                            {activity.registrationStatus === 'contracted' && 'Signed Contract'}
                            {activity.registrationStatus === 'rejected' && 'Rejected'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Content */}
            <div className="p-6">
              {activeTab === 'approvals' && (
                <section>
                  <ApprovalDashboard />
                </section>
              )}

              {activeTab === 'users' && (
                <section>
                  <UserManagement />
                </section>
              )}

              {activeTab === 'agencies' && (
                <section>
                  <AgencyManagement onStatsChange={fetchAgencyStats} />
                </section>
              )}

              {activeTab === 'destinations' && (
                <section>
                  <DestinationsDashboard />
                </section>
              )}

              {activeTab === 'offers' && (
                <section>
                  <OffersManager />
                </section>
              )}

              {activeTab === 'activities' && (
                <section>
                  <AdminActivityManager />
                </section>
              )}

              {activeTab === 'training' && (
                <section>
                  <TrainingManager />
                </section>
              )}

              {activeTab === 'enquiries' && (
                <section>
                  <EnquiriesManager />
                </section>
              )}

              {activeTab === 'quotes' && (
                <section className="space-y-8">
                  <QuoteStatistics />
                  <QuoteSearchAndFilter />
                </section>
              )}

              {activeTab === 'settings' && (
                <section>
                  <SettingsManager />
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
