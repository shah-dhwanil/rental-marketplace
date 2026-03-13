import { useEffect, useState, useRef, type FormEvent, type ReactNode, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Camera, Save, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import * as profileService from "@/services/profile.service";
import { UpdateProfileSchema } from "@/schemas/profile.schema";
import { LocationPicker, type SelectedLocation } from "@/components/location/LocationPicker";
import type { AnyProfile } from "@/schemas/profile.schema";

type FormErrors = Record<string, string>;

function extractErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function Field({
  label, id, error, hint, children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function EditProfilePage() {
  const navigate = useNavigate();
  const { accessToken, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [locationPick, setLocationPick] = useState<SelectedLocation | undefined>();

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(null);

  const hasLocationFields = profile?.role === "vendor" || profile?.role === "delivery_partner";

  useEffect(() => {
    if (!accessToken) { navigate("/login"); return; }
    profileService.getProfile(accessToken).then((p) => {
      setProfile(p);
      setName(p.name);
      setPhotoUrl(p.profile_photo_url);
      if (p.role === "vendor" || p.role === "delivery_partner") {
        const rp = p as AnyProfile & { address?: string | null; city?: string | null; pincode?: string | null };
        setAddress(rp.address ?? "");
        setCity(rp.city ?? "");
        setPincode(rp.pincode ?? "");
      }
    }).catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load profile"));
  }, [accessToken, navigate]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const url = await profileService.uploadProfilePhoto(file, accessToken);
      setPhotoUrl(url);
      updateUser({ /* photo would update here if User shape had photoUrl */ });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setServerError(null);

    const payload: Record<string, unknown> = { name: name.trim() || undefined };
    if (hasLocationFields) {
      payload.address = address.trim() || undefined;
      payload.city = city.trim() || undefined;
      payload.pincode = pincode.trim() || undefined;
      if (locationPick) {
        payload.lat = locationPick.lat;
        payload.lng = locationPick.lng;
      }
    }

    const result = UpdateProfileSchema.safeParse(payload);
    if (!result.success) { setFormErrors(extractErrors(result.error)); return; }

    if (!accessToken) return;
    setIsSaving(true);
    try {
      await profileService.updateProfile(result.data, accessToken);
      if (result.data.name) updateUser({ firstName: result.data.name.split(" ")[0], lastName: result.data.name.split(" ").slice(1).join(" ") });
      setSaved(true);
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-red-500 text-sm">{loadError}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit Profile</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Photo section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow">
                <span className="text-2xl font-bold text-primary">{name.charAt(0).toUpperCase() || "?"}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-primary/90 transition-colors"
              title="Change photo"
            >
              {photoUploading
                ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
          {photoError && <p className="text-xs text-red-500 mt-2">{photoError}</p>}
          <p className="text-xs text-slate-400 mt-2">JPEG, PNG or WebP · Max 5 MB</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <Field label="Full Name" id="name" error={formErrors.name}>
            <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
              className={`h-10 ${formErrors.name ? "border-red-500" : ""}`} />
          </Field>

          {hasLocationFields && (
            <>
              <Field label="Address" id="address" error={formErrors.address}>
                <Input id="address" placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)}
                  className={`h-10 ${formErrors.address ? "border-red-500" : ""}`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" id="city" error={formErrors.city}>
                  <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
                    className={`h-10 ${formErrors.city ? "border-red-500" : ""}`} />
                </Field>
                <Field label="Pincode" id="pin" error={formErrors.pincode}>
                  <Input id="pin" placeholder="110001" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value)}
                    className={`h-10 ${formErrors.pincode ? "border-red-500" : ""}`} />
                </Field>
              </div>
              <LocationPicker value={locationPick} onChange={setLocationPick} error={formErrors.lat ?? formErrors.lng} />
            </>
          )}

          {serverError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
            </div>
          )}

          {saved && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
              <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>
            </div>
          )}

          <Button type="submit" disabled={isSaving || saved} className="w-full h-10 font-semibold">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Changes</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
