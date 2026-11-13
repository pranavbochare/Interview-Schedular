import { Badge } from '@/components/ui/badge';
import { BOOKING_META, RESULT_META, STATE_META } from '@/lib/journey';

export const StateBadge = ({ state }) => <Badge tone={STATE_META[state]?.tone}>{STATE_META[state]?.label ?? state}</Badge>;
export const ResultBadge = ({ result }) => <Badge tone={RESULT_META[result]?.tone}>{RESULT_META[result]?.label ?? result}</Badge>;
export const BookingBadge = ({ status }) => <Badge tone={BOOKING_META[status]?.tone}>{BOOKING_META[status]?.label ?? status}</Badge>;
