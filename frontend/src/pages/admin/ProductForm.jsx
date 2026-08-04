import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { X, Upload, ChevronLeft, ChevronRight, Save, Search, ChevronDown, Check, Infinity as InfinityIcon, Loader2 } from "lucide-react";
import { fetchAdminCategories, createProduct, updateProduct, fetchAdminProduct, deleteProduct } from "@/api.js";
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
  capacity_gb: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  speed_class: z.string().optional(),
  interface_type: z.string().optional(),
  form_factor: z.string().optional(),
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
  const [showSpecs, setShowSpecs] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [origSlug, setOrigSlug] = useState("");
  const origNameEn = useRef("");

  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [catHighlight, setCatHighlight] = useState(0);
  const catRef = useRef(null);

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { stock_quantity: 0, low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD },
  });

  const watchCategory = watch("category_id");

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (!isDirty) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetchAdminProduct(id);
        const p = res.data || res;
        setUnlimitedStock(!!p.unlimitedStock);
        setShowSpecs(!!(p.capacityGb || p.speedClass || p.interfaceType || p.formFactor));
        setOrigSlug(p.slug || "");
        origNameEn.current = p.nameEn || "";
        reset({
          name_en: p.nameEn || "", name_ar: p.nameAr || "",
          category_id: p.categoryId ? String(p.categoryId) : "",
          description_en: p.descriptionEn || "", description_ar: p.descriptionAr || "",
          price: p.price || 0, stock_quantity: p.stockQuantity ?? 0,
          low_stock_threshold: p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          capacity_gb: p.capacityGb || "", speed_class: p.speedClass || "",
          interface_type: p.interfaceType || "", form_factor: p.formFactor || "",
        });
        setImages((p.productImages || []).map((img) => ({ url: img.imageUrl })));
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

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

  const onSubmit = async (data) => {
    if (images.length === 0) { toast(t("admin.form.atLeastOneImage"), "error"); return; }
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
        capacity_gb: showSpecs ? (data.capacity_gb || null) : null,
        speed_class: showSpecs ? (data.speed_class || null) : null,
        interface_type: showSpecs ? (data.interface_type || null) : null,
        form_factor: showSpecs ? (data.form_factor || null) : null,
        images: images.map((img, i) => ({ image_url: img.url, sort_order: i })),
      };
      if (isEdit) { await updateProduct(id, payload); toast(t("admin:products.updated"), "success"); }
      else { await createProduct(payload); toast(t("admin:products.created"), "success"); }
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
          {isDirty && <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-0.5">{t("admin.form.unsaved")}</span>}
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
                    <span className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow transition-transform ${unlimitedStock ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
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

        <Section
          title={t("admin.form.specs")}
          subtitle={t("admin.form.specsSubtitle")}
          action={
            <label className="flex items-center gap-2 text-xs text-bg-text-secondary cursor-pointer select-none shrink-0">
              {t("admin.form.storageProduct")}
              <button type="button" role="switch" aria-checked={showSpecs}
                onClick={() => setShowSpecs((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showSpecs ? "bg-bg-primary-500" : "bg-bg-neutral-300"}`}>
                <span className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow transition-transform ${showSpecs ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
              </button>
            </label>
          }
        >
          <Field label={t("admin:products.lowStockThreshold")} helper={t("admin.form.thresholdHint", { n: DEFAULT_LOW_STOCK_THRESHOLD })}>
            <input type="number" min="0" {...register("low_stock_threshold")} className={inputCls()} />
          </Field>
          {showSpecs && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("admin.form.capacity")}>
                <input type="number" {...register("capacity_gb")} placeholder="256" className={inputCls()} />
              </Field>
              <Field label={t("admin.form.speedClass")}>
                <input type="text" {...register("speed_class")} placeholder="U3, V30, A2" className={inputCls()} />
              </Field>
              <Field label={t("admin.form.interfaceType")}>
                <input type="text" {...register("interface_type")} placeholder="USB 3.2, NVMe PCIe 4.0" className={inputCls()} />
              </Field>
              <Field label={t("admin.form.formFactor")}>
                <input type="text" {...register("form_factor")} placeholder='M.2 2280, microSD, 2.5"' className={inputCls()} />
              </Field>
            </div>
          )}
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