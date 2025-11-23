import { useEffect, useState } from "preact/hooks";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DateTimePicker.css";

interface DateTimePickerProps {
  label: string;
  value: string; // ISO datetime string
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  required?: boolean;
  businessHoursOnly?: boolean;
  className?: string;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  onValidationChange,
  minDate = new Date(),
  maxDate,
  placeholder = "Select date and time",
  required = false,
  businessHoursOnly = true,
  className = "",
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);

  // Convert ISO string to Date object on mount/value change
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      } catch (e) {
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Business hours filter (8 AM - 6 PM)
  const filterBusinessHours = (time: Date) => {
    if (!businessHoursOnly) return true;

    const hours = time.getHours();
    return hours >= 8 && hours < 18; // 8 AM to 6 PM (18:00 not included means last slot is 17:45)
  };

  // Handle date change
  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    setTouched(true);

    if (date) {
      // Convert to ISO string for parent component
      const isoString = date.toISOString();
      onChange(isoString);
      validateDate(date);
    } else {
      onChange("");
      validateDate(null);
    }
  };

  // Validate date
  const validateDate = (date: Date | null) => {
    let validationError = "";
    let valid = true;

    if (required && !date) {
      validationError = "Date and time are required";
      valid = false;
    } else if (date) {
      const now = new Date();

      // Check if date is in the past
      if (date < now) {
        validationError = "Date must be in the future";
        valid = false;
      }

      // Check if date is beyond max date (1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (date > oneYearFromNow) {
        validationError = "Date cannot be more than 1 year in the future";
        valid = false;
      }

      // Check business hours if enabled
      if (businessHoursOnly && valid) {
        const hours = date.getHours();
        if (hours < 8 || hours >= 18) {
          validationError = "Time must be within business hours (8 AM - 6 PM)";
          valid = false;
        }
      }
    }

    setError(validationError);
    setIsValid(valid && date !== null);

    if (onValidationChange) {
      onValidationChange(valid, validationError);
    }

    return valid;
  };

  // Handle blur
  const handleBlur = () => {
    setTouched(true);
    validateDate(selectedDate);
  };

  // Get validation state classes
  const getInputClasses = () => {
    let classes = "input w-full";

    if (!touched) return classes;

    if (isValid) {
      classes += " border-green-500 focus:border-green-500 focus:ring-green-500";
    } else if (error) {
      classes += " border-red-500 focus:border-red-500 focus:ring-red-500";
    }

    return classes;
  };

  // Set max date to 1 year from now if not provided
  const effectiveMaxDate = maxDate || (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  })();

  return (
    <div className={className}>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        onBlur={handleBlur}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="MMMM d, yyyy h:mm aa"
        minDate={minDate}
        maxDate={effectiveMaxDate}
        filterTime={filterBusinessHours}
        placeholderText={placeholder}
        className={getInputClasses()}
        calendarClassName="custom-calendar"
        popperClassName="custom-popper"
        wrapperClassName="w-full"
      />

      {touched && error && (
        <p className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {!error && !isValid && (
        <p className="mt-1.5 text-sm text-gray-500">
          {businessHoursOnly
            ? "Business hours: 8:00 AM - 6:00 PM"
            : "Select date and time"}
        </p>
      )}
    </div>
  );
}
