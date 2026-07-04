import { Link } from "@/lib/i18n/navigation";
import { Price } from "@/components/ui/Price";
import { localize } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import { productImage, type ProductRow } from "@/lib/catalog/types";

// A single product tile in the catalog grid. Server component: localized text is
// resolved here; only the price is a client island (currency-reactive).
export function ProductCard({
  product,
  locale,
}: {
  product: ProductRow;
  locale: Locale;
}) {
  const name = localize(product.name, locale);
  const description = localize(product.description, locale);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col border border-line hover:bg-ink-04"
    >
      <div className="aspect-square border-b border-line overflow-hidden bg-paper-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImage(product.id)}
          alt={name}
          className="w-full h-full object-cover object-center opacity-70 group-hover:opacity-100"
        />
      </div>
      <div className="p-2 leading-tight">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold">{name}</p>
          <Price
            amountJpy={product.price}
            className="text-xs font-bold whitespace-nowrap"
          />
        </div>
        {description && (
          <p className="mt-0.5 text-[11px] italic text-ink-35">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
