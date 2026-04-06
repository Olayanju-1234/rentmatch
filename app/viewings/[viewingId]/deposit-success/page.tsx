"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { paymentsApi } from "@/src/lib/paymentsApi";

export default function DepositSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const viewingId = params.viewingId as string;
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");

  useEffect(() => {
    if (!viewingId) return;

    const poll = async () => {
      try {
        const res = await paymentsApi.getDepositStatus(viewingId);
        if (res.success && res.data) {
          setStatus(res.data.status === "paid" ? "paid" : "pending");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    poll();
    // Poll once more after 3s in case webhook hasn't fired yet
    const timer = setTimeout(poll, 3000);
    return () => clearTimeout(timer);
  }, [viewingId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              </div>
              <CardTitle>Confirming your payment...</CardTitle>
              <CardDescription>This only takes a moment.</CardDescription>
            </>
          )}
          {status === "paid" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle>Deposit Paid!</CardTitle>
              <CardDescription>
                Your £50 viewing deposit has been received. The deposit will be refunded after your viewing is completed.
              </CardDescription>
            </>
          )}
          {status === "pending" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-yellow-500" />
              </div>
              <CardTitle>Payment Received</CardTitle>
              <CardDescription>
                Your payment is being confirmed. Your viewing dashboard will update shortly.
              </CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We couldn't confirm your payment status. Please check your viewing requests or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => router.push("/tenant-dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
