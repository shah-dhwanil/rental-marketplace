import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Plus, Trash2, MapPin, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import {
  listAddresses,
  createAddress,
  deleteAddress,
  type Address,
  type CreateAddressPayload,
} from "@/services/address.service";
import {
  LocationPicker,
  type SelectedLocation,
} from "@/components/location/LocationPicker";

const EMPTY_FORM: CreateAddressPayload = {
  name: "",
  person_name: "",
  contact_no: "",
  address: "",
  city: "",
  pincode: "",
  lat: 0,
  lng: 0,
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-0.5">{msg}</p>;
}

export function AddressesPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAddressPayload>(EMPTY_FORM);
  const [location, setLocation] = useState<SelectedLocation | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateAddressPayload | "location", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== "customer") {
      navigate("/profile");
      return;
    }
    loadAddresses();
  }, [accessToken]);

  function loadAddresses() {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    listAddresses(accessToken)
      .then(setAddresses)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load addresses."))
      .finally(() => setLoading(false));
  }

  function setField(key: keyof CreateAddressPayload, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleLocationChange(loc: SelectedLocation) {
    setLocation(loc);
    setFieldErrors((prev) => ({ ...prev, location: undefined }));
    // Pre-fill address field with geocoded address if empty
    if (!form.address) {
      setForm((prev) => ({ ...prev, address: loc.address }));
    }
  }

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!form.name.trim()) errors.name = "Label is required (e.g. Home, Office)";
    if (!form.person_name.trim()) errors.person_name = "Contact person name is required";
    if (!form.contact_no.trim()) errors.contact_no = "Contact number is required";
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.city.trim()) errors.city = "City is required";
    if (!/^\d{6}$/.test(form.pincode)) errors.pincode = "Enter a valid 6-digit pincode";
    if (!location) errors.location = "Please pick a location on the map";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !accessToken || !location) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createAddress(accessToken, {
        ...form,
        lat: location.lat,
        lng: location.lng,
      });
      setAddresses((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setLocation(undefined);
      setShowForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await deleteAddress(accessToken, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleCancelForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setLocation(undefined);
    setFieldErrors({});
    setSubmitError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="p-1">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-base font-semibold flex-1">Delivery Addresses</h1>
        {!showForm && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5" /> Add New
          </Button>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Add Address Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">New Delivery Address</p>
              <button onClick={handleCancelForm} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Label</label>
                <Input placeholder="Home, Office, etc." value={form.name} onChange={(e) => setField("name", e.target.value)} />
                <FieldError msg={fieldErrors.name} />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Contact Person</label>
                <Input placeholder="Full name" value={form.person_name} onChange={(e) => setField("person_name", e.target.value)} />
                <FieldError msg={fieldErrors.person_name} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Contact Number</label>
                <Input placeholder="+91 98765 43210" value={form.contact_no} onChange={(e) => setField("contact_no", e.target.value)} />
                <FieldError msg={fieldErrors.contact_no} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Street Address</label>
                <Input placeholder="Flat / building / street" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                <FieldError msg={fieldErrors.address} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">City</label>
                <Input placeholder="City" value={form.city} onChange={(e) => setField("city", e.target.value)} />
                <FieldError msg={fieldErrors.city} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pincode</label>
                <Input placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} />
                <FieldError msg={fieldErrors.pincode} />
              </div>
            </div>

            {/* Location Picker */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Pin Location on Map <span className="text-destructive">*</span>
              </label>
              <LocationPicker
                value={location}
                onChange={handleLocationChange}
                error={fieldErrors.location}
              />
            </div>

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
                Save Address
              </Button>
            </div>
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
            <Button variant="outline" size="sm" onClick={loadAddresses}>Retry</Button>
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="text-center py-14 space-y-3">
            <MapPin className="size-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No addresses saved yet</p>
            <p className="text-xs text-muted-foreground">Add a delivery address to use at checkout.</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="size-3.5" /> Add Address
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span className="text-sm font-semibold">{addr.name}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{addr.person_name}</p>
                    <p className="text-sm text-muted-foreground">{addr.address}</p>
                    <p className="text-sm text-muted-foreground">{addr.city} — {addr.pincode}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{addr.contact_no}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                    aria-label="Delete address"
                  >
                    {deletingId === addr.id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
