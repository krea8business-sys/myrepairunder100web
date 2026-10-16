import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/db/schema";
import { Media } from "./Media";

export function CategoryCard({ category, count, exploreLabel = "Explore Services", priority }: { category: Category; count: number; exploreLabel?: string; priority?: boolean }) {
  return (
    <Link
      href={`/services/${category.slug}`}
      className="group card flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-lift"
    >
      <Media imageUrl={category.imageUrl} illustration={category.illustration} alt={`${category.name} illustration`} className="aspect-[4/3] w-full" priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold">{category.name}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{category.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-soft">{count} services</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-700">
            {exploreLabel} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
