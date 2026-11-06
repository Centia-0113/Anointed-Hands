import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../utils/format";

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-16 px-4">
    <div className="max-w-md mx-auto">
      <h1 className="text-5xl text-center">{title}</h1>
      <div className="gold-rule mb-8" />
      <div className="card">{children}</div>
    </div>
  </div>
);

/** /forgot-password — request a reset link by email. */
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't send the reset link"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Forgot Password">
      {sent ? (
        <div className="text-center space-y-4">
          <div className="text-5xl">📬</div>
          <p>
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your
            password. It expires in 1 hour.
          </p>
          <Link to="/login" className="btn-secondary">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-blush-900/70">
            Enter the email you registered with and we'll send you a link to choose a new password.
          </p>
          <div>
            <label htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
            {busy ? "Sending…" : "Send Reset Link"}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="font-bold text-blush-600 hover:underline">
              Back to Sign In
            </Link>
          </p>
        </form>
      )}
    </Shell>
  );
};

/** /reset-password?token=… — choose a new password from the emailed link. */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.resetPassword(token, form.next);
      logout(); // any existing session is no longer valid
      toast.success(res.message);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't reset your password"));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell title="Reset Password">
        <p className="text-center mb-4">This reset link is incomplete. Please request a new one.</p>
        <div className="text-center">
          <Link to="/forgot-password" className="btn-primary">
            Request New Link
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="New Password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="rp-new">New password</label>
          <input
            id="rp-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="rp-confirm">Confirm new password</label>
          <input
            id="rp-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
          <p className="text-xs text-blush-900/60 mt-1">At least 8 characters.</p>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
          {busy ? "Saving…" : "Set New Password"}
        </button>
      </form>
    </Shell>
  );
};

/** /verify-email?token=… — confirms the address from the emailed link. */
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");
  const started = useRef(false); // tokens are single-use; avoid StrictMode double-call

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setState("error");
      setError("This verification link is incomplete.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(async () => {
        await refreshUser();
        setState("done");
      })
      .catch((e) => {
        setError(apiErrorMessage(e, "This verification link is invalid or has expired."));
        setState("error");
      });
  }, [token, refreshUser]);

  return (
    <Shell title="Verify Email">
      <div className="text-center space-y-4">
        {state === "working" && <p>Verifying your email…</p>}
        {state === "done" && (
          <>
            <div className="text-5xl">💖</div>
            <p>Your email is verified. Bookings you made with this email now appear in your account.</p>
            <Link to={user ? "/account" : "/login"} className="btn-primary">
              {user ? "Go to My Bookings" : "Sign In"}
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <p className="text-red-700">{error}</p>
            <Link to={user ? "/account" : "/login"} className="btn-secondary">
              {user ? "Resend from My Account" : "Sign In"}
            </Link>
          </>
        )}
      </div>
    </Shell>
  );
};
