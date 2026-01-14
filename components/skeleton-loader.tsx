export function ClinicCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm animate-pulse">
      <div className="h-2 bg-gray-200 rounded mb-4"></div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-32"></div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gray-200 rounded-lg p-6 shadow-md animate-pulse">
      <div className="h-12 w-12 bg-gray-300 rounded-xl mb-3"></div>
      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
      <div className="h-8 bg-gray-300 rounded w-16"></div>
    </div>
  );
}
