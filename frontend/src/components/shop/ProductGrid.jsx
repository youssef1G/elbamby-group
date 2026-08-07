import { motion } from 'motion/react';
import ProductCard from '@/components/shop/ProductCard.jsx';
import { SkeletonGrid } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { useLocale } from '@/context/LocaleContext.jsx';

export default function ProductGrid({ products, isLoading, isError, error, onRetry, emptyMessage }) {
  const { t } = useLocale();

  if (isLoading) return <SkeletonGrid count={4} cols={4} />;

  if (isError) {
    return (
      <EmptyState
        message={error?.message || t('shop:loadFailed')}
        action={{ label: t('common:common.retry'), onClick: onRetry }}
      />
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product, i) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </div>
  );
}