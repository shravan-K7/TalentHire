import BookingCalendarPicker from '../BookingCalendarPicker';

const EVENT_TYPE_OPTIONS = [
  'Corporate Event',
  'Wedding',
  'Private Party / Birthday',
  'Music / Cultural Festival',
  'Sangeet / Reception',
  'College Event',
  'Other',
];

export default function EventDetails({
  formData,
  handleChange,
  onDateChange,
  onTimeChange,
  unavailableDates,
  onMonthChange,
  isLoadingAvailability = false,
  availabilityError = null,
  fieldError = { field: '', message: '' },
  onFocusField,
}) {
  return (
    <div className="booking-card" id="eventDetailsCard">
      <div className="booking-card-header">
        <span className="booking-card-step-badge">1</span>
        <div>
          <h2 className="booking-card-title">Event details</h2>
          <p className="booking-card-desc">Basic information about your event.</p>
        </div>
      </div>

      {/* Event type */}
      <div className="booking-field" id="eventTypeField">
        <label htmlFor="eventType" className="booking-field-label">
          Event type <span className="booking-req">*</span>
        </label>
        <select
          id="eventType"
          name="event_type"
          className={`booking-control ${fieldError.field === 'eventType' ? 'booking-control-highlight' : ''}`}
          value={formData.event_type}
          onChange={handleChange}
          onFocus={() => onFocusField && onFocusField('eventType')}
          aria-invalid={fieldError.field === 'eventType' ? 'true' : undefined}
          required
        >
          <option value="" disabled>Select event type</option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {fieldError.field === 'eventType' && (
          <div className="booking-field-pointer" role="alert">
            <span>{fieldError.message}</span>
          </div>
        )}
      </div>

      {/* Event date & start time */}
      <div
        id="eventDateTimeSection"
        className={`booking-field ${fieldError.field === 'eventDateTimeSection' ? 'booking-field-highlight' : ''}`}
      >
        <label className="booking-field-label">
          Event date &amp; start time <span className="booking-req">*</span>
        </label>
        <BookingCalendarPicker
          selectedDate={formData.event_date}
          selectedTime={formData.event_time}
          onDateChange={onDateChange}
          onTimeChange={onTimeChange}
          unavailableDates={unavailableDates}
          onMonthChange={onMonthChange}
          isLoadingAvailability={isLoadingAvailability}
          availabilityError={availabilityError}
        />
        {fieldError.field === 'eventDateTimeSection' && (
          <div className="booking-field-pointer" role="alert">
            <span>{fieldError.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
