import Image from "next/image";
import { ApplianceArt } from "@/components/brand/ApplianceArt";

/** Uploaded/real image if set, otherwise the original illustration. */
export function Media({ imageUrl, illustration, alt, className = "", priority, sizes = "(max-width: 768px) 100vw, 33vw" }: { imageUrl?: string | null; illustration: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-navy-50 ${className}`}>
        <Image src={imageUrl} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} unoptimized={imageUrl.startsWith("/api/images/")} />
      </div>
    );
  }
  return (
    <div className={`overflow-hidden ${className}`}>
      <ApplianceArt kind={illustration} title={alt} className="h-full w-full" />
    </div>
  );
}
