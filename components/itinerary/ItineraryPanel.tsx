'use client';

import { useState } from 'react';
import { X, Plus, Share2, Save, Map, Sparkles, Loader2, Link2, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItineraryDaySection } from './ItineraryDaySection';
import { CostEstimator } from './CostEstimator';
import { AddStopModal } from './AddStopModal';
import { FillItineraryModal } from './FillItineraryModal';
import { ImportLinksModal } from './ImportLinksModal';
import { ExtractFromTextModal } from './ExtractFromTextModal';
import { PlanningChatPanel } from './PlanningChatPanel';
import { useItinerary } from '@/hooks/use-itinerary';
import { cn } from '@/lib/utils';

interface ItineraryPanelProps {
  className?: string;
}

export function ItineraryPanel({ className }: ItineraryPanelProps) {
  const [addStopDay, setAddStopDay] = useState<number | null>(null);
  const [showFillModal, setShowFillModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExtractTextModal, setShowExtractTextModal] = useState(false);
  const [showPlanningChat, setShowPlanningChat] = useState(false);
  const {
    current,
    days,
    totalCost,
    isDirty,
    isSaving,
    isOpen,
    isOptimizing,
    closePanel,
    addDay,
    removeDay,
    removeStop,
    moveStop,
    save,
    shareItinerary,
    optimizeItinerary,
  } = useItinerary();

  if (!isOpen || !current) return null;

  const dayCostBreakdown = days.map((day) => ({
    label: `Day ${day.day}`,
    amount: day.stops.reduce((sum, s) => sum + (s.cost_usd || 0), 0),
  }));

  const isEmpty = days.every((d) => d.stops.length === 0);

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-background shadow-2xl border-l z-30',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{current.title}</h3>
              <p className="text-xs text-muted-foreground">
                {days.length} day{days.length !== 1 ? 's' : ''}
                {isDirty && (
                  <span className="ml-1 text-amber-500">&bull; unsaved</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowPlanningChat(!showPlanningChat)}
              aria-label="Chat with AI planner"
            >
              <MessageSquare className={cn('w-3.5 h-3.5', showPlanningChat && 'text-primary')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowExtractTextModal(true)}
              aria-label="Import from notes"
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowImportModal(true)}
              aria-label="Import from social media"
            >
              <Link2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => optimizeItinerary()}
              disabled={isOptimizing || isEmpty}
              aria-label="Optimize route with AI"
            >
              {isOptimizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </Button>
            {isDirty && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => save()}
                disabled={isSaving}
                aria-label="Save itinerary"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={shareItinerary}
              aria-label="Share itinerary"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={closePanel}
              aria-label="Close itinerary panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Empty state — creation options */}
            {isEmpty && (
              <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-5 text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">How do you want to start?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate with AI, import from social media, or add stops manually.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowPlanningChat(true)}
                    className="w-full"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Chat with AI Planner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFillModal(true)}
                    className="w-full"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Quick Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExtractTextModal(true)}
                    className="w-full"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Upload Trip Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                    className="w-full"
                  >
                    <Link2 className="w-3.5 h-3.5 mr-1.5" />
                    Import from TikTok / YouTube
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  or add stops manually below
                </p>
              </div>
            )}

            {days.map((day) => (
              <ItineraryDaySection
                key={day.day}
                day={day.day}
                title={day.title}
                stops={day.stops}
                onAddStop={(d) => setAddStopDay(d)}
                onRemoveStop={removeStop}
                onMoveStop={moveStop}
                onRemoveDay={days.length > 1 ? removeDay : undefined}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addDay}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add day
            </Button>

            <CostEstimator
              totalCost={totalCost}
              breakdown={dayCostBreakdown.filter((d) => d.amount > 0)}
            />
          </div>
        </ScrollArea>

        {isDirty && (
          <div className="p-4 border-t bg-muted/30">
            <Button size="sm" className="w-full" onClick={() => save()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        )}
      </div>

      {addStopDay !== null && (
        <AddStopModal
          isOpen
          day={addStopDay}
          onClose={() => setAddStopDay(null)}
        />
      )}

      <FillItineraryModal
        isOpen={showFillModal}
        onClose={() => setShowFillModal(false)}
      />

      <ImportLinksModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <ExtractFromTextModal
        isOpen={showExtractTextModal}
        onClose={() => setShowExtractTextModal(false)}
      />

      <PlanningChatPanel
        isOpen={showPlanningChat}
        onClose={() => setShowPlanningChat(false)}
      />
    </>
  );
}
