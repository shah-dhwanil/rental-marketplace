import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Trash2, CreditCard, Loader2, AlertCircle, X, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import {
  listPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
  type PaymentType,
} from "@/services/payment-method.service";

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: PaymentType; label: string; desc: string }[] = [
  { value: "card",        label: "Debit / Credit Card", desc: "Visa, Mastercard, RuPay" },
  { value: "upi",         label: "UPI",                 desc: "GPay, PhonePe, Paytm UPI" },
  { value: "net_banking", label: "Net Banking",         desc: "Bank account" },
  { value: "wallet",      label: "Wallet",              desc: "Paytm, Amazon Pay" },
];

function TypeBadge({ type }: { type: PaymentType }) {
  const labels: Record<PaymentType, string> = {
    card: "Card", upi: "UPI", net_banking: "Net Banking", wallet: "Wallet",
  };
  const colors: Record<PaymentType, string> = {
    card: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    upi: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    net_banking: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    wallet: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-0.5">{msg}</p>;
}

// ── Empty form states ─────────────────────────────────────────────────────────

type FormState =
  | { type: "card"; last4: string; holder_name: string; expiry_month: string; expiry_year: string; network: string }
  | { type: "upi"; upi_id: string }
  | { type: "net_banking"; bank_name: string; account_last4: string }
  | { type: "wallet"; wallet_name: string; linked_mobile: string };

function emptyForm(type: PaymentType): FormState {
  if (type === "card") return { type, last4: "", holder_name: "", expiry_month: "", expiry_year: "", network: "" };
  if (type === "upi") return { type, upi_id: "" };
  if (type === "net_banking") return { type, bank_name: "", account_last4: "" };
  return { type, wallet_name: "", linked_mobile: "" };
}

// ── Main component ────────────────────────────────────────────────────────────

export function PaymentMethodsPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<PaymentType | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== "customer") {
      navigate("/profile");
      return;
    }
    loadMethods();
  }, [accessToken]);

  function loadMethods() {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    listPaymentMethods(accessToken)
      .then(setMethods)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load payment methods."))
      .finally(() => setLoading(false));
  }

  function handleSelectType(type: PaymentType) {
    setSelectedType(type);
    setForm(emptyForm(type));
    setErrors({});
    setSubmitError(null);
  }

  function setField(key: string, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } as FormState : prev);
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate(): boolean {
    if (!form) return false;
    const errs: Record<string, string> = {};

    if (form.type === "card") {
      if (!/^\d{4}$/.test(form.last4)) errs.last4 = "Enter exactly 4 digits";
      if (!form.holder_name.trim()) errs.holder_name = "Holder name is required";
      const month = Number(form.expiry_month);
      if (!form.expiry_month || month < 1 || month > 12) errs.expiry_month = "Month 1–12";
      const year = Number(form.expiry_year);
      if (!form.expiry_year || year < 2024 || year > 2040) errs.expiry_year = "Valid year";
    } else if (form.type === "upi") {
      if (!form.upi_id.includes("@")) errs.upi_id = "Enter a valid UPI ID (e.g. name@upi)";
    } else if (form.type === "net_banking") {
      if (!form.bank_name.trim()) errs.bank_name = "Bank name is required";
      if (form.account_last4 && !/^\d{4}$/.test(form.account_last4)) errs.account_last4 = "Enter 4 digits or leave blank";
    } else if (form.type === "wallet") {
      if (!form.wallet_name.trim()) errs.wallet_name = "Wallet name is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!form || !validate() || !accessToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let details: Record<string, unknown>;
      if (form.type === "card") {
        details = {
          last4: form.last4,
          holder_name: form.holder_name,
          expiry_month: Number(form.expiry_month),
          expiry_year: Number(form.expiry_year),
          ...(form.network ? { network: form.network } : {}),
        };
      } else if (form.type === "upi") {
        details = { upi_id: form.upi_id };
      } else if (form.type === "net_banking") {
        details = {
          bank_name: form.bank_name,
          ...(form.account_last4 ? { account_last4: form.account_last4 } : {}),
        };
      } else {
        details = {
          wallet_name: form.wallet_name,
          ...(form.linked_mobile ? { linked_mobile: form.linked_mobile } : {}),
        };
      }

      const created = await addPaymentMethod(accessToken, { type: form.type, details });
      setMethods((prev) => [...prev, created]);
      handleCancelForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add payment method.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await deletePaymentMethod(accessToken, id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleCancelForm() {
    setShowForm(false);
    setSelectedType(null);
    setForm(null);
    setErrors({});
    setSubmitError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="p-1">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-base font-semibold flex-1">Payment Methods</h1>
        {!showForm && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5" /> Add New
          </Button>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                {selectedType ? "Enter Details" : "Select Payment Type"}
              </p>
              <button onClick={handleCancelForm} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            {/* Step 1: Type selector */}
            {!selectedType && (
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectType(opt.value)}
                    className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Type-specific form */}
            {selectedType && form && (
              <>
                <div className="flex items-center gap-2">
                  <TypeBadge type={selectedType} />
                  <button
                    onClick={() => { setSelectedType(null); setForm(null); setErrors({}); }}
                    className="text-xs text-muted-foreground underline"
                  >
                    Change
                  </button>
                </div>

                {form.type === "card" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Cardholder Name</label>
                      <Input placeholder="Name on card" value={form.holder_name} onChange={(e) => setField("holder_name", e.target.value)} />
                      <FieldError msg={errors.holder_name} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Last 4 Digits</label>
                      <Input placeholder="4242" maxLength={4} value={form.last4} onChange={(e) => setField("last4", e.target.value)} />
                      <FieldError msg={errors.last4} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Expiry Month</label>
                        <Input placeholder="MM (1–12)" maxLength={2} value={form.expiry_month} onChange={(e) => setField("expiry_month", e.target.value)} />
                        <FieldError msg={errors.expiry_month} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Expiry Year</label>
                        <Input placeholder="YYYY" maxLength={4} value={form.expiry_year} onChange={(e) => setField("expiry_year", e.target.value)} />
                        <FieldError msg={errors.expiry_year} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Network (optional)</label>
                      <Input placeholder="Visa, Mastercard, RuPay…" value={form.network} onChange={(e) => setField("network", e.target.value)} />
                    </div>
                  </div>
                )}

                {form.type === "upi" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">UPI ID</label>
                    <Input placeholder="yourname@upi" value={form.upi_id} onChange={(e) => setField("upi_id", e.target.value)} />
                    <FieldError msg={errors.upi_id} />
                  </div>
                )}

                {form.type === "net_banking" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Bank Name</label>
                      <Input placeholder="e.g. HDFC, SBI, ICICI" value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} />
                      <FieldError msg={errors.bank_name} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Account Last 4 Digits (optional)</label>
                      <Input placeholder="1234" maxLength={4} value={form.account_last4} onChange={(e) => setField("account_last4", e.target.value)} />
                      <FieldError msg={errors.account_last4} />
                    </div>
                  </div>
                )}

                {form.type === "wallet" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Wallet Name</label>
                      <Input placeholder="Paytm, PhonePe, Amazon Pay…" value={form.wallet_name} onChange={(e) => setField("wallet_name", e.target.value)} />
                      <FieldError msg={errors.wallet_name} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Linked Mobile (optional)</label>
                      <Input placeholder="+91 98765 43210" value={form.linked_mobile} onChange={(e) => setField("linked_mobile", e.target.value)} />
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    <AlertCircle className="size-3.5 shrink-0" /> {submitError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={handleCancelForm} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                    Save Method
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadMethods}>Retry</Button>
          </div>
        ) : methods.length === 0 && !showForm ? (
          <div className="text-center py-14 space-y-3">
            <CreditCard className="size-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No payment methods saved</p>
            <p className="text-xs text-muted-foreground">Save a payment method for faster checkout.</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="size-3.5" /> Add Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3"
              >
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {m.type === "card" ? <CreditCard className="size-4 text-primary" /> : <Wallet className="size-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TypeBadge type={m.type} />
                  </div>
                  <p className="text-sm font-medium font-mono">{m.display_label}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  aria-label="Delete payment method"
                >
                  {deletingId === m.id
                    ? <Loader2 className="size-4 animate-spin" />
                    : <Trash2 className="size-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
