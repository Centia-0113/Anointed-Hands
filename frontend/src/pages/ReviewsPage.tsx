import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ReviewSummary, Service } from "../types";
import { reviewsApi, servicesApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../utils/format";
import { StarPicker, Stars } from "../components/StarRating";

export const ReviewsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [form, setForm] = useState({ serviceId: "", rating: 0, comment: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await reviewsApi.getPublic(filter ? parseInt(filter) : undefined));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't load reviews"));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    servicesApi.getAll().then(setServices).catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rating) {
      toast.error("Please choose a star rating");
      return;
    }
    setBusy(true);
    try {
      await reviewsApi.save({
        serviceId: form.serviceId ? parseInt(form.serviceId) : null,
        rating: form.rating,
        comment: form.comment,
      });
      toast.success("Thank you for your review! 💖");
      setForm({ serviceId: "", rating: 0, comment: "" });
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save your review"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete your review?")) return;
    try {
      await reviewsApi.remove(id);
      toast.success("Review deleted");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't delete review"));
    }
  };

  return (
    <div className="py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Client Reviews</h1>
        <div className="gold-rule" />
        {summary && summary.count > 0 && (
          <div className="text-center mb-10">
            <Stars value={summary.average} size="text-3xl" />
            <p className="text-blush-900/70 mt-1">
              <strong className="text-blush-700 text-lg">{summary.average.toFixed(1)}</strong> out of 5 ·{" "}
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Write a review */}
          <div className="lg:col-span-2">
            <div className="card lg:sticky lg:top-28">
              <h2 className="text-2xl mb-4">Share Your Experience</h2>
              {!user ? (
                <div className="text-center py-4">
                  <p className="text-blush-900/70 mb-5">Sign in to leave a review.</p>
                  <Link to="/login" state={{ from: "/reviews" }} className="btn-primary">
                    Sign In
                  </Link>
                </div>
              ) : isAdmin ? (
                <p className="text-blush-900/70">
                  Reviews are written by clients. Moderate them from the admin dashboard.
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label>Your rating</label>
                    <StarPicker value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
                  </div>
                  <div>
                    <label htmlFor="rv-service">Service (optional)</label>
                    <select
                      id="rv-service"
                      value={form.serviceId}
                      onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                    >
                      <option value="">The salon overall</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rv-comment">Your review</label>
                    <textarea
                      id="rv-comment"
                      rows={4}
                      required
                      minLength={5}
                      maxLength={1000}
                      placeholder="Tell others about your visit…"
                      value={form.comment}
                      onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    />
                    <p className="text-xs text-blush-900/60 mt-1">
                      Reviewing the same service again updates your earlier review.
                    </p>
                  </div>
                  <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                    {busy ? "Posting…" : "Post Review"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-3 space-y-4">
            <div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by service">
                <option value="">All reviews</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {!summary ? (
              <p className="text-center py-12 text-blush-900/60">Loading reviews…</p>
            ) : summary.reviews.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-blush-900/70">No reviews yet – be the first to share your experience!</p>
              </div>
            ) : (
              summary.reviews.map((r) => (
                <article key={r.id} className="card">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div>
                      <Stars value={r.rating} />
                      <p className="font-bold">
                        {r.reviewerName}
                        {r.isVerifiedClient && (
                          <span className="ml-2 badge-paid normal-case tracking-normal">✓ Verified client</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-sm text-blush-900/60">
                      {r.serviceName && <p className="badge-info mb-1">{r.serviceName}</p>}
                      <p>{new Date(r.createdAt).toLocaleDateString([], { dateStyle: "medium" })}</p>
                    </div>
                  </div>
                  <p className="text-blush-900/80 whitespace-pre-line">{r.comment}</p>
                  {r.isMine && (
                    <button onClick={() => remove(r.id)} className="mt-3 text-sm font-bold text-blush-600 hover:underline">
                      Delete my review
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
