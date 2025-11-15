import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Crown, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const UsageMeter = () => {
  const [usedMinutes, setUsedMinutes] = React.useState(45); // 45 minutes used today
  const [isPremium, setIsPremium] = React.useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const dailyLimitMinutes = isPremium ? 480 : 120; // 8h vs 2h in minutes
  const remainingMinutes = dailyLimitMinutes - usedMinutes;
  const usagePercentage = (usedMinutes / dailyLimitMinutes) * 100;
  const isLimitReached = usedMinutes >= dailyLimitMinutes;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleUpgrade = () => {
    toast({
      title: t('plan.upgrade.title'),
      description: t('plan.upgrade.perk'),
    });
  };

  const simulateUsageIncrease = () => {
    setUsedMinutes(prev => Math.min(prev + 15, dailyLimitMinutes));
  };

  const togglePlan = () => {
    setIsPremium(!isPremium);
    toast({
      title: !isPremium ? t('plan.demoPremium') : 'Demo: Free Plan',
    });
  };


  return (
    <Card className={`w-full max-w-md mx-auto ${isLimitReached ? 'border-warning' : ''}`}>
      <CardContent className="p-4 space-y-4">
        {/* Plan Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {isPremium ? t('plan.premium') : t('plan.free')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <Badge variant="default" className="gap-1">
                <Crown className="h-3 w-3" />
                {t('plan.premium')}
              </Badge>
            )}
          </div>
        </div>

        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('plan.usageToday')}</span>
            <span className={isLimitReached ? 'text-warning font-medium' : ''}>
              {formatTime(usedMinutes)} / {formatTime(dailyLimitMinutes)}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className={`h-2 ${isLimitReached ? 'bg-warning/20' : ''}`}
          />
          {!isLimitReached ? (
            <p className="text-sm text-muted-foreground text-center">
              {t('plan.remainingToday', { time: formatTime(remainingMinutes) })}
            </p>
          ) : (
            <p className="text-sm text-warning font-medium text-center">
              {t('plan.usedOverCap')}
            </p>
          )}
        </div>

        {/* Upgrade CTA for Free Users */}
        {!isPremium && (
          <div className="space-y-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{t('plan.upgrade.title')}</p>
              <p className="text-xs text-muted-foreground">{t('plan.upgrade.perk')}</p>
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleUpgrade}
              aria-label={t('plan.upgrade.cta')}
            >
              <Zap className="h-4 w-4" />
              {t('plan.upgrade.cta')}
            </Button>
          </div>
        )}

        {/* Demo Controls */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={simulateUsageIncrease}
            disabled={isLimitReached}
          >
            {t('plan.simulate15')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={togglePlan}
          >
            {isPremium ? 'Demo: Free Plan' : t('plan.demoPremium')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageMeter;