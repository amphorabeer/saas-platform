import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - GeoGuide',
  description: 'GeoGuide Privacy Policy',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-4">Last updated: February 1, 2026</p>

        <div className="bg-amber-50 rounded-xl p-4 mb-8 text-gray-700 text-sm">
          <p className="font-medium text-gray-900">შპს GeoGuide, საიდენტიფიკაციო კოდი: 401956594</p>
          <p>მისამართი: შორეთის ქ 21, ასპინძა</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Introduction</h2>
            <p>
              GeoGuide (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides audio guide services 
              for museums and historical sites in Georgia. This Privacy Policy explains how we collect, 
              use, and protect your information when you use our mobile application and related services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Information We Collect</h2>
            <p>We collect minimal information necessary to provide our services:</p>
            <p>
              <strong>Device Information:</strong> A unique device identifier is generated to manage 
              your tour access and activation codes. We also collect your device platform (iOS, Android, Web) 
              for compatibility purposes.
            </p>
            <p>
              <strong>Usage Data:</strong> We may collect anonymous usage data such as which tours are 
              played and audio playback events to improve our services.
            </p>
            <p>
              <strong>Payment Information:</strong> If you purchase tour access through our app, 
              payment processing is handled by TBC Bank. We do not store your credit card or banking details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <p>
              Provide and maintain tour access through activation codes and entitlements. 
              Improve our audio guides and user experience. 
              Process payments for paid tours. 
              Provide customer support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely on cloud servers. We implement appropriate technical and 
              organizational measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Third-Party Services</h2>
            <p>
              Our app may use third-party services for payment processing (TBC Bank) and cloud 
              storage (Cloudflare, Vercel). These services have their own privacy policies governing 
              how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Offline Data</h2>
            <p>
              When you download tours for offline use, audio files and tour data are stored locally 
              on your device. This data remains on your device and is not transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Your Rights</h2>
            <p>
              You have the right to request access to, correction of, or deletion of your personal 
              data. You can contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p>Email: <a href="mailto:info@geoguide.ge" className="text-amber-600 hover:underline">info@geoguide.ge</a></p>
            <p>Phone: <a href="tel:+995599946500" className="text-amber-600 hover:underline">+995599946500</a></p>
            <p>Address: შორეთის ქ 21, ასპინძა</p>
          </section>
        </div>
      </div>
    </div>
  );
}