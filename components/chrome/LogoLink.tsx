"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

// TopBar logo. In the store it links to the store index `/` — the hirota
// landing: on mobile that opens the full-screen about overlay; on md+ the link
// is inert (pointer-events-none) because the about column is already always
// visible. The admin shell has no hirota section, so there the logo stays a
// plain image.
export function LogoLink({ alt }: { alt: string }) {
  const pathname = usePathname();

  const img = (
    <>
      {/* Mobile shows the blue HIROTA wordmark; md+ keeps the full
          空手衣のヒロタ lockup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-blue.svg"
        alt={alt}
        className="md:hidden h-[24px] object-contain object-center"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-空手衣のヒロタ.svg"
        alt={alt}
        className="hidden md:block h-[21px] object-contain object-center"
      />
    </>
  );

  if (pathname.startsWith("/admin")) return img;

  return (
    <Link href="/" aria-label={alt} className="md:pointer-events-none">
      {img}
    </Link>
  );
}
