import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support - GeoGuide',
  description: 'GeoGuide Support and Help Center',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support / დახმარება</h1>
        <p className="text-sm text-gray-500 mb-8">GeoGuide Help Center</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          
          {/* Contact Section */}
          <section className="bg-amber-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📧 Contact Us / დაგვიკავშირდით</h2>
            <p className="mb-4">
              If you have any questions, issues, or feedback, please contact us:
            </p>
            <p className="mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:info@geoguide.ge" className="text-amber-600 hover:underline">
                info@geoguide.ge
              </a>
            </p>
            <p className="mb-2">
              <strong>Phone:</strong>{' '}
              <a href="tel:+995599946500" className="text-amber-600 hover:underline">
                +995599946500
              </a>
            </p>
            <p className="mb-2">
              <strong>Address:</strong> შორეთის ქ 21, ასპინძა
            </p>
            <p>
              <strong>Response time:</strong> Within 24-48 hours
            </p>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">❓ Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">How do I activate a tour?</h3>
                <p className="text-gray-600 mt-1">
                  Enter your activation code on the museum page, or purchase access directly through the app using bank card payment.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">Can I use the app offline?</h3>
                <p className="text-gray-600 mt-1">
                  Yes! After activating a tour, you can download it for offline use. The downloaded content will be available without internet connection.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">Which languages are supported?</h3>
                <p className="text-gray-600 mt-1">
                  GeoGuide supports Georgian, English, Russian, and Ukrainian languages depending on the tour.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">How does QR scanning work?</h3>
                <p className="text-gray-600 mt-1">
                  At participating museums, you can scan QR codes placed at exhibits to automatically navigate to the corresponding audio guide.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">I have a problem with my purchase</h3>
                <p className="text-gray-600 mt-1">
                  Please contact us at info@geoguide.ge with your device ID and purchase details. We will resolve the issue within 24 hours.
                </p>
              </div>

              <div className="pb-4">
                <h3 className="font-medium text-gray-900">How do I find my Device ID?</h3>
                <p className="text-gray-600 mt-1">
                  Your Device ID is shown at the bottom of the Settings page in the app. It starts with &quot;DEV-&quot;.
                </p>
              </div>
            </div>
          </section>

          {/* App Info */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📱 App Information</h2>
            <p className="mb-2"><strong>App Name:</strong> GeoGuide - Audio Museum Guide</p>
            <p className="mb-2"><strong>Developer:</strong> შპს GeoGuide</p>
            <p className="mb-2"><strong>Version:</strong> 1.0</p>
            <p>
              <strong>Privacy Policy:</strong>{' '}
              <Link href="/privacy" className="text-amber-600 hover:underline">
                View Privacy Policy
              </Link>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}