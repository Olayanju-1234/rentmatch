"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Home } from "lucide-react";
import { paymentsApi } from "@/src/lib/paymentsApi";

export default function DepositSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const viewingId = params.viewingId as string;
  const provider = searchParams.get("provider") || "stripe";

  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!viewingId) return;

    const poll = async () => {
      try {
        const res = await paymentsApi.getDepositStatus(viewingId);
        if (res.success && res.data) {
          setAmount(res.data.amount ?? null);
          setStatus(res.data.status === "paid" ? "paid" : "pending");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    poll();
    const timer = setTimeout(poll, 3000);
    return () => clearTimeout(timer);
  }, [viewingId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Home className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">RentMatch</span>
        </div>

        {status === "loading" && (
          <>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirming your payment...</h1>
            <p className="text-sm text-gray-500">This only takes a moment.</p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Deposit Paid!</h1>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Your viewing deposit{amount ? ` of ₦${amount.toLocaleString()}` : ""} has been received via{" "}
              <span className="font-medium capitalize">{provider}</span>.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-blue-900 mb-1">What happens next?</p>
              <ul className="space-y-1 text-xs text-blue-700">
                <li>• Your viewing is confirmed with the landlord</li>
                <li>• Show up at the scheduled time</li>
                <li>• Deposit is refunded automatically after the viewing</li>
              </ul>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-yellow-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Received</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Your payment is being confirmed. Your viewing dashboard will update shortly.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We couldn't confirm your payment status. Please check your viewings tab or contact support.
            </p>
          </>
        )}

        <button
          onClick={() => router.push("/tenant-dashboard?tab=viewings")}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
