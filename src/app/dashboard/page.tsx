'use client';

export default function Dashboard() {
  // This would be populated with real data from your API
  const dashboardData = {
    nextDeadline: '31 July 2024',
    pendingDocuments: 2,
    lastReturn: 'AY 2023-24',
    consultationRequests: 1
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next Tax Deadline</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.nextDeadline}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              📅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.pendingDocuments}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              📋
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Return Filed</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.lastReturn}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Consultation Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.consultationRequests}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              💬
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500">
            <span className="mr-2">📤</span>
            Upload Documents
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500">
            <span className="mr-2">📝</span>
            Start New Return
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500">
            <span className="mr-2">📞</span>
            Schedule Consultation
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center p-4 border rounded-lg">
            <div className="p-2 bg-blue-50 rounded-full mr-4">📑</div>
            <div>
              <p className="font-medium">Tax Return AY 2023-24 Filed</p>
              <p className="text-sm text-gray-600">2 months ago</p>
            </div>
          </div>
          <div className="flex items-center p-4 border rounded-lg">
            <div className="p-2 bg-green-50 rounded-full mr-4">📥</div>
            <div>
              <p className="font-medium">Form 16 Uploaded</p>
              <p className="text-sm text-gray-600">3 months ago</p>
            </div>
          </div>
          <div className="flex items-center p-4 border rounded-lg">
            <div className="p-2 bg-purple-50 rounded-full mr-4">💬</div>
            <div>
              <p className="font-medium">Consultation Completed</p>
              <p className="text-sm text-gray-600">3 months ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}