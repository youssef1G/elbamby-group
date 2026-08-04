import { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { fetchAdminProducts, fetchAdminCategories, deleteProduct, updateProduct } from "@/api.js";
import Select from "@/components/ui/Select.jsx";
import Badge from "@/components/ui/Badge.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ConfirmDialog from "@/components/admin/ConfirmDialog.jsx";
import { useToast } from "@/components/ui/Toast.jsx";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/constants.js";

function SortIcon({ dir }) {
  if (dir === "asc") return <ChevronUp size={12} />;
  if (dir === "desc") return <ChevronDown size={12} />;
  return <ChevronsUpDown size={12} className="opacity-30" />;
}

export default function AdminProducts() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [catData, setCatData] = useState(null);
  const [reload, setReload] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [editingStockId, setEditingStockId] = useState(null);
  const [stockDraft, setStockDraft] = useState("");
  const [savingStockId, setSavingStockId] = useState(null);

  const params = { page, limit: 20 };
  if (search) params.search = search;
  if (categoryFilter !== "all") params.category = categoryFilter;
  if (stockFilter === "low") params.low_stock = "true";
  if (stockFilter === "out") params.out_of_stock = "true";
  if (sortKey === "price") params.sort = sortDir === "asc" ? "price_asc" : "price_desc";

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAdminProducts(params)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, categoryFilter, stockFilter, sortKey, sortDir, reload]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const products = data?.data || [];
  const meta = data?.meta || {};
  const categories = catData?.data || [];

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const hasFilters = Boolean(search || categoryFilter !== "all" || stockFilter !== "all");
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); setPage(1); };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const productName = (row) => (isAr ? row.nameAr : row.nameEn) || row.nameEn || row.nameAr || "—";

  const categoryName = (row) => {
    const cat = catMap.get(row.categoryId);
    if (!cat) return "—";
    return (isAr ? cat.nameAr : cat.nameEn) || cat.nameEn || cat.nameAr;
  };

  const sorted = useMemo(() => {
    if (!sortKey || sortKey === "price") return products;
    const rows = [...products];
    const collator = new Intl.Collator(isAr ? "ar" : "en");
    if (sortKey === "name") rows.sort((a, b) => collator.compare(productName(a), productName(b)));
    else if (sortKey === "category") rows.sort((a, b) => collator.compare(categoryName(a), categoryName(b)));
    else if (sortKey === "stock_quantity") rows.sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0));
    return sortDir === "desc" ? rows.reverse() : rows;
  }, [products, sortKey, sortDir, isAr, catMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteProduct(deleteTarget.id);
      toast(t("admin:products.deleted"), "success");
      setDeleteTarget(null);
      setReload((r) => r + 1);
    } catch (err) {
      toast(err.message || t("common:common.error"), "error");
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const stepStock = (delta) => setStockDraft((prev) => String(Math.max(0, (prev === "" ? 0 : Number(prev)) + delta)));
  const startEditStock = (row) => {
    setEditingStockId(row.id);
    setStockDraft(row.unlimitedStock ? "" : String(row.stockQuantity ?? 0));
  };

  const saveStock = async (row) => {
    const trimmed = stockDraft.trim();
    if (trimmed === "") {
      if (row.unlimitedStock) { setEditingStockId(null); return; }
      setSavingStockId(row.id);
      try {
        await updateProduct(row.id, { stock_quantity: 0, unlimited_stock: true });
        toast(t("admin:products.saved"), "success");
        setEditingStockId(null);
        setReload((r) => r + 1);
      } catch (err) { toast(err.message || t("common:common.error"), "error"); }
      finally { setSavingStockId(null); }
      return;
    }
    const value = Math.max(0, Math.floor(Number(trimmed)));
    if (!row.unlimitedStock && value === row.stockQuantity) { setEditingStockId(null); return; }
    setSavingStockId(row.id);
    try {
      await updateProduct(row.id, { stock_quantity: value, unlimited_stock: false });
      toast(t("admin:products.saved"), "success");
      setEditingStockId(null);
      setReload((r) => r + 1);
    } catch (err) { toast(err.message || t("common:common.error"), "error"); }
    finally { setSavingStockId(null); }
  };

  const stockBadge = (row) => {
    if (row.unlimitedStock) return <span className="text-caption text-bg-text-secondary">{t("admin:products.unlimited")}</span>;
    const qty = row.stockQuantity ?? 0;
    const threshold = row.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    if (qty === 0) return <Badge variant="out-of-stock">{t("admin:common.outOfStock")}</Badge>;
    if (qty <= threshold) return <Badge variant="low-stock">{t("admin:products.leftStock", { count: qty })}</Badge>;
    return <span className="text-caption text-bg-text-secondary ltr-nums">{t("admin:products.inStock", { count: qty })}</span>;
  };

  const stockCell = (row) => {
    if (editingStockId === row.id) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-bg-border overflow-hidden bg-bg-surface">
            <button type="button" onClick={() => stepStock(-1)} className="w-7 h-7 flex items-center justify-center text-bg-text-primary hover:bg-bg-surface-sunken transition shrink-0">−</button>
            <input type="number" min="0" value={stockDraft} onChange={(e) => setStockDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveStock(row); if (e.key === "Escape") setEditingStockId(null); }}
              className="w-12 text-center text-body-sm py-1 bg-transparent text-bg-text-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" autoFocus />
            <button type="button" onClick={() => stepStock(1)} className="w-7 h-7 flex items-center justify-center text-bg-text-primary hover:bg-bg-surface-sunken transition shrink-0">+</button>
          </div>
          <button onClick={() => saveStock(row)} disabled={savingStockId === row.id}
            className="text-caption text-white bg-bg-primary-500 hover:bg-bg-primary-600 rounded-md px-2 py-1.5 transition disabled:opacity-50">
            {savingStockId === row.id ? "..." : "✓"}
          </button>
          <button onClick={() => setEditingStockId(null)} className="text-body-sm text-bg-text-secondary hover:text-bg-text-primary">✕</button>
        </div>
      );
    }
    return (
      <button onClick={() => startEditStock(row)} className="flex items-center gap-1.5 group">
        {stockBadge(row)}
        <span className="text-caption text-bg-text-secondary/30 group-hover:text-bg-primary-500 transition">✎</span>
      </button>
    );
  };

  const columns = [
    { key: "product", label: t("admin:products.nameEn"), sortKey: "name",
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-surface-sunken shrink-0">
            {row.productImages?.[0]?.imageUrl ? <img src={row.productImages[0].imageUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-bg-text-primary truncate block">{productName(row)}</span>
            <span className="flex items-center gap-1.5 mt-0.5">
              {row.isFeatured && <span className="text-caption font-semibold text-bg-primary-500">{t("admin:products.isFeatured")}</span>}
              {row.isNewArrival && <span className="text-caption font-semibold text-bg-primary-500">{t("admin:products.isNewArrival")}</span>}
            </span>
          </div>
        </div>
      ),
    },
    { key: "category", label: t("admin:products.category"), sortKey: "category",
      render: (row) => <span className="text-bg-text-secondary">{categoryName(row)}</span>,
    },
    { key: "price", label: t("admin:products.price"), sortKey: "price",
      render: (row) => <span className="font-semibold text-bg-text-primary ltr-nums" dir="ltr">{Number(row.price || 0).toLocaleString("en-EG")} EGP</span>,
    },
    { key: "stock", label: t("admin:products.stockQuantity"), sortKey: "stock_quantity",
      render: stockCell,
    },
    { key: "actions", label: t("admin:common.actions"),
      render: (row) => (
        <div className="flex items-center justify-end gap-4">
          <button onClick={() => navigate(`/admin/products/${row.id}/edit`)} className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 hover:underline transition-colors">
            {t("admin:common.edit")}
          </button>
          <button onClick={() => setDeleteTarget(row)} className="text-body-sm font-medium text-bg-text-secondary hover:text-bg-error transition-colors">
            {t("admin:common.delete")}
          </button>
        </div>
      ),
    },
  ];

  const tableHead = (
    <thead className="bg-bg-surface-sunken/50">
      <tr>
        {columns.map((col) => {
          const sortable = col.sortKey && !isLoading;
          const active = sortable && sortKey === col.sortKey;
          return (
            <th key={col.key}
              className={`px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary whitespace-nowrap text-start ${sortable ? "cursor-pointer select-none hover:text-bg-text-primary" : ""} transition-colors ${col.key === "actions" ? "text-end" : ""}`}
              onClick={sortable ? () => toggleSort(col.sortKey) : undefined}>
              <span className="inline-flex items-center gap-1">{col.label}{sortable && <SortIcon dir={active ? sortDir : ""} />}</span>
            </th>
          );
        })}
      </tr>
    </thead>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
        <h1 className="font-heading text-xl font-bold text-bg-text-primary">{t("admin:products.title")}</h1>
        <p className="text-xs text-bg-text-secondary mt-1">{t("admin:products.subtitle")}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("admin:products.searchPlaceholder")}
            className="w-full text-body-sm surface-card h-9 ps-9 pe-3 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500 focus:ring-1 focus:ring-bg-primary-500" />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1); }}
            options={[
              { value: "all", label: t("admin:products.allCategories") },
              ...categories.map((c) => ({ value: c.id, label: (isAr ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr })),
            ]} />
        </div>
        <div className="w-full sm:w-[150px]">
          <Select value={stockFilter} onChange={(v) => { setStockFilter(v); setPage(1); }}
            options={[
              { value: "all", label: t("admin:products.allStock") },
              { value: "low", label: t("admin:common.lowStock") },
              { value: "out", label: t("admin:common.outOfStock") },
            ]} />
        </div>
        {hasFilters && <button onClick={clearFilters} className="text-body-sm text-bg-primary-500 hover:text-bg-primary-600 font-medium">{t("admin:common.clear")}</button>}
        <div className="hidden sm:block flex-1" />
        <p className="text-caption text-bg-text-secondary sm:self-center">{t("admin:products.count", { count: products.length, total: meta.total || products.length })}</p>
        <button onClick={() => navigate("/admin/products/new")} className="btn-primary text-caption"><Plus size={14} />{t("admin:products.create")}</button>
      </motion.div>

      {isLoading ? (
        <div className="rounded-lg border border-bg-border overflow-hidden bg-bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">{tableHead}
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-bg-border">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><Skeleton className="h-4 w-32" /></div></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-12" /></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-4"><Skeleton className="h-3 w-14" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            message={hasFilters ? t("admin:products.noFilter") : t("admin:products.noProducts")}
            action={hasFilters ? undefined : { label: t("admin:products.create"), onClick: () => navigate("/admin/products/new") }}
          />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="rounded-lg border border-bg-border overflow-hidden bg-bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">{tableHead}
              <tbody>
                {sorted.map((row, idx) => (
                  <motion.tr key={row.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: idx * 0.04 }} className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-body-sm whitespace-nowrap">{col.render(row)}</td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">{t("admin:common.prev")}</button>
          <span className="text-body-sm text-bg-text-secondary">{t("admin:common.page")} {meta.page} {t("admin:common.of")} {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">{t("admin:common.next")}</button>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title={t("admin:products.deleteConfirm")} confirmLabel={t("admin:common.yesDelete")} loading={deleting} />
    </motion.div>
  );
}