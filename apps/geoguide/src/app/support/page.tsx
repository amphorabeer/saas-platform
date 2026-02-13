import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support - GeoGuide | დახმარება',
  description: 'GeoGuide Support and Help Center',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-6">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          მთავარი გვერდი / Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">დახმარება / Support</h1>
        <p className="text-sm text-gray-500 mb-8">GeoGuide Help Center</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          
          {/* Contact Section - Bilingual */}
          <section className="bg-amber-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📧 დაგვიკავშირდით / Contact Us</h2>
            <p className="mb-4">
              <span className="text-gray-600">თუ გაქვთ შეკითხვები, პრობლემა ან შეგრძელება — დაგვიკავშირდით.</span>
              <br />
              <span className="text-gray-600">If you have any questions, issues, or feedback, please contact us:</span>
            </p>
            <p className="mb-2">
              <strong>ელ-ფოსტა / Email:</strong>{' '}
              <a href="mailto:info@geoguide.ge" className="text-amber-600 hover:underline">
                info@geoguide.ge
              </a>
            </p>
            <p className="mb-2">
              <strong>ტელეფონი / Phone:</strong>{' '}
              <a href="tel:+995599946500" className="text-amber-600 hover:underline">
                +995599946500
              </a>
            </p>
            <p className="mb-2">
              <strong>მისამართი / Address:</strong> შორეთის ქ 21, ასპინძა
            </p>
            <p>
              <strong>პასუხის ვადა / Response time:</strong> 24–48 საათის განმავლობაში / Within 24–48 hours
            </p>
          </section>

          {/* FAQ Section - Bilingual */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">❓ ხშირად დასმული შეკითხვები / Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">როგორ გავააქტიურო ტური? / How do I activate a tour?</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> აქტივაციის კოდი შეიყვანეთ მუზეუმის გვერდზე, ან შეიძინეთ წვდომა უშუალოდ აპლიკაციის მეშვეობით საბანკო ბარათით.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> Enter your activation code on the museum page, or purchase access directly through the app using bank card payment.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">შემიძლია აპის ოფლაინ გამოყენება? / Can I use the app offline?</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> დიახ! ტურის აქტივაციის შემდეგ შეგიძლიათ ჩამოტვირთოთ იგი ოფლაინ გამოყენებისთვის. ჩამოტვირთული კონტენტი იქნება ხელმისაწვდომი ინტერნეტის გარეშე.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> Yes! After activating a tour, you can download it for offline use. The downloaded content will be available without internet connection.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">რა ენებია ხელმისაწვდომი? / Which languages are supported?</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> GeoGuide მხარდაჭერას უწევს ქართულ, ინგლისურ, რუსულ და უკრაინულ ენებს ტურის მიხედვით.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> GeoGuide supports Georgian, English, Russian, and Ukrainian languages depending on the tour.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">როგორ მუშაობს QR სკანირება? / How does QR scanning work?</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> მონაწილე მუზეუმებში შეგიძლიათ ექსპონატებთან განთავსებული QR კოდების სკანირება, რათა ავტომატურად გადახვიდეთ შესაბამის აუდიო გიდზე.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> At participating museums, you can scan QR codes placed at exhibits to automatically navigate to the corresponding audio guide.
                </p>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-900">პრობლემა მაქვს შეძენასთან / I have a problem with my purchase</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> დაგვიკავშირდით info@geoguide.ge-ზე თქვენი მოწყობილობის ID-ით და შეძენის დეტალებით. პრობლემას 24 საათის განმავლობაში მოვაგვარებთ.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> Please contact us at info@geoguide.ge with your device ID and purchase details. We will resolve the issue within 24 hours.
                </p>
              </div>

              <div className="pb-4">
                <h3 className="font-medium text-gray-900">როგორ ვიპოვო მოწყობილობის ID? / How do I find my Device ID?</h3>
                <p className="text-gray-600 mt-1">
                  <strong>KA:</strong> მოწყობილობის ID ნაჩვენებია აპლიკაციის პარამეტრების გვერდის ბოლოში. იგი იწყება &quot;DEV-&quot;-ით.
                </p>
                <p className="text-gray-600 mt-1">
                  <strong>EN:</strong> Your Device ID is shown at the bottom of the Settings page in the app. It starts with &quot;DEV-&quot;.
                </p>
              </div>
            </div>
          </section>

          {/* App Info - Bilingual */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📱 აპლიკაციის ინფორმაცია / App Information</h2>
            <p className="mb-2"><strong>აპლიკაციის სახელი / App Name:</strong> GeoGuide - Audio Museum Guide</p>
            <p className="mb-2"><strong>დეველოპერი / Developer:</strong> შპს GeoGuide</p>
            <p className="mb-2"><strong>ვერსია / Version:</strong> 1.0</p>
            <p>
              <strong>კონფიდენციალურობის პოლიტიკა / Privacy Policy:</strong>{' '}
              <Link href="/privacy" className="text-amber-600 hover:underline">
                View Privacy Policy / პოლიტიკის ნახვა
              </Link>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
