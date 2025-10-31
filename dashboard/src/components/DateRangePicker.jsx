import { useState } from 'react'
import { Button } from '@/components/ui/button'
// Calendar component temporarily disabled for deployment
// import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

export function DateRangePicker({ value, onChange, className }) {
  const [date, setDate] = useState(value || {
    from: subDays(new Date(), 30),
    to: new Date()
  })

  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 }
  ]

  const handlePresetClick = (days) => {
    const newDate = {
      from: subDays(new Date(), days),
      to: new Date()
    }
    setDate(newDate)
    onChange && onChange(newDate)
  }

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate)
    onChange && onChange(selectedDate)
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3 space-y-1">
              <p className="text-sm font-medium mb-2">Quick Select</p>
              {presets.map((preset) => (
                <Button
                  key={preset.days}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar component temporarily disabled for deployment */}
            {/* <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            /> */}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
