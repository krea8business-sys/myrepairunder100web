"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export function CancelRequest({ code, cutoffHours }: { code: string; cutoffHours: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Please tell us why you want to cancel");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${code}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send request");
      toast("Cancellation request sent");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setOpen(true)}>
        Request cancellation
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request cancellation"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Keep booking</Button>
            <Button variant="danger" onClick={submit} loading={loading}>Send request</Button>
          </>
        }
      >
        <p className="mb-4">Cancellation requests are reviewed by our team (allowed up to {cutoffHours} hours before your slot). Your booking stays active until the status changes to Cancelled.</p>
        <TextArea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} error={error ?? undefined} />
      </Modal>
    </>
  );
}
