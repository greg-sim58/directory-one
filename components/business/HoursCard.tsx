import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DAY_KEYS, type BusinessDetail } from '@/lib/profile/schema';
import { formatTimeRange } from '@/lib/profile/hours';

type Props = {
  business: BusinessDetail;
};

export function HoursCard({ business }: Props) {
  const todayIndex = new Date(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: business.city.timezone,
    }).format(new Date()) as string,
  ).getDay();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours</CardTitle>
      </CardHeader>
      <CardContent>
        {business.hours ? (
          <ul className="flex flex-col divide-y">
            {DAY_KEYS.map((day, i) => {
              const window = business.hours?.[day];
              const isToday = i === todayIndex;
              return (
                <li
                  key={day}
                  className={
                    isToday
                      ? 'border-foreground/30 bg-muted/40 -mx-1 flex items-center justify-between rounded-md border-l-2 px-3 py-1.5 font-medium'
                      : 'flex items-center justify-between py-1.5 text-sm'
                  }
                >
                  <span className="capitalize">{day}</span>
                  <span className={isToday ? 'tabular-nums' : 'text-muted-foreground tabular-nums'}>
                    {window ? formatTimeRange(window[0], window[1]) : 'Closed'}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Hours not listed</p>
        )}
      </CardContent>
    </Card>
  );
}
