import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { confirmPayment } from "@/services/order.service";

interface StripePaymentFormProps {
  orderId: string;
  amount: number;
  productId?: string;
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StripePaymentForm({ orderId, amount, productId }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { removeFromCart } = useCartStore();

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !accessToken) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/confirmation?order_id=${orderId}`,
        },
        redirect: "if_required",
      });

      if (stripeError) {
        setErrorMessage(stripeError.message ?? "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      // If payment succeeded, confirm with backend
      if (paymentIntent?.status === "succeeded") {
        await confirmPayment(accessToken, orderId);

        // Remove from cart after successful payment
        if (productId) {
          removeFromCart(productId);
        }

        navigate(`/orders/confirmation?order_id=${orderId}`);
      } else {
        setErrorMessage("Payment was not successful. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Test Mode Notice */}
      <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-100">
          <p className="font-semibold mb-1">Test Mode - Use Test Card</p>
          <p>Card: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">4242 4242 4242 4242</code></p>
          <p>Expiry: Any future date | CVC: Any 3 digits | ZIP: Any 5 digits</p>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="p-4 border border-border rounded-lg bg-background">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
          }}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-purple-700 text-white py-6 font-bold text-base"
        disabled={!stripe || !elements || processing}
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="size-5 animate-spin mr-2" />
            Processing Payment…
          </>
        ) : (
          <>
            <CheckCircle2 className="size-5 mr-2" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By completing this payment, you agree to our rental terms and conditions.
      </p>
    </form>
  );
}
