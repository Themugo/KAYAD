export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#D7E7E4]">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-[#EEF7F5] animate-pulse" />

      {/* Content skeleton */}
      <div className="p-5 space-y-3">
        {/* Label */}
        <div className="h-3 w-16 bg-[#EEF7F5] rounded animate-pulse" />

        {/* Title */}
        <div className="h-6 w-3/4 bg-[#EEF7F5] rounded animate-pulse" />

        {/* Specs */}
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#EEF7F5] rounded animate-pulse" />
          <div className="h-6 w-16 bg-[#EEF7F5] rounded animate-pulse" />
          <div className="h-6 w-16 bg-[#EEF7F5] rounded animate-pulse" />
        </div>

        {/* Location */}
        <div className="h-4 w-24 bg-[#EEF7F5] rounded animate-pulse" />

        {/* Divider */}
        <div className="h-px bg-[#EEF7F5]" />

        {/* Price */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="h-2 w-10 bg-[#EEF7F5] rounded animate-pulse" />
            <div className="h-7 w-28 bg-[#EEF7F5] rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-[#EEF7F5] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
