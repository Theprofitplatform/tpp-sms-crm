import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-16 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table Skeleton */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-9 w-full mt-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
