import { useState, useEffect } from 'preact/hooks'
import { ArrowLeft, MapPin, Clock, User, Package, AlertTriangle, CheckCircle } from 'lucide-preact'
import { tripsService } from '../services/trips'
import { OTPGenerator } from '../components/OTPGenerator'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { format } from 'date-fns'

interface DeliveryScreenProps {
  trip: {
    id: string;
    client_name: string;
    client_email?: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    scheduled_pickup: string;
    scheduled_delivery: string;
    special_instructions?: string;
    priority?: string;
    requires_signature?: boolean;
  };
  onBack: () => void;
}

export function DeliveryScreen({ trip, onBack }: DeliveryScreenProps) {
  const [deliveryStep, setDeliveryStep] = useState<'travel' | 'otp' | 'complete'>('travel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Determine initial step based on trip status
  useEffect(() => {
    if (trip.status === 'delivered') {
      setDeliveryStep('complete')
    } else if (trip.status === 'in_transit') {
      setDeliveryStep('travel')
    }
  }, [trip.status])

  const handleArrivedAtDelivery = () => {
    setDeliveryStep('otp')
  }

  const handleOTPVerified = async () => {
    setLoading(true)
    setError('')

    try {
      // Complete the trip
      const result = await tripsService.completeTrip(trip.id)
      
      if (result.success) {
        setDeliveryStep('complete')
      } else {
        setError(result.error || 'Failed to complete delivery')
      }
    } catch (err) {
      setError('Failed to complete delivery')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'normal':
        return 'text-blue-600 bg-blue-100'
      case 'low':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Secure Delivery</h1>
              <p className="text-sm text-gray-500">
                {trip.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="bg-white border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{trip.client_name}</h2>
                {trip.client_email && (
                  <p className="text-sm text-gray-500">{trip.client_email}</p>
                )}
              </div>
            </div>
            {trip.priority && trip.priority !== 'normal' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(trip.priority)}`}>
                {trip.priority.toUpperCase()}
              </span>
            )}
          </div>

          {/* Delivery Address */}
          <div className="flex items-start space-x-3 mb-4">
            <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Delivery Address</p>
              <p className="text-gray-600">{trip.delivery_address}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Scheduled: {format(new Date(trip.scheduled_delivery), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {trip.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                Security Instructions:
              </p>
              <p className="text-sm text-yellow-700">{trip.special_instructions}</p>
            </div>
          )}
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

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Step 1: Travel to Delivery */}
        {deliveryStep === 'travel' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                En Route to Delivery
              </h3>
              <p className="text-gray-600 mb-4">
                Proceed to the delivery location. When you arrive, tap the button below to begin the secure handoff process.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Safety Reminders:</strong><br>
                  • Follow all traffic laws and safety protocols<br>
                  • Keep the Guardian Safe secure during transport<br>
                  • Contact dispatch if any issues arise
                </p>
              </div>

              <button
                onClick={handleArrivedAtDelivery}
                className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                I've Arrived at Delivery Location
              </button>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-medium text-gray-900 mb-3">Delivery Requirements</h4>
              <div className="space-y-2 text-sm">
                {trip.requires_signature && (
                  <div className="flex items-center space-x-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Signature required upon delivery</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Recipient must provide 6-digit unlock code</span>
                </div>
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verify recipient identity if requested</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: OTP Process */}
        {deliveryStep === 'otp' && (
          <OTPGenerator
            trip={trip}
            onOTPVerified={handleOTPVerified}
            onCancel={() => setDeliveryStep('travel')}
          />
        )}

        {/* Step 3: Delivery Complete */}
        {deliveryStep === 'complete' && (
          <div className="text-center space-y-6">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Delivery Complete! 🎉
              </h3>
              <p className="text-green-700 mb-6">
                Safe has been successfully unlocked and delivery confirmed.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
                <h4 className="font-medium text-green-800 mb-2">Delivery Summary:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>✅ Location verified</p>
                  <p>✅ OTP authenticated</p>
                  <p>✅ Safe unlocked successfully</p>
                  <p>✅ Delivery confirmed</p>
                  <p>🕐 Completed: {format(new Date(), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onBack}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Return to Dashboard
                </button>
                
                <p className="text-sm text-gray-500">
                  The dashboard has been automatically updated with the delivery confirmation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}