import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../utils/format";

export const LoginPage: React.FC = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  if (user) {
    return <Navigate to={user.role === "Admin" ? "/admin" : from ?? "/account"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register" && form.password !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const signedIn =
        mode === "login"
          ? await login(form.email, form.password)
          : await register({
              name: form.name,
              email: form.email,
              phone: form.phone || undefined,
              password: form.password,
            });
      toast.success(
        mode === "login"
          ? `Welcome back, ${signedIn.name.split(" ")[0]}!`
          : `Welcome, ${signedIn.name.split(" ")[0]}! Check your email to verify your address.`
      );
      navigate(signedIn.role === "Admin" ? "/admin" : from ?? "/account", { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, mode === "login" ? "Sign in failed" : "Couldn't create account"));
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: "login" | "register", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 py-2.5 rounded-full font-bold transition-all ${
        mode === m ? "bg-gradient-to-r from-blush-500 to-blush-600 text-white" : "text-blush-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="py-16 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-5xl text-center">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
        <div className="gold-rule mb-8" />

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="flex gap-1 p-1 rounded-full bg-blush-50 border border-gold-200">
            {tab("login", "Sign In")}
            {tab("register", "Register")}
          </div>

          {mode === "register" && (
            <>
              <div>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="phone">Phone (optional)</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
              <label htmlFor="password">Password</label>
              {mode === "login" && (
                <Link to="/forgot-password" className="text-xs font-bold text-blush-600 hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => update({ password: e.target.value })}
            />
          </div>
          {mode === "register" && (
            <div>
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => update({ confirm: e.target.value })}
              />
              <p className="text-xs text-blush-900/60 mt-1">At least 8 characters.</p>
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
            {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-sm text-blush-900/70">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="font-bold text-blush-600 hover:underline"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
