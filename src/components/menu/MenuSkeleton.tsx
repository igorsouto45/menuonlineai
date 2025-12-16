import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <div className="gradient-primary">
      <div className="container px-4 py-6 sm:py-8">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 sm:h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <Skeleton className="h-6 w-24 mt-3 sm:mt-4 rounded-full" />
      </div>
    </div>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="px-4 sm:container">
        <div className="flex gap-2 overflow-x-auto py-2.5 sm:py-3 -mx-1 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 sm:p-4 bg-card rounded-xl sm:rounded-2xl border border-border">
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1 space-y-2">
        <div className="space-y-2">
          <Skeleton className="h-5 sm:h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-6 w-20 mt-2" />
      </div>
      <Skeleton className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg sm:rounded-xl flex-shrink-0" />
    </div>
  );
}

export function ProductsSkeleton() {
  return (
    <div className="container px-4 py-4 sm:py-6">
      <div className="space-y-8 sm:space-y-10">
        {[1, 2].map((section) => (
          <div key={section}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <Skeleton className="h-6 sm:h-8 w-32" />
              <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <HeaderSkeleton />
      <div className="container px-4 py-3 sm:py-4 -mt-2">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <CategoriesSkeleton />
      <ProductsSkeleton />
    </div>
  );
}
