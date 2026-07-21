"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CartItemsType, ShippingFormInputs } from "@repo/types";
import useCartStore from "@/stores/cartStore";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  handler: (response: RazorpayResponse) => void;
  theme: { color: string };
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
};

type RazorpayFailureResponse = {
  error: { description: string };
};

const RazorpayPaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  const { cart } = useCartStore();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setToken(null);
      setError("Please sign in before making a payment.");
      return;
    }

    getToken()
      .then((token) => {
        setToken(token);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to get Clerk token", err);
        setError("Unable to authenticate payment request. Please sign in again.");
      });
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!token || !window.Razorpay) {
      setError("Payment gateway is loading. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderRes = await fetch(
        `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/create-order`,
        {
          method: "POST",
          body: JSON.stringify({ cart, shipping: shippingForm }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const orderData = await orderRes.json();
      console.log("create-order response", orderRes.status, orderData);

      if (!orderRes.ok || orderData.error) {
        const errorMessage =
          orderData.error || orderData.message || "Failed to create payment order";
        throw new Error(errorMessage);
      }

      const contact = shippingForm.phone.replace(/\D/g, "");
      if (contact.length !== 10) {
        throw new Error("Please enter a valid 10-digit phone number.");
      }

      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "E-commerce App",
        description: "Order Payment",
        order_id: orderData.orderId,
        prefill: {
          name: shippingForm.name,
          email: shippingForm.email,
          contact,
        },
        handler: async (response) => {
          const verifyPayload = {
            ...response,
            shipping: shippingForm,
            cart,
          };
          console.log("verify-payment payload", verifyPayload);

          const verifyRes = await fetch(
            `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/verify-payment`,
            {
              method: "POST",
              body: JSON.stringify(verifyPayload),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const verifyData = await verifyRes.json();
          console.log("verify-payment response", verifyRes.status, verifyData);

          if (!verifyRes.ok || verifyData.error) {
            const errorMessage =
              verifyData.error || verifyData.message || "Payment verification failed";
            setError(errorMessage);
            return;
          }

          router.push(`/return?order_id=${response.razorpay_order_id}`);
        },
        theme: { color: "#1f2937" },
      };

      console.log("Razorpay checkout options", options);

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setError(response.error.description);
        setLoading(false);
      });
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Pay securely with Razorpay (UPI, cards, netbanking)
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={handlePayment}
        className="w-full bg-gray-800 hover:bg-gray-900 transition-all duration-300 text-white p-3 rounded-lg cursor-pointer disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </div>
  );
};

export default RazorpayPaymentForm;
