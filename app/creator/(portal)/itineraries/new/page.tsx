'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Link2, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type Step = 'input' | 'extracting' | 'error';

export default function NewCreatorItineraryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [urlText, setUrlText] = useState('');
  const [creatorText, setCreatorText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExtract = async () => {
    const urls = urlText
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    if (urls.length === 0) {
      toast.error('Paste at least one link');
      return;
    }

    setStep('extracting');
    setErrorMsg('');

    try {
      const response = await fetch('/api/itineraries/extract-from-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          creator_text: creatorText.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.spots?.length) {
        setErrorMsg('No places found in those videos. Try adding more context below or use different links.');
        setStep('error');
        return;
      }

      // Store draft in sessionStorage and go to review
      const draftId = crypto.randomUUID();
      sessionStorage.setItem(
        `creator_draft_${draftId}`,
        JSON.stringify({
          spots: data.spots,
          urls,
          creator_text: creatorText.trim() || null,
          created_at: new Date().toISOString(),
        })
      );

      router.push(`/creator/itineraries/review/${draftId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to extract places';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  if (step === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-semibold">Analyzing your videos...</p>
          <p className="text-sm text-muted-foreground">Identifying places and matching them to listings</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Fetching video metadata</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> Extracting place names</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-muted" /> Matching to our listings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span>Creator Studio</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">New Itinerary</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Vibe → Link</h1>
        <p className="mt-2 text-muted-foreground">
          Paste your TikTok links. We extract every spot, match it to our listings, and generate a shareable itinerary — in about 30 seconds.
        </p>
      </div>

      {step === 'error' && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="text-destructive/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* URL input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Your video links
          </label>
          <textarea
            className="w-full min-h-[140px] rounded-xl border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            placeholder={`Paste one link per line:\n\nhttps://www.tiktok.com/@you/video/123...\nhttps://www.youtube.com/watch?v=abc...`}
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">TikTok, YouTube, and Instagram Reels. Up to 20 links.</p>
        </div>

        {/* Creator voice */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Your voice{' '}
            <span className="text-muted-foreground font-normal">(optional but recommended)</span>
          </label>
          <textarea
            className="w-full min-h-[90px] rounded-xl border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            placeholder='e.g. "This is my 4-day itinerary through the Andes, starting from Mérida. Budget-friendly, lots of hiking and local food..."'
            value={creatorText}
            onChange={(e) => setCreatorText(e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            Tell the AI the vibe in 1–3 sentences. It uses your words to write the itinerary description — your followers will recognize your tone.
            {creatorText.length > 0 && (
              <span className="ml-2 text-muted-foreground/60">{1000 - creatorText.length} chars left</span>
            )}
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleExtract}
          disabled={!urlText.trim()}
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate Itinerary
        </Button>
      </div>

      {/* How it works */}
      <div className="mt-12 border-t pt-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">How it works</p>
        <ol className="space-y-3 text-sm text-muted-foreground">
          {[
            'Paste your TikTok/YouTube links',
            'AI extracts every place you mention',
            'We match each spot to our verified listings',
            'You confirm the stops + attach your discount code',
            'Share your link — followers book directly',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
