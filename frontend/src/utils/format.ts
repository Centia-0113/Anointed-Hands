import axios from "axios";

const rand = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

/** Formats an amount in South African Rand, e.g. R 250,00 */
export const formatRand = (amount: number): string => rand.format(amount);

/** Pulls a friendly message out of an API error, falling back to `fallback`. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; title?: string } | undefined;
    if (data?.message) return data.message;
    if (!error.response) return "Can't reach the server. Is the API running?";
  }
  return fallback;
};
