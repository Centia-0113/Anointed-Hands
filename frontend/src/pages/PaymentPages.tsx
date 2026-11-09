import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { paymentsApi, redirectToPayFast } from "../services/api";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, formatRand } from "../utils/format";

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-16 px-4">
    <div className="max-w-md mx-auto">
      <h1 className="text-5xl text-center">{title}</h1>
      <div className="gold-rule mb-8" />
      <div className="card text-center space-y-5">{children}</div>
    </div>
  </div>
);

/** Bank details for anyone who prefers a normal EFT. */
const EftDetails: React.FC<{ reference: string }> = ({ reference }) => {
  const { site } = useSite();
  if (!site.accountNumber) return null;
  return (
    <div className="rounded-xl p-4 bg-gold-50 border border-gold-200 text-left text-sm">
      <p className="font-bold mb-1">Prefer a normal EFT?</p>
      <p>
        {site.bankName} · {site.accountName}
        <br />
        Account <span className="font-mono">{site.accountNumber}</span> · Branch <span className="font-mono">{site.branchCode}</span>
        <br />
        Reference <span className="font-mono font-bold text-blush-700">{reference}</span>
      </p>
      <p className="text-xs text-blush-900/60 mt-1">Use the exact reference so we can match your payment automatically.</p>
    </div>
  );
};

/** /pay/:reference – opened from the scan-to-pay QR code or a "Pay now" button; continues to PayFast. */
export const PayPage: React.FC = () => {
  const { reference = "" } = useParams();
  const [state, setState] = useState<"loading" | "ready" | "error" | "redirecting">("loading");
  const [error, setError] = useState("");
  const [item, setItem] = useState<{ amount: number; description: string; kind: string } | null>(null);
  const [payFast, setPayFast] = useState(false);

  useEffect(() => {
    Promise.all([paymentsApi.payable(reference), paymentsApi.methods()])
      .then(([p, m]) => {
        setItem(p);
        setPayFast(m.payFast);
        setState("ready");
      })
      .catch((e) => {
        setError(apiErrorMessage(e, "We couldn't find anything to pay for this reference."));
        setState("error");
      });
  }, [reference]);

  const pay = async () => {
    setState("redirecting");
    try {
      const co = await paymentsApi.checkout(reference);
      redirectToPayFast(co.processUrl, co.fields);
    } catch (e) {
      setError(apiErrorMessage(e, "Online payment isn't available right now."));
      setState("error");
    }
  };

  return (
    <Shell title="Secure Payment">
      {state === "loading" && <p>Loading…</p>}
      {state === "error" && (
        <>
          <p className="text-blush-900/80">{error}</p>
          <EftDetails reference={reference} />
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        </>
      )}
      {(state === "ready" || state === "redirecting") && item && (
        <>
          <div>
            <p className="text-sm uppercase tracking-widest font-bold text-gold-700">
              {item.kind === "deposit" ? "Booking deposit" : item.kind === "balance" ? "Booking balance" : "Café order"}
            </p>
            <p className="font-elegant text-5xl font-bold text-blush-600 my-1">{formatRand(item.amount)}</p>
            <p className="text-blush-900/70">{item.description}</p>
            <p className="text-xs font-mono text-blush-900/60 mt-1">Reference {reference}</p>
          </div>
          {payFast ? (
            <>
              <button onClick={pay} disabled={state === "redirecting"} className="btn-primary w-full py-3 text-lg disabled:opacity-60">
                {state === "redirecting" ? "Taking you to PayFast…" : "Pay Now with PayFast"}
              </button>
              <p className="text-xs text-blush-900/60">
                Instant EFT or card through PayFast. Your booking updates automatically once you've paid.
              </p>
            </>
          ) : (
            <p className="text-blush-900/70">Online payment isn't switched on yet – please pay by EFT below.</p>
          )}
          <EftDetails reference={reference} />
        </>
      )}
    </Shell>
  );
};

/** /payment/return?ref=… – PayFast sends the client back here; we wait for PayFast's confirmation. */
export const PaymentReturnPage: React.FC = () => {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const { user } = useAuth();
  const [status, setStatus] = useState<"waiting" | "deposit" | "full" | "slow">("waiting");

  useEffect(() => {
    if (!ref) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      tries++;
      try {
        const s = await paymentsApi.status(ref);
        if (s.paidInFull) return setStatus("full");
        if (s.depositPaid) return setStatus("deposit");
      } catch {
        /* keep waiting */
      }
      if (tries >= 40) return setStatus("slow"); // ~2 minutes
      timer = setTimeout(check, 3000);
    };
    check();
    return () => clearTimeout(timer);
  }, [ref]);

  return (
    <Shell title="Thank You!">
      {status === "waiting" && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-blush-200 border-t-blush-600 animate-spin" />
          <p>We're confirming your payment with PayFast. This usually takes a few seconds…</p>
        </>
      )}
      {(status === "deposit" || status === "full") && (
        <>
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-3xl text-white bg-gradient-to-br from-gold-300 to-gold-600">
            ✓
          </div>
          <p className="text-lg font-bold text-blush-800">
            {ref.startsWith("AH-C") ? "Your café order is paid." : status === "full" ? "Your booking is paid in full." : "Deposit received – your booking is secured!"}
          </p>
          <p className="text-sm text-blush-900/70">Reference {ref}</p>
        </>
      )}
      {status === "slow" && (
        <p>
          PayFast hasn't confirmed the payment yet. If you completed it, your booking will update automatically shortly – there's no need
          to pay again.
        </p>
      )}
      <Link to={user ? "/account" : "/"} className="btn-primary">
        {user ? "View My Bookings" : "Back to home"}
      </Link>
    </Shell>
  );
};

/** /payment/cancel?ref=… – the client cancelled on PayFast. */
export const PaymentCancelPage: React.FC = () => {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  return (
    <Shell title="Payment Cancelled">
      <p>No money was taken. You can try again, or pay by EFT using your reference.</p>
      {ref && (
        <Link to={`/pay/${ref}`} className="btn-primary">
          Try Again
        </Link>
      )}
      <EftDetails reference={ref} />
    </Shell>
  );
};
