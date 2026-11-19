const DURATION_OPTIONS = [
  '30 minutes',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '3 hours',
  '4+ hours',
  'To be discussed',
];

export default function PerformanceRequirements({
  formData,
  handleChange,
  fieldError = { field: '', message: '' },
  onFocusField,
}) {
  return (
    <div className="booking-card" id="performanceRequirementsCard">
      <div className="booking-card-header">
        <span className="booking-card-step-badge">3</span>
        <div>
          <h2 className="booking-card-title">Contact &amp; performance requirements</h2>
          <p className="booking-card-desc">Help the artist plan for your event.</p>
        </div>
      </div>

      <div className="booking-grid-two-col">
        {/* Phone number */}
        <div className="booking-field" id="customerPhoneField">
          <label htmlFor="customerPhone" className="booking-field-label">
            Phone number <span className="booking-req">*</span>
          </label>
          <input
            id="customerPhone"
            name="customer_phone"
            type="tel"
            className={`booking-control ${fieldError.field === 'customerPhone' ? 'booking-control-highlight' : ''}`}
            placeholder="e.g. 7907899186"
            value={formData.customer_phone || ''}
            onChange={handleChange}
            onFocus={() => onFocusField && onFocusField('customerPhone')}
            required
            autoComplete="tel"
          />
          {fieldError.field === 'customerPhone' && (
            <div className="booking-field-pointer" role="alert">
              <span>{fieldError.message}</span>
            </div>
          )}
        </div>

        {/* Performance duration */}
        <div className="booking-field" id="performanceDurationField">
          <label htmlFor="performanceDuration" className="booking-field-label">
            Performance duration <span className="booking-req">*</span>
          </label>
          <select
            id="performanceDuration"
            name="performance_duration"
            className={`booking-control ${fieldError.field === 'performanceDuration' ? 'booking-control-highlight' : ''}`}
            value={formData.performance_duration || ''}
            onChange={handleChange}
            onFocus={() => onFocusField && onFocusField('performanceDuration')}
            required
          >
            <option value="" disabled>Select duration</option>
            {DURATION_OPTIONS.map((dur) => (
              <option key={dur} value={dur}>
                {dur}
              </option>
            ))}
          </select>
          {fieldError.field === 'performanceDuration' && (
            <div className="booking-field-pointer" role="alert">
              <span>{fieldError.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="booking-grid-two-col">
        {/* Expected audience size */}
        <div className="booking-field" id="expectedAudienceSizeField">
          <label htmlFor="expectedAudienceSize" className="booking-field-label">
            Expected audience size <span className="booking-req">*</span>
          </label>
          <input
            id="expectedAudienceSize"
            name="expected_audience_size"
            type="number"
            min="1"
            className={`booking-control ${fieldError.field === 'expectedAudienceSize' ? 'booking-control-highlight' : ''}`}
            placeholder="e.g. 250"
            value={formData.expected_audience_size || ''}
            onChange={handleChange}
            onFocus={() => onFocusField && onFocusField('expectedAudienceSize')}
            required
          />
          {fieldError.field === 'expectedAudienceSize' && (
            <div className="booking-field-pointer" role="alert">
              <span>{fieldError.message}</span>
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="booking-field" id="budgetField">
          <label htmlFor="budget" className="booking-field-label">
            Your budget (₹) <span className="booking-optional">Optional</span>
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            className={`booking-control ${fieldError.field === 'budget' ? 'booking-control-highlight' : ''}`}
            placeholder="e.g. 5000"
            value={formData.budget || ''}
            onChange={handleChange}
            onFocus={() => onFocusField && onFocusField('budget')}
          />
          {fieldError.field === 'budget' && (
            <div className="booking-field-pointer" role="alert">
              <span>{fieldError.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional requirements */}
      <div className="booking-field">
        <label htmlFor="additionalRequirements" className="booking-field-label">
          Additional requirements <span className="booking-optional">Optional</span>
        </label>
        <textarea
          id="additionalRequirements"
          name="additional_requirements"
          rows={3}
          className="booking-control booking-textarea"
          placeholder="Sound system, instruments, accommodation, travel, dress code or other instructions"
          value={formData.additional_requirements || ''}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
