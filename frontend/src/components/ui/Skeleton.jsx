/**
 * @param {{ className?: string, shape?: 'rect'|'circle', width?: string, height?: string }} props
 */
export default function Skeleton({ className = '', shape = 'rect', width, height }) {
  return (
    <div
      className={[
        'animate-pulse bg-bg-neutral-200',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        className,
      ].join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

const colClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export function SkeletonGrid({ count = 4, cols = 4 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${colClasses[cols] || 'lg:grid-cols-4'} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}