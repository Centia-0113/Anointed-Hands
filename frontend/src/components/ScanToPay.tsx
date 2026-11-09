import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { PaymentInfo } from "../types";
import { paymentsApi, settingsApi } from "../services/api";
import { Link } from "react-router-dom";
import { formatRand } from "../utils/format";

let cachedInfo: Promise<PaymentInfo> | null = null;
const loadPaymentInfo = () => (cachedInfo ??= settingsApi.getPayment());
let cachedMethods: Promise<{ payFast: boolean }> | null = null;
const loadMethods = () => (cachedMethods ??= paymentsApi.methods().catch(() => ({ payFast: false, sandbox: false })));

/**
 * What the QR code contains. When a scan-to-pay link template is configured (SnapScan, Zapper,
 * PayShap…), it's filled with the reference and amount so scanning opens the payment app.
 * Otherwise it encodes the EFT details so they can be copied straight into a banking app.
 */
const qrPayload = (info: PaymentInfo, reference: string, amount: number) => {
  if (info.scanToPayUrlTemplate) {
    return info.scanToPayUrlTemplate
      .replace(/\{reference\}/g, encodeURIComponent(reference))
      .replace(/\{amountCents\}/g, String(Math.round(amount * 100)))
      .replace(/\{amount\}/g, amount.toFixed(2));
  }
  return [
    `Pay ${info.businessName}`,
    `Bank: ${info.bankName}`,
    `Account name: ${info.accountName}`,
    `Account no: ${info.accountNumber}`,
    `Branch code: ${info.branchCode}`,
    `Reference: ${reference}`,
    `Amount: R${amount.toFixed(2)}`,
  ].join("\n");
};

interface Props {
  reference: string;
  amount: number;
  compact?: boolean;
}

export const ScanToPay: React.FC<Props> = ({ reference, amount, compact }) => {
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [payFast, setPayFast] = useState(false);

  useEffect(() => {
    loadPaymentInfo()
      .then(setInfo)
      .catch(() => {
        cachedInfo = null;
      });
    loadMethods().then((m) => setPayFast(m.payFast));
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy – please copy it manually");
    }
  };

  if (!info) return <p className="text-sm text-blush-900/60">Loading payment details…</p>;

  // PayFast: the QR opens our pay page, which goes to PayFast and confirms the booking automatically
  const payPage = `${window.location.origin}/pay/${encodeURIComponent(reference)}`;
  const isLink = payFast || !!info.scanToPayUrlTemplate;
  const payload = payFast ? payPage : qrPayload(info, reference, amount);

  return (
    <div className={`rounded-xl bg-white border border-gold-200 ${compact ? "p-4" : "p-6"} text-left`}>
      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="p-3 rounded-xl bg-white ring-2 ring-gold-300 shrink-0">
          <QRCodeSVG value={payload} size={compact ? 132 : 168} fgColor="#4a0d29" level="M" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <p className="font-elegant text-2xl font-bold text-blush-700 mb-1">Scan to Pay</p>
          <p className="text-sm text-blush-900/70 mb-3">
            {payFast
              ? "Scan with your phone camera to pay instantly with PayFast – your booking updates automatically."
              : isLink
              ? "Scan with your phone camera or banking app to pay instantly."
              : "Scan with your phone to get our EFT details, then pay from your banking app using the reference."}
          </p>
          <dl className="text-sm grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
            <dt className="text-blush-900/60">Amount</dt>
            <dd className="font-bold">{formatRand(amount)}</dd>
            <dt className="text-blush-900/60">Reference</dt>
            <dd className="font-mono font-bold text-blush-700">
              {reference}{" "}
              <button type="button" onClick={() => copy(reference, "Reference")} className="text-xs text-gold-700 underline">
                copy
              </button>
            </dd>
            {!isLink && (
              <>
                <dt className="text-blush-900/60">Bank</dt>
                <dd>{info.bankName}</dd>
                <dt className="text-blush-900/60">Account</dt>
                <dd className="font-mono">
                  {info.accountNumber}{" "}
                  <button type="button" onClick={() => copy(info.accountNumber, "Account number")} className="text-xs text-gold-700 underline">
                    copy
                  </button>
                </dd>
                <dt className="text-blush-900/60">Branch</dt>
                <dd className="font-mono">{info.branchCode}</dd>
              </>
            )}
          </dl>
          {payFast ? (
            <Link to={`/pay/${encodeURIComponent(reference)}`} className="btn-primary text-sm mt-4">
              Pay now with PayFast
            </Link>
          ) : (
            isLink && (
              <a href={payload} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm mt-4">
                Pay on this device
              </a>
            )
          )}
          {!isLink && (
            <p className="text-xs text-blush-900/60 mt-3">Use the exact reference – we match payments to bookings automatically.</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Small button that reveals the scan-to-pay panel (used in history lists). */
export const ScanToPayToggle: React.FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-gold text-xs px-3 py-1.5">
        {open ? "Hide payment QR" : "Scan to Pay"}
      </button>
      {open && (
        <div className="mt-3">
          <ScanToPay {...props} compact />
        </div>
      )}
    </div>
  );
};
