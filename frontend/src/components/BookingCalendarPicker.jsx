import { useState } from 'react';

// Time slot configuration matching the requested design
const TIME_SLOT_SECTIONS = [
  {
    title: 'Morning',
    slots: [
      { label: '8 AM', time: '08:00' },
      { label: '9 AM', time: '09:00' },
      { label: '10 AM', time: '10:00' },
      { label: '11 AM', time: '11:00' },
    ],
  },
  {
    title: 'Afternoon',
    slots: [
      { label: '12 PM', time: '12:00' },
      { label: '1 PM', time: '13:00', unavailable: true }, // Struck through / unavailable in design
      { label: '2 PM', time: '14:00' },
      { label: '3 PM', time: '15:00' },
    ],
  },
  {
    title: 'Evening',
    slots: [
      { label: '4 PM', time: '16:00' },
      { label: '5 PM', time: '17:00' },
      { label: '6 PM', time: '18:00' },
      { label: '7 PM', time: '19:00' },
    ],
  },
  {
    title: 'Night',
    slots: [
      { label: '8 PM', time: '20:00' },
      { label: '9 PM', time: '21:00', unavailable: true }, // Struck through / unavailable in design
      { label: '10 PM', time: '22:00' },
      { label: '11 PM', time: '23:00' },
    ],
  },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format a number as 2 digits
function pad2(num) {
  return String(num).padStart(2, '0');
}

// Format Date object to YYYY-MM-DD in local time
function toDateString(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

// Convert 24-hr time 'HH:MM' to 'h:MM AM/PM'
function format12Hour(timeStr) {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${pad2(mm || 0)} ${period}`;
}

export default function BookingCalendarPicker({
  selectedDate = '2026-11-20',
  selectedTime = '19:00',
  onDateChange,
  onTimeChange,
}) {
  // Parse initial selected date for calendar navigation
  const initialDateObj = (() => {
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  })();

  const [viewDate, setViewDate] = useState(
    new Date(initialDateObj.getFullYear(), initialDateObj.getMonth(), 1)
  );

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Today reference
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const todayMidnight = new Date(todayYear, todayMonth, todayDay);

  // Selected date parts
  let selYear = -1;
  let selMonth = -1;
  let selDay = -1;
  if (selectedDate) {
    const parts = selectedDate.split('-').map(Number);
    if (parts.length === 3) {
      selYear = parts[0];
      selMonth = parts[1] - 1;
      selDay = parts[2];
    }
  }

  // Days in current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  // Navigation limits
  const canGoPrev =
    viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth);

  function handlePrevMonth(e) {
    e.preventDefault();
    if (!canGoPrev) return;
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  }

  function handleNextMonth(e) {
    e.preventDefault();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  }

  // Unavailable dates rule (e.g. Saturdays 14, 21, 28 in Nov 2026 per screenshot)
  function isDateUnavailable(year, month, day) {
    if (year === 2026 && month === 10) {
      // November is 0-indexed month 10
      if (day === 14 || day === 21 || day === 28) {
        return true;
      }
    }
    return false;
  }

  function handleSelectDay(day) {
    const targetDate = new Date(viewYear, viewMonth, day);
    if (targetDate < todayMidnight) return; // Cannot select past
    if (isDateUnavailable(viewYear, viewMonth, day)) return; // Cannot select unavailable

    const formatted = toDateString(viewYear, viewMonth, day);
    if (onDateChange) {
      onDateChange(formatted);
    }
  }

  function handleSelectTime(slot) {
    if (slot.unavailable) return;
    if (onTimeChange) {
      onTimeChange(slot.time);
    }
  }

  // Month title formatted
  const monthTitle = viewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Short header for Time slot column: "Fri, 20 Nov"
  const selectedDateHeader = (() => {
    if (selYear !== -1) {
      const d = new Date(selYear, selMonth, selDay);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const mon = d.toLocaleDateString('en-US', { month: 'short' });
      return `${weekday}, ${dayNum} ${mon}`;
    }
    return 'Select a date';
  })();

  // Bottom footer readout: "Fri, 20 November 2026 • 7:00 PM"
  const bottomReadout = (() => {
    if (selYear !== -1) {
      const d = new Date(selYear, selMonth, selDay);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthLong = d.toLocaleDateString('en-US', { month: 'long' });
      const yearVal = d.getFullYear();
      const timeFormatted = format12Hour(selectedTime);
      return `${weekday}, ${dayNum} ${monthLong} ${yearVal}${timeFormatted ? ` • ${timeFormatted}` : ''}`;
    }
    return 'Please select a date & time';
  })();

  return (
    <div className="booking-datetime-picker" aria-label="Event date and time picker">
      <div className="booking-datetime-body">
        {/* Left Column: Calendar */}
        <div className="booking-cal-panel">
          {/* Calendar Header with Navigation */}
          <div className="booking-cal-nav">
            <button
              type="button"
              className="booking-cal-nav-btn"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <span className="booking-cal-month-title">{monthTitle}</span>

            <button
              type="button"
              className="booking-cal-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="booking-cal-weekdays">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className="booking-cal-weekday-label">
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="booking-cal-days-grid" role="grid" aria-label="Month days">
            {/* Blank offset cells */}
            {Array.from({ length: firstDayWeekday }).map((_, idx) => (
              <div key={`blank-${idx}`} className="booking-cal-day-cell is-empty" aria-hidden="true" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const cellDate = new Date(viewYear, viewMonth, day);
              const isPast = cellDate < todayMidnight;
              const isToday =
                viewYear === todayYear &&
                viewMonth === todayMonth &&
                day === todayDay;
              const isSelected =
                viewYear === selYear &&
                viewMonth === selMonth &&
                day === selDay;
              const isUnavailable = isDateUnavailable(viewYear, viewMonth, day);

              let classNames = 'booking-cal-day-cell';
              if (isSelected) {
                classNames += ' is-selected';
              } else if (isToday) {
                classNames += ' is-today';
              }

              if (isUnavailable) {
                classNames += ' is-unavailable';
              } else if (isPast) {
                classNames += ' is-past';
              } else if (!isSelected) {
                classNames += ' is-available';
              }

              const isDisabled = isPast || isUnavailable;

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  className={classNames}
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  aria-label={`${monthTitle} ${day}${isToday ? ', Today' : ''}${isSelected ? ', Selected' : ''}${isUnavailable ? ', Unavailable' : ''}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="booking-cal-legend" aria-label="Calendar legend">
            <div className="booking-legend-item">
              <span className="legend-swatch available" />
              <span>Available</span>
            </div>
            <div className="booking-legend-item">
              <span className="legend-swatch selected" />
              <span>Selected</span>
            </div>
            <div className="booking-legend-item">
              <span className="legend-swatch unavailable" />
              <span>Unavailable</span>
            </div>
            <div className="booking-legend-item">
              <span className="legend-swatch today" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Right Column: Time Slots */}
        <div className="booking-time-panel" aria-label="Start time slots">
          <div className="booking-time-header">
            <div className="booking-time-date-title">{selectedDateHeader}</div>
            <div className="booking-time-subtitle">Select a start time</div>
          </div>

          <div className="booking-time-groups">
            {TIME_SLOT_SECTIONS.map((sec) => (
              <div key={sec.title} className="booking-time-group">
                <div className="booking-time-group-title">{sec.title}</div>
                <div className="booking-time-slots-grid">
                  {sec.slots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    let slotClass = 'booking-time-slot-btn';
                    if (isSelected) {
                      slotClass += ' is-selected';
                    } else if (slot.unavailable) {
                      slotClass += ' is-unavailable';
                    }

                    return (
                      <button
                        type="button"
                        key={slot.time}
                        className={slotClass}
                        disabled={slot.unavailable}
                        onClick={() => handleSelectTime(slot)}
                        aria-pressed={isSelected}
                        aria-label={`${sec.title} ${slot.label}${slot.unavailable ? ', Unavailable' : ''}${isSelected ? ', Selected' : ''}`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Readout Status Strip */}
      <div className="booking-datetime-footer">
        <div className="booking-datetime-summary">{bottomReadout}</div>
        <div className="booking-datetime-status">
          <span className="booking-status-indicator" />
          <span>Artist is available</span>
        </div>
      </div>
    </div>
  );
}

