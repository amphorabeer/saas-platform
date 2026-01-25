import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Hotel PMS',
  description: 'Privacy Policy for Hotel Property Management System'
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
          <p className="text-gray-700 mb-4">
            This Privacy Policy describes how our Hotel Property Management System ("we", "our", or "us") 
            collects, uses, and shares information when you use our Facebook Messenger bot service.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
          <p className="text-gray-700 mb-4">When you interact with our Messenger bot, we may collect:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Your Facebook user ID (for responding to your messages)</li>
            <li>Messages you send to our bot</li>
            <li>Booking information you provide (name, phone number, dates)</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">We use the collected information to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Respond to your inquiries</li>
            <li>Process hotel reservations</li>
            <li>Provide customer support</li>
            <li>Improve our services</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. Information Sharing</h2>
          <p className="text-gray-700 mb-4">
            We do not sell or rent your personal information to third parties. 
            We may share your information only with the hotel property you are booking with.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Retention</h2>
          <p className="text-gray-700 mb-4">
            We retain your booking information for as long as necessary to fulfill the purposes 
            outlined in this policy, unless a longer retention period is required by law.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. Your Rights</h2>
          <p className="text-gray-700 mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request deletion of your personal data</li>
            <li>Opt-out of our services at any time</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">7. Security</h2>
          <p className="text-gray-700 mb-4">
            We implement appropriate technical and organizational measures to protect 
            your personal information against unauthorized access, alteration, or destruction.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">8. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy, please contact us through 
            our Facebook Page or email us at privacy@example.com.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of 
            any changes by posting the new Privacy Policy on this page.
          </p>
        </div>
        
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-gray-500">
            © 2026 Hotel Property Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}