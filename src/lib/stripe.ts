import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

// Get Stripe publishable key from environment
// For test mode, use: pk_test_...
const STRIPE_PUBLISHABLE_KEY = "pk_test_51RD2EePHwi0EB4w5pSJOtR80nEzoURSWoZSdQjkx8VN6MOzRCV3BhscUFrVWkhy9JXZXG6XI0z4mxvvnqaD4dMHm00WUOdWBF9";

let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
