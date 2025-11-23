import { useEffect, useRef, useState } from "preact/hooks";
import "./AddressInput.css";

export interface AddressData {
  formatted: string;
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  postcode?: string;
}

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string, data?: AddressData) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface AddressSuggestion {
  formatted: string;
  properties: {
    formatted: string;
    lat?: number;
    lon?: number;
    city?: string;
    country?: string;
    postcode?: string;
  };
}

export function AddressInput({
  label,
  value,
  onChange,
  onValidationChange,
  placeholder = "Start typing an address...",
  required = false,
  className = "",
}: AddressInputProps) {
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch address suggestions from backend API (production) or direct API (dev)
  const fetchSuggestions = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      const isDev = import.meta.env.DEV;

      if (isDev) {
        // Local development: Call Geoapify directly
        const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

        if (!apiKey) {
          console.warn('VITE_GEOAPIFY_API_KEY not set for local development');
          setSuggestions([]);
          setIsLoading(false);
          return;
        }

        const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
        url.searchParams.set('text', text);
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('filter', 'countrycode:za');
        url.searchParams.set('limit', '5');
        url.searchParams.set('type', 'amenity');
        url.searchParams.set('lang', 'en');

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Geoapify API error');
        }

        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      } else {
        // Production: Use serverless function
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error fetching address suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;
    onChange(newValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer (500ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const addressData: AddressData = {
      formatted: suggestion.properties.formatted,
      lat: suggestion.properties.lat,
      lon: suggestion.properties.lon,
      city: suggestion.properties.city,
      country: suggestion.properties.country,
      postcode: suggestion.properties.postcode,
    };

    onChange(addressData.formatted, addressData);
    setSuggestions([]);
    setShowSuggestions(false);
    validateAddress(addressData.formatted);
  };

  // Validate address
  const validateAddress = (address: string) => {
    let validationError = "";
    let valid = true;

    if (required && !address.trim()) {
      validationError = "Address is required";
      valid = false;
    } else if (address.trim() && address.trim().length < 10) {
      validationError = "Address must be at least 10 characters";
      valid = false;
    } else if (address.trim().length > 500) {
      validationError = "Address must not exceed 500 characters";
      valid = false;
    }

    setError(validationError);
    setIsValid(valid && address.trim().length > 0);

    if (onValidationChange) {
      onValidationChange(valid, validationError);
    }

    return valid;
  };

  // Handle blur
  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setTouched(true);
      validateAddress(value);
      setShowSuggestions(false);
    }, 200);
  };

  // Handle focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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

  return (
    <div className={className}>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={getInputClasses()}
          placeholder={placeholder}
          value={value}
          onInput={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoComplete="off"
        />

        {isLoading && (
          <div className="absolute right-3 top-2.5 pointer-events-none">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-brand rounded-full animate-spin"></div>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-brand-light transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="font-medium">{suggestion.properties.formatted}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {touched && error && (
        <p className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {!error && !isValid && (
        <p className="mt-1.5 text-sm text-gray-500">
          Start typing to see address suggestions
        </p>
      )}
    </div>
  );
}
