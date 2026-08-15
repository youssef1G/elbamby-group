import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { X, Upload, ChevronLeft, ChevronRight, Save, Search, ChevronDown, Check, Infinity as InfinityIcon, ChevronUp, Plus, Loader2, Star } from "lucide-react";
import {
  fetchAdminCategories, createProduct, updateProduct, fetchAdminProduct, deleteProduct,
  createVariant, updateVariant, deleteVariant, reorderVariants,
} from "@/api.js";
import { uploadImages } from "@/lib/cloudinary.js";
import Button from "@/components/ui/Button.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import ConfirmDialog from "@/components/admin/ConfirmDialog.jsx";
import { useToast } from "@/components/ui/Toast.jsx";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/constants.js";

const productSchema = z.object({
  name_en: z.string().min(1, "Required"),
  name_ar: z.string().min(1, "Required"),
  category_id: z.string().min(1, "Required"),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  price: z.coerce.number().positive("Must be > 0"),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0),
});

const inputCls = (error) =>
  `w-full rounded-xl border px-4 py-3 text-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none transition-colors ${
    error ? "border-bg-error focus:ring-2 focus:ring-bg-error/20" : "border-bg-border focus:ring-2 focus:ring-bg-primary-500"
  }`;

export default function ProductForm() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEdit = !!id;

  const [catData, setCatData] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [unlimitedStock, setUnlimitedStock] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [origSlug, setOrigSlug] = useState("");
  const origNameEn = useRef("");

  // ── Product variants (docs/14-product-variants.md §5) ────────────────
  const [variants, setVariants] = useState([]);
  const [variantsDirty, setVariantsDirty] = useState(false);
  const [variantsSaving, setVariantsSaving] = useState(false);
  const variantFileInputRef = useRef(null);
  const variantFileRowRef = useRef(null);
  const originalVariantIds = useRef(new Set());
  const [deleteVariantOpen, setDeleteVariantOpen] = useState(false);
  const deleteVariantIdxRef = useRef(null);

  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [catHighlight, setCatHighlight] = useState(0);
  const catRef = useRef(null);

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { stock_quantity: 0, low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD },
  });

  const switchKnobCls = (on) =>
    `absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200 ${
      on ? "start-[3px]" : "end-[3px]"
    }`;

  const watchCategory = watch("category_id");

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty && !variantsDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, variantsDirty]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetchAdminProduct(id);
        const p = res.data || res;
        setUnlimitedStock(!!p.unlimitedStock);
        setOrigSlug(p.slug || "");
        origNameEn.current = p.nameEn || "";
        reset({
          name_en: p.nameEn || "", name_ar: p.nameAr || "",
          category_id: p.categoryId ? String(p.categoryId) : "",
          description_en: p.descriptionEn || "", description_ar: p.descriptionAr || "",
          price: p.price || 0, stock_quantity: p.stockQuantity ?? 0,
          low_stock_threshold: p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        });
        setImages((p.productImages || []).map((img) => ({ url: img.imageUrl })));
        const vlist = Array.isArray(p.productVariants) ? p.productVariants : [];
        originalVariantIds.current = new Set(vlist.map((v) => v.id).filter(Boolean));
        setVariants(
          vlist.map((v) => ({
            id: v.id,
            labelEn: v.labelEn || "",
            labelAr: v.labelAr || "",
            images: [
              v.imageUrl,
              ...(Array.isArray(v.productVariantImages) ? v.productVariantImages.map((img) => img.imageUrl) : []),
            ].filter(Boolean),
            isDefault: Boolean(v.isDefault),
          }))
        );
        setVariantsDirty(false);
      } catch {
        toast(t("common:common.error"), "error");
        navigate("/admin/products");
      } finally { setFetchLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    function handleClick(e) { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const categories = catData?.data || [];
  const catOptions = useMemo(() => categories.map((c) => ({ id: c.id, label: (isAr ? c.nameAr : c.nameEn) || c.nameEn || c.nameAr })), [categories, isAr]);
  const filteredCats = useMemo(() => {
    if (!catQuery) return catOptions;
    const q = catQuery.toLowerCase();
    return catOptions.filter((c) => c.label.toLowerCase().includes(q));
  }, [catOptions, catQuery]);
  const selectedCatLabel = useMemo(() => {
    if (!watchCategory) return "";
    const found = catOptions.find((c) => c.id === watchCategory);
    return found ? found.label : "";
  }, [catOptions, watchCategory]);

  const selectCategory = (c) => { setValue("category_id", c.id, { shouldValidate: true }); setCatQuery(""); setCatOpen(false); setCatHighlight(0); };
  const handleCatKeyDown = (e) => {
    if (!catOpen) return;
    const list = filteredCats;
    if (e.key === "ArrowDown") { e.preventDefault(); setCatHighlight((h) => Math.min(h + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCatHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const item = list[catHighlight]; if (item) selectCategory(item); }
    else if (e.key === "Escape") { setCatOpen(false); }
  };

  const generateSlug = (name) => {
    const slug = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug || `product-${Date.now()}`;
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError("");
    setUploadProgress(0);
    setUploading(true);
    try {
      const urls = await uploadImages(fileList, setUploadProgress);
      setImages((prev) => [...prev, ...urls.map((url) => ({ url, sort_order: prev.length }))]);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || t("admin.form.atLeastOneImage"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const removeImage = (index) => { setImages((prev) => prev.filter((_, i) => i !== index)); };
  const moveImage = (from, to) => { setImages((prev) => { const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); };

  const fieldError = (name, key) => (errors[name] ? t(key) : undefined);
  const handleCancel = () => {
    if (isDirty && !window.confirm(t("admin.form.leaveConfirm"))) return;
    navigate("/admin/products");
  };

  const handleDelete = async () => {
    try { setDeleting(true); await deleteProduct(id); toast(t("admin:products.deleted"), "success"); navigate("/admin/products"); }
    catch (err) { toast(err.message || t("common:common.error"), "error"); }
    finally { setDeleting(false); setDeleteConfirmOpen(false); }
  };

  const generateValue = (label) =>
    (label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const preventSubmit = (e) => { if (e.key === "Enter") e.preventDefault(); };

  const patchVariant = (idx, patch) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
    setVariantsDirty(true);
  };

  const moveVariant = (from, to) => {
    setVariants((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    setVariantsDirty(true);
  };

  const addVariant = () => {
    const v = {
      id: null,
      labelEn: "",
      labelAr: "",
      images: [],
      isDefault: false,
    };
    setVariants((prev) => [...prev, v]);
    setVariantsDirty(true);
  };

  const removeVariant = (idx) => {
    const v = variants[idx];
    if (v?.id && originalVariantIds.current.has(v.id)) {
      deleteVariantIdxRef.current = idx;
      setDeleteVariantOpen(true);
    } else {
      setVariants((prev) => prev.filter((_, i) => i !== idx));
      setVariantsDirty(true);
    }
  };

  const confirmDeleteVariant = () => {
    const idx = deleteVariantIdxRef.current;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    setVariantsDirty(true);
    setDeleteVariantOpen(false);
    deleteVariantIdxRef.current = null;
  };

  const pickVariantImage = (idx) => {
    variantFileRowRef.current = idx;
    variantFileInputRef.current?.click();
  };

  // One variant is the "main color" — its photo becomes the product cover.
  const setMainColor = (idx) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === idx })));
    setVariantsDirty(true);
  };

  const onVariantFileChange = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const row = variantFileRowRef.current;
    setUploading(true);
    try {
      const urls = await uploadImages(files, (p) => setUploadProgress(p));
      setVariants((prev) =>
        prev.map((v, i) => (i === row ? { ...v, images: [...v.images, ...urls] } : v))
      );
      setVariantsDirty(true);
    } catch (err) {
      setUploadError(err.message || t("common:common.error"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (variantFileInputRef.current) variantFileInputRef.current.value = "";
    }
  };

  const removeVariantPhoto = (idx, photoIdx) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, images: v.images.filter((_, p) => p !== photoIdx) } : v
      )
    );
    setVariantsDirty(true);
  };

  const saveVariants = async (productId) => {
    if (!productId || variants.length === 0) return { ok: true };
    setVariantsSaving(true);
    try {
      const list = variants.map((v) => ({ ...v }));
      const missing = list.find((v) => !v.labelEn?.trim() || v.images.length === 0);
      if (missing) throw new Error(t("admin.form.variantRequiredFields"));

      // deletions (existing variants removed from the list)
      const currentIds = new Set(list.map((v) => v.id).filter(Boolean));
      for (const id of originalVariantIds.current) {
        if (!currentIds.has(id)) await deleteVariant(id);
      }

      // create / update in current order
      const resolved = [];
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const payload = {
          variant_group: "color",
          label_en: v.labelEn || "",
          label_ar: v.labelAr || "",
          images: v.images.map((url, pi) => ({ image_url: url, sort_order: pi })),
          is_default: v.isDefault || i === 0,
          is_active: true,
        };
        let saved;
        if (v.id) {
          saved = await updateVariant(v.id, payload);
        } else {
          const base = generateValue(v.labelEn) || "color";
          payload.value = `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
          saved = await createVariant(productId, payload);
        }
        const variantId = saved?.id || saved?.data?.id || v.id;
        if (!variantId) continue;
        resolved.push({ id: variantId, sort_order: i });
      }

      if (resolved.length > 1) await reorderVariants(productId, resolved.map((r) => r.id));
      setVariantsDirty(false);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message || t("common:common.error") };
    } finally {
      setVariantsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    const hasVariantImages = variants.some((v) => v.images.length > 0);
    if (images.length === 0 && !hasVariantImages) { toast(t("admin.form.atLeastOneImage"), "error"); return; }
    setLoading(true);
    try {
      const slug = isEdit && data.name_en.trim() === origNameEn.current && origSlug ? origSlug : generateSlug(data.name_en);
      const payload = {
        name_en: data.name_en.trim(), name_ar: data.name_ar.trim(), slug,
        category_id: data.category_id, description_en: data.description_en || null, description_ar: data.description_ar || null,
        price: Number(data.price),
        stock_quantity: unlimitedStock ? 0 : Math.max(0, Number(data.stock_quantity) || 0),
        unlimited_stock: unlimitedStock,
        low_stock_threshold: Number(data.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD),
        images: images.length ? images.map((img, i) => ({ image_url: img.url, sort_order: i })) : undefined,
      };
      let productId = isEdit ? id : null;
      if (isEdit) {
        await updateProduct(id, payload);
        toast(t("admin:products.updated"), "success");
      } else {
        const created = await createProduct(payload);
        productId = created?.id || null;
        toast(t("admin:products.created"), "success");
      }
      if (productId && variants.length > 0) {
        const result = await saveVariants(productId);
        if (!result.ok) { toast(result.message, "error"); return; }
      }
      reset(data);
      navigate("/admin/products");
    } catch (err) {
      const serverError = err?.items?.[0] || err?.details?.[0];
      if (serverError?.field) { setValue(serverError.field, data[serverError.field] || ""); toast(serverError.message || t("admin:products.slugExists"), "error"); }
      else { toast(err.message || t("common:common.error"), "error"); }
    } finally { setLoading(false); }
  };

  if (fetchLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-bold text-bg-text-primary">{isEdit ? t("admin:products.edit") : t("admin.form.add")}</h2>
          {isDirty && <span className="text-[10px] font-semibold text-bg-warning border border-bg-warning/25 bg-bg-warning/10 rounded-full px-2.5 py-0.5">{t("admin.form.unsaved")}</span>}
        </div>
        {isEdit && origSlug && (
          <Link to={`/product/${origSlug}`} target="_blank" className="text-xs font-medium text-bg-primary-500 hover:underline">{t("admin.form.viewStorefront")}</Link>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit, () => toast(t("admin.form.validationFailed"), "error"))} noValidate className="space-y-6">
        <Section title={t("admin.form.basicInfo")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin:products.nameEn")} error={fieldError("name_en", "admin.form.required")}>
              <input type="text" {...register("name_en")} placeholder={t("admin.form.namePlaceholder")} className={inputCls(errors.name_en)} />
            </Field>
            <Field label={t("admin:products.nameAr")} error={fieldError("name_ar", "admin.form.required")}>
              <input type="text" {...register("name_ar")} dir="rtl" placeholder={t("admin.form.nameArPlaceholder")} className={inputCls(errors.name_ar)} />
            </Field>
          </div>
          <Field label={t("admin:products.category")} error={fieldError("category_id", "admin.form.required")}>
            <div ref={catRef} className="relative">
              <div className={`flex items-center rounded-xl border bg-bg-surface focus-within:ring-2 focus-within:ring-bg-primary-500 transition-colors ${errors.category_id ? "border-bg-error ring-2 ring-bg-error/20" : catOpen ? "border-bg-primary-500" : "border-bg-border"}`}>
                <Search size={15} className="ms-3.5 text-bg-text-secondary shrink-0" />
                <input type="text" value={catOpen ? catQuery : selectedCatLabel}
                  onChange={(e) => { setCatQuery(e.target.value); if (e.target.value === "") setValue("category_id", ""); setCatOpen(true); }}
                  onFocus={() => { setCatQuery(selectedCatLabel); setCatOpen(true); }}
                  onKeyDown={handleCatKeyDown}
                  className="w-full text-sm py-3 px-2.5 bg-transparent text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:ring-0"
                  placeholder={t("admin.form.categoryPlaceholder")} autoComplete="off" />
                {watchCategory && (
                  <button type="button" onClick={() => { setValue("category_id", ""); setCatQuery(""); }}
                    className="me-1 p-1.5 rounded-full text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken transition shrink-0" aria-label={t("common:common.clear")}>
                    <X size={14} />
                  </button>
                )}
                <ChevronDown size={16} onClick={() => setCatOpen((o) => !o)}
                  className={`me-3.5 text-bg-text-secondary shrink-0 cursor-pointer transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
              </div>
              {catOpen && (
                <ul className="absolute z-50 mt-1.5 w-full bg-bg-surface border border-bg-border rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
                  {filteredCats.map((c, i) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => selectCategory(c)} onMouseEnter={() => setCatHighlight(i)}
                        className={`w-full flex items-center justify-between gap-2 text-start px-4 py-2.5 text-sm transition-colors ${i === catHighlight ? "bg-bg-surface-sunken" : ""} ${c.id === watchCategory ? "text-bg-primary-500 font-medium" : "text-bg-text-primary"}`}>
                        <span className="truncate">{c.label}</span>
                        {c.id === watchCategory && <Check size={14} className="shrink-0" />}
                      </button>
                    </li>
                  ))}
                  {filteredCats.length === 0 && <li className="px-4 py-3 text-xs text-bg-text-secondary text-center">{t("admin.form.noCategories")}</li>}
                </ul>
              )}
            </div>
          </Field>
        </Section>

        <Section title={t("admin.form.pricing")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={`${t("admin:products.price")} (EGP)`} error={fieldError("price", "admin.form.validPrice")}>
              <div className={`flex items-center rounded-xl border overflow-hidden bg-bg-surface transition-colors ${errors.price ? "border-bg-error ring-2 ring-bg-error/20" : "border-bg-border"}`}>
                <span className="ps-3.5 pe-2.5 text-sm text-bg-text-secondary font-semibold shrink-0 border-e border-bg-border py-3">EGP</span>
                <input type="number" step="0.01" min="0" {...register("price")}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") { e.preventDefault(); setValue("price", (Number(watch("price")) || 0) + 1); }
                    if (e.key === "ArrowDown") { e.preventDefault(); setValue("price", Math.max(0, (Number(watch("price")) || 0) - 1)); }
                  }}
                  className="w-full text-sm py-3 px-3 bg-transparent text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none [appearance:textfield]" placeholder={t("admin.form.pricePlaceholder")} />
              </div>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-bg-text-primary">{t("admin:products.stockQuantity")}</label>
                <label className="flex items-center gap-2 text-xs text-bg-text-secondary cursor-pointer select-none">
                  <InfinityIcon size={13} className={unlimitedStock ? "text-bg-primary-500" : ""} />
                  {t("admin.form.unlimited")}
                  <button type="button" role="switch" aria-checked={unlimitedStock}
                    onClick={() => { const next = !unlimitedStock; setUnlimitedStock(next); if (next) setValue("stock_quantity", 0); }}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${unlimitedStock ? "bg-bg-primary-500" : "bg-bg-neutral-300"}`}>
                    <span className={switchKnobCls(unlimitedStock)} />
                  </button>
                </label>
              </div>
              <div className={`flex items-center rounded-xl border overflow-hidden bg-bg-surface transition-colors ${unlimitedStock ? "opacity-40 border-bg-border" : errors.stock_quantity ? "border-bg-error" : "border-bg-border"}`}>
                <button type="button" onClick={() => { if (!unlimitedStock) { const v = Number(watch("stock_quantity")) || 0; setValue("stock_quantity", Math.max(0, v - 1)); } }}
                  disabled={unlimitedStock} className="w-9 h-[44px] flex items-center justify-center text-sm text-bg-text-secondary hover:text-bg-primary-500 hover:bg-bg-surface-sunken transition shrink-0 disabled:cursor-not-allowed">−</button>
                <input type="number" min="0" {...register("stock_quantity")} disabled={unlimitedStock}
                  className="w-full text-sm py-3 text-center bg-transparent text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none [appearance:textfield]"
                  placeholder={unlimitedStock ? t("admin.form.unlimited") : "0"} />
                <button type="button" onClick={() => { if (!unlimitedStock) { const v = Number(watch("stock_quantity")) || 0; setValue("stock_quantity", v + 1); } }}
                  disabled={unlimitedStock} className="w-9 h-[44px] flex items-center justify-center text-sm text-bg-text-secondary hover:text-bg-primary-500 hover:bg-bg-surface-sunken transition shrink-0 disabled:cursor-not-allowed">+</button>
              </div>
              {errors.stock_quantity && <p className="mt-1.5 text-caption text-bg-error">{t("admin.form.validStock")}</p>}
              {!unlimitedStock && !errors.stock_quantity && Number(watch("stock_quantity")) === 0 && <p className="mt-1.5 text-[11px] text-bg-warning">{t("admin:common.outOfStock")}</p>}
            </div>
          </div>
        </Section>

        <Section title={t("admin:products.lowStockThreshold")}>
          <Field helper={t("admin.form.thresholdHint", { n: DEFAULT_LOW_STOCK_THRESHOLD })}>
            <input type="number" min="0" {...register("low_stock_threshold")} className={inputCls()} />
          </Field>
        </Section>

        <Section title={t("admin:products.images")}>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-bg-border aspect-square">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {idx === 0 && <span className="absolute top-1 start-1 bg-bg-primary-500 text-white text-caption font-semibold px-1.5 py-0.5 rounded-[4px]">{t("admin.form.primaryImage")}</span>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx > 0 && <button type="button" onClick={() => moveImage(idx, idx - 1)} aria-label={t("admin.form.moveEarlier")} className="w-8 h-8 rounded-full bg-white text-bg-neutral-900 flex items-center justify-center hover:bg-bg-primary-500 hover:text-white transition-colors"><ChevronLeft size={14} className="rtl:rotate-180" /></button>}
                    <button type="button" onClick={() => removeImage(idx)} aria-label={t("common:common.remove")} className="w-8 h-8 rounded-full bg-bg-error text-white flex items-center justify-center hover:bg-bg-error transition-colors"><X size={14} /></button>
                    {idx < images.length - 1 && <button type="button" onClick={() => moveImage(idx, idx + 1)} aria-label={t("admin.form.moveLater")} className="w-8 h-8 rounded-full bg-white text-bg-neutral-900 flex items-center justify-center hover:bg-bg-primary-500 hover:text-white transition-colors"><ChevronRight size={14} className="rtl:rotate-180" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div
            onClick={() => !uploading && handleUploadClick()}
            className={`border-2 border-dashed rounded-2xl px-6 py-10 text-center cursor-pointer transition-colors border-bg-border hover:border-bg-primary-500/40 bg-bg-surface ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={20} className="text-bg-primary-500 animate-spin" />
                <p className="text-sm font-semibold text-bg-text-primary">
                  {t("admin.form.uploading")}{" "}
                  <span dir="ltr" className="ltr-nums">{uploadProgress}%</span>
                </p>
                <div className="w-full max-w-xs h-1.5 rounded-full bg-bg-surface-sunken overflow-hidden">
                  <div
                    className="h-full bg-bg-primary-500 rounded-full transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-2 text-bg-text-secondary" />
                <p className="text-sm font-semibold text-bg-text-primary">{t("admin.form.uploadClick")}</p>
                <p className="text-caption text-bg-text-secondary mt-1">{t("admin.form.uploadMultiple")}</p>
              </>
            )}
          </div>

          {uploadError && <p className="text-caption text-bg-error mt-2">{uploadError}</p>}
          {variants.some((v) => v.images.length > 0) && (
            <p className="text-caption text-bg-text-secondary mt-2">{t("admin.form.mainPhotoNotRequired")}</p>
          )}
          {images.length > 0 && <p className="text-caption text-bg-text-secondary">{t("admin.form.mainPhotoHint")}</p>}
        </Section>

        <Section title={t("admin.form.details")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin:products.descriptionEn")}>
              <textarea {...register("description_en")} rows={4} className={`${inputCls()} resize-y`} />
            </Field>
            <Field label={t("admin:products.descriptionAr")}>
              <textarea {...register("description_ar")} rows={4} dir="rtl" className={`${inputCls()} resize-y`} />
            </Field>
          </div>
        </Section>

        <Section title={t("admin.form.variants")} subtitle={t("admin.form.variantsSubtitle")}>
          <div className="flex flex-col gap-4">
            {variants.map((v, idx) => (
              <div key={idx} className="rounded-2xl border border-bg-border p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-5">
                    <Field label={t("admin.form.variantLabelEn")}>
                      <input type="text" value={v.labelEn}
                        onChange={(e) => patchVariant(idx, { labelEn: e.target.value })}
                        onKeyDown={preventSubmit}
                        placeholder="e.g. Red" className={inputCls()} />
                    </Field>
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <Field label={t("admin.form.variantLabelAr")}>
                      <input type="text" value={v.labelAr} dir="rtl"
                        onChange={(e) => patchVariant(idx, { labelAr: e.target.value })}
                        onKeyDown={preventSubmit}
                        placeholder="مثال: أحمر" className={inputCls()} />
                    </Field>
                  </div>
                  <div className="col-span-12 sm:col-span-2 flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => setMainColor(idx)}
                      aria-pressed={v.isDefault}
                      title={t("admin.form.variantMain")}
                      className={`inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        v.isDefault
                          ? "bg-bg-primary-500 text-white border-bg-primary-500"
                          : "border-bg-border text-bg-text-secondary hover:border-bg-primary-500/40 hover:text-bg-primary-500"
                      }`}
                    >
                      <Star size={12} className={v.isDefault ? "fill-current" : ""} />
                      {t("admin.form.variantMain")}
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <Field label={t("admin.form.variantImages")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.images.map((url, pi) => (
                        <div key={url + pi} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-bg-border">
                          <img src={url} alt={v.labelEn || "variant"} className="w-full h-full object-cover" loading="lazy" />
                          {pi === 0 && (
                            <span className="absolute top-0.5 start-0.5 bg-bg-primary-500 text-white text-[9px] font-bold px-1 rounded">
                              {t("admin.form.coverPhoto")}
                            </span>
                          )}
                          <button type="button" onClick={() => removeVariantPhoto(idx, pi)}
                            aria-label={t("admin.form.variantRemovePhoto")}
                            className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-bg-error text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => pickVariantImage(idx)}
                        aria-label={t("admin.form.variantImage")}
                        className="flex items-center justify-center w-16 h-16 rounded-lg border border-dashed border-bg-border bg-bg-surface hover:border-bg-primary-500/40 hover:text-bg-primary-500 transition">
                        {variantFileRowRef.current === idx && uploading
                          ? <Loader2 size={16} className="animate-spin text-bg-primary-500" />
                          : <Upload size={16} className="text-bg-text-secondary" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  {variants.length > 1 && (
                    <>
                      <button type="button" onClick={() => moveVariant(idx, idx - 1)} disabled={idx === 0}
                        aria-label={t("admin.form.variantMoveUp")}
                        className="w-7 h-7 rounded border border-bg-border flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronUp size={12} />
                      </button>
                      <button type="button" onClick={() => moveVariant(idx, idx + 1)} disabled={idx === variants.length - 1}
                        aria-label={t("admin.form.variantMoveDown")}
                        className="w-7 h-7 rounded border border-bg-border flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronDown size={12} />
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => removeVariant(idx)}
                    aria-label={t("admin.form.variantDelete")}
                    className="ms-auto text-bg-text-secondary hover:text-bg-error transition w-7 h-7 rounded border border-bg-border flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={addVariant}
              className="self-start border border-dashed border-bg-border rounded-xl px-4 py-2.5 text-sm text-bg-text-primary hover:border-bg-primary-500/40 hover:text-bg-primary-500 transition-colors inline-flex items-center gap-2">
              <Plus size={14} className="text-bg-primary-500" />
              {t("admin.form.addVariant")}
            </button>

            <input type="file" accept="image/*" multiple ref={variantFileInputRef} className="hidden" onChange={onVariantFileChange} />
          </div>
        </Section>

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button type="submit" loading={loading} disabled={loading}>
              <Save size={16} />
              {loading ? t("admin.form.saving") : isEdit ? t("admin.form.saveEdit") : t("admin.form.saveAdd")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>{t("admin:common.cancel")}</Button>
          </div>
          {isEdit && (
            <button type="button" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}
              className="text-xs text-bg-text-secondary hover:text-bg-error transition-colors disabled:opacity-50">
              {deleting ? t("admin.form.deleting") : t("admin.form.deleteProduct")}
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete}
        title={t("admin.form.deleteConfirm")} confirmLabel={t("admin:common.yesDelete")} loading={deleting} />

      <ConfirmDialog isOpen={deleteVariantOpen} onClose={() => setDeleteVariantOpen(false)} onConfirm={confirmDeleteVariant}
        title={t("admin.form.variantDelete")}
        description={t("admin.form.variantDeleteConfirm")} confirmLabel={t("admin.form.variantDelete")} loading={false} />
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="surface-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-sm font-bold text-bg-text-primary">{title}</h2>
          {subtitle && <p className="text-caption text-bg-text-secondary mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, error, helper, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-bg-text-primary mb-1.5">{label}</label>
      {children}
      {error && <p className="text-caption text-bg-error mt-1">{error}</p>}
      {helper && !error && <p className="text-caption text-bg-text-secondary mt-1">{helper}</p>}
    </div>
  );
}