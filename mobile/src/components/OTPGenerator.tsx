import { useState, useEffect } from 'preact/hooks'
import { MapPin, Clock, Shield, AlertTriangle, Mail, Smartphone } from 'lucide-preact'
import { geolocationService } from '../services/geolocation'
import { otpService } from '../services/otp'
import { LoadingSpinner } from './LoadingSpinner'

interface OTPGeneratorProps {
  trip: {
    id: string;
    client_name: string;
    client_email?: string;
    delivery_address: string;
    status: string;
  };
  onOTPVerified: () => void;
  onCancel?: () => void;
}

export function OTPGenerator({ trip, onOTPVerified, onCancel }: OTPGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<'location' | 'request' | 'enter' | 'verified'>('location')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpExpires, setOtpExpires] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Get location on component mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Timer for OTP expiration
  useEffect(() => {
    if (otpExpires) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, otpExpires.getTime() - Date.now())
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          setCurrentStep('request')
          setOtpExpires(null)
          setError('OTP expired. Please request a new code.')
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [otpExpires])

  const getCurrentLocation = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await geolocationService.getCurrentPosition()
      
      if (result.success && result.location) {
        setLocation(result.location)
        setCurrentStep('request')
      } else {
        setError(result.error || 'Failed to get location')
      }
    } catch (err) {
      setError('Location access required for delivery')
    } finally {
      setLoading(false)
    }
  }

  const requestOTP = async () => {
    if (!location) {
      setError('Location required to request OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await otpService.requestOTP(trip.id, location)
      
      if (result.success) {
        setCurrentStep('enter')
        if (result.expires_at) {
          setOtpExpires(new Date(result.expires_at))
        }
      } else {
        setError(result.error || 'Failed to request OTP')
      }
    } catch (err) {
      setError('Failed to request OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await otpService.verifyOTP(trip.id, otpCode)
      
      if (result.success) {
        setCurrentStep('verified')
        setTimeout(() => {
          onOTPVerified()
        }, 2000)
      } else {
        setError(result.error || 'Invalid OTP code')
        setOtpCode('')
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleOTPInput = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 6)
    setOtpCode(cleanValue)
    setError('')
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 border-b border-red-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-red-100 rounded-full p-2">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-900">Secure Delivery Unlock</h2>
            <p className="text-sm text-red-700">
              Client: {trip.client_name} {trip.client_email && `(${trip.client_email})`}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="p-6">
        {/* Step 1: Location Check */}
        {currentStep === 'location' && (
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 text-blue-600 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">Getting Your Location</h3>
            <p className="text-gray-600">
              We need to verify you're at the delivery location before requesting the unlock code.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 font-medium mb-2">Delivery Address:</p>
              <p className="text-blue-900">{trip.delivery_address}</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="small" />
                <span className="text-gray-600">Getting location...</span>
              </div>
            ) : (
              <button
                onClick={getCurrentLocation}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Location
              </button>
            )}
          </div>
        )}

        {/* Step 2: Request OTP */}
        {currentStep === 'request' && (
          <div className="text-center space-y-4">
            <Mail className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">Ready to Request Unlock Code</h3>
            <p className="text-gray-600">
              Location verified! Click below to send the unlock code to the recipient.
            </p>

            {location && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-green-800 mb-2">Location Details:</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>📍 Latitude: {location.latitude.toFixed(6)}</p>
                  <p>📍 Longitude: {location.longitude.toFixed(6)}</p>
                  <p>🎯 Accuracy: ±{Math.round(location.accuracy)}m</p>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>What happens next:</strong><br>
                • 6-digit code will be emailed to recipient<br>
                • Code expires in 10 minutes<br>
                • Recipient will provide code to you verbally
              </p>
            </div>

            <div className="flex space-x-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={requestOTP}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Request Unlock Code'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Enter OTP */}
        {currentStep === 'enter' && (
          <div className="text-center space-y-4">
            <Smartphone className="h-12 w-12 text-orange-600 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">Enter Unlock Code</h3>
            <p className="text-gray-600">
              Ask the recipient for the 6-digit code that was emailed to them.
            </p>

            {timeRemaining > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-orange-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Code expires in: {formatTime(timeRemaining)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit Unlock Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-full text-center text-3xl font-mono tracking-widest py-4 px-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="000000"
                  value={otpCode}
                  onInput={(e) => handleOTPInput((e.target as HTMLInputElement).value)}
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setCurrentStep('request')
                    setOtpCode('')
                    setOtpExpires(null)
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Request New Code
                </button>
                <button
                  onClick={verifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="small" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Unlock Safe'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Verified */}
        {currentStep === 'verified' && (
          <div className="text-center space-y-4">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-900">Code Verified! 🎉</h3>
            <p className="text-green-700">
              Sending unlock command to Guardian Safe...
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Location verified<br>
                ✅ Code authenticated<br>
                ✅ Safe unlocking...
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-green-600">
              <LoadingSpinner size="small" />
              <span>Processing unlock...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}