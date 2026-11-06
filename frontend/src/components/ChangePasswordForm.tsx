import React, { useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../utils/format";

/** Change-password form for any signed-in user. Other devices are signed out afterwards. */
export const ChangePasswordForm: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const { setSession } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.changePassword(form.current, form.next);
      setSession(res.token, res.user);
      setForm({ current: "", next: "", confirm: "" });
      toast.success("Password changed. Other devices have been signed out.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't change password"));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = dark ? "!bg-white/10 !text-white !border-blush-700 focus:!border-gold-400" : "";
  const labelClass = dark ? "!text-gold-200" : "";

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="cp-current" className={labelClass}>Current password</label>
        <input
          id="cp-current"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="cp-new" className={labelClass}>New password</label>
        <input
          id="cp-new"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="cp-confirm" className={labelClass}>Confirm new password</label>
        <input
          id="cp-confirm"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
        <p className={`text-xs mt-1 ${dark ? "text-blush-200/70" : "text-blush-900/60"}`}>At least 8 characters.</p>
      </div>
      <button type="submit" disabled={busy} className={`${dark ? "btn-gold" : "btn-primary"} disabled:opacity-50`}>
        {busy ? "Saving…" : "Change Password"}
      </button>
    </form>
  );
};
