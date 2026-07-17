import { HirotaLogo } from "@/components/chrome/HirotaLogo";

// Admin landing (the first page after login): an intentionally empty canvas
// with the HIROTA mark centred. The individual sections live under /admin/*.
// The mark is inlined (not <img>) so its stroke stays a constant 1px like the
// site borders — see HirotaLogo.
export default function AdminIndex() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <HirotaLogo
        aria-label="HIROTA"
        opacity={0.2}
        className="w-[70%] text-black select-none"
      />
    </div>
  );
}
