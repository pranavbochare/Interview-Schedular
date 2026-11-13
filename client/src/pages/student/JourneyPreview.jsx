import { useMemo, useState } from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentJourney from '@/components/StudentJourney';
import { GateBanner, gateFor } from '@/components/BookGate';
import { StateBadge } from '@/components/StatusBadge';
import { SCENARIOS } from '@/lib/journey';

// Notification the student gets when each state is reached (mirrors what the server sends)
const NOTE = {
  ELIGIBLE: ["You're eligible for your interview", 'You have cleared every skill for your Track Badge. Book your interview slot now.'],
  BOOKED: ['Interview confirmed', 'Your interview is booked. You can reschedule or cancel up to 2 hours before the start.'],
  AWAITING_OUTCOME: ['Interview completed', 'Your interviewer will record your result shortly.'],
  PASSED: ['You earned your badge!', 'Congratulations! You cleared your interview and earned your Track Badge.'],
  FAILED: ['Interview result: not cleared', 'You did not clear this attempt. You can book again after the cooling-off period.'],
  RETAKE_LATER: ['Retake later', 'Your interviewer suggests a retake. You can book again from the date shown.'],
  NULLIFIED: ['Your badge has been nullified', 'Plagiarism detected in your Skill 3 contest submission. Contact the GRIT team if you believe this is a mistake.'],
  NOT_ELIGIBLE: ['2 skills to go', 'Clear the remaining skills to unlock your interview.'],
};

function Pane({ title, scenarioKey, setKey, accent }) {
  const data = useMemo(() => SCENARIOS[scenarioKey].data(), [scenarioKey]);
  const gate = gateFor(data);
  const [nt, nb] = NOTE[scenarioKey];
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${accent}`}>{title}</span><StateBadge state={data.journey.state} /></div>
        <Select className="h-9 w-56 text-xs" value={scenarioKey} onChange={(e) => setKey(e.target.value)} aria-label={`${title} scenario`}>
          {Object.entries(SCENARIOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      <div className="rounded-xl border bg-background p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student home</p>
        <StudentJourney data={data} preview />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Book interview screen</CardTitle></CardHeader>
        <CardContent><GateBanner gate={gate} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Notification received</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-md bg-accent/60 p-3"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="text-sm"><p className="font-medium">{nt}</p><p className="text-muted-foreground">{nb}</p></div></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JourneyPreview() {
  const [before, setBefore] = useState('ELIGIBLE');
  const [after, setAfter] = useState('PASSED');
  return (
    <>
      <PageHeader title="Before / After the interview result" description="The same student screens, side by side, before the interview and after each possible result. Pick any two states to compare." />
      <div className="grid items-start gap-6 2xl:grid-cols-[1fr_auto_1fr]">
        <Pane title="Before" scenarioKey={before} setKey={setBefore} accent="bg-indigo-100 text-indigo-700" />
        <div className="hidden pt-2 2xl:block"><ArrowRight className="h-6 w-6 text-muted-foreground" /></div>
        <Pane title="After" scenarioKey={after} setKey={setAfter} accent="bg-violet-100 text-violet-700" />
      </div>
    </>
  );
}
