import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { fmtDateTime } from '@/lib/utils';

// Removes an availability slot. If a student has booked it, a reason is required and the student is notified.
export default function RemoveSlotModal({ slot, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const booked = !!slot?.booking && slot.booking.status === 'BOOKED';

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/interviewer/slots/${slot.id}`, booked ? { reason } : undefined);
      toast.success('Slot removed', booked ? `${slot.booking.student.name} has been notified to rebook.` : undefined);
      onDone();
    } catch (e) { toast.error('Could not remove slot', e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!slot} onOpenChange={(o) => !o && onClose()} title="Remove this slot?" description={slot ? fmtDateTime(slot.startsAt) : ''}>
      {slot && (
        <div className="space-y-4">
          {booked ? (
            <>
              <p className="text-sm">{slot.booking.student.name} has booked this slot. Removing it cancels their interview and notifies them.</p>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. unwell, conflicting meeting)" />
            </>
          ) : <p className="text-sm text-muted-foreground">This open slot will no longer be visible to students.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Keep slot</Button>
            <Button variant="destructive" onClick={remove} disabled={busy || (booked && reason.trim().length < 3)}>Remove slot</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
