'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface PricingSuggestionProps {
  currentPrice: number;
  category: string;
  region: string;
  onApply?: (price: number) => void;
}

interface PricingData {
  suggested: number;
  min: number;
  max: number;
  avg: number;
  reasoning: string;
}

export function PricingSuggestion({ currentPrice, category, region, onApply }: PricingSuggestionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PricingData | null>(null);

  const getSuggestion = async () => {
    setIsLoading(true);
    try {
      // Simulate AI pricing suggestion
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const basePrice = currentPrice;
      const marketAvg = basePrice * (0.9 + Math.random() * 0.3);
      const suggested = Math.round((marketAvg + currentPrice) / 2);

      setSuggestion({
        suggested,
        min: Math.round(suggested * 0.7),
        max: Math.round(suggested * 1.5),
        avg: Math.round(marketAvg),
        reasoning: `Based on ${region} market data for ${category} experiences, similar listings are priced between ${formatCurrency(Math.round(suggested * 0.7))} and ${formatCurrency(Math.round(suggested * 1.5))}. Your current price is ${currentPrice > marketAvg ? 'above' : 'below'} the market average.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={getSuggestion}
        disabled={isLoading}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
        {isLoading ? 'Analyzing market...' : 'Get AI pricing suggestion'}
      </Button>

      {suggestion && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-sm text-amber-900">AI Pricing Analysis</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Min</p>
                <p className="font-medium text-sm">{formatCurrency(suggestion.min)}</p>
              </div>
              <div className="bg-amber-100 rounded-lg py-1">
                <p className="text-xs text-amber-700">Suggested</p>
                <p className="font-bold text-base text-amber-900">
                  {formatCurrency(suggestion.suggested)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max</p>
                <p className="font-medium text-sm">{formatCurrency(suggestion.max)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>

            {onApply && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => onApply(suggestion.suggested)}
              >
                Apply suggested price
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
