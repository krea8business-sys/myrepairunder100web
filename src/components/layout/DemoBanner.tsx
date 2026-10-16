export function DemoBanner({ show, announcement }: { show: boolean; announcement: string | null }) {
  if (!show && !announcement) return null;
  return (
    <div className="bg-navy-950 px-4 py-2 text-center text-xs font-medium text-navy-100 sm:text-[13px]">
      {announcement ?? "Preview mode: prices marked “Demo price” are placeholders until confirmed by our team."}
    </div>
  );
}
