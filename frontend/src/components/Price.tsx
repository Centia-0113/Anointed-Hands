import React from "react";
import { formatRand } from "../utils/format";

interface Props {
  price: number;
  finalPrice: number;
  discountPercent?: number | null;
  isDiscountActive?: boolean;
  discountEndsOn?: string | null;
  className?: string;
}

/** Shows the price, with the original crossed out and a "-20%" badge when a discount is active. */
export const Price: React.FC<Props> = ({ price, finalPrice, discountPercent, isDiscountActive, discountEndsOn, className = "price" }) => {
  const discounted = isDiscountActive && finalPrice < price;
  return (
    <div>
      <p className={className}>
        {formatRand(finalPrice)}
        {discounted && (
          <span className="ml-2 align-middle text-sm font-body font-bold line-through text-blush-900/40">{formatRand(price)}</span>
        )}
      </p>
      {discounted && (
        <p className="text-xs font-bold text-gold-700">
          <span className="inline-block rounded-full px-2 py-0.5 mr-1 text-white bg-gradient-to-r from-blush-500 to-blush-600">
            -{discountPercent}%
          </span>
          {discountEndsOn ? `until ${new Date(discountEndsOn).toLocaleDateString([], { day: "numeric", month: "short" })}` : "special"}
        </p>
      )}
    </div>
  );
};
