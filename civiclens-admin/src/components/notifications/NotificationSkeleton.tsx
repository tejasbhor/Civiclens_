/**
 * Loading skeleton for notifications
 * Admin dashboard version
 */
import { Skeleton } from '@/components/ui/Skeleton';

export const NotificationSkeleton = () => {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex gap-4">
        <Skeleton className="w-5 h-5 rounded-full mt-1 flex-shrink-0" aria-label="Loading notification icon" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between mt-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="divide-y divide-gray-200">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
};


