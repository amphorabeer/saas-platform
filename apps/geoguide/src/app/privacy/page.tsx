import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - GeoGuide | კონფიდენციალურობის პოლიტიკა',
  description: 'GeoGuide Privacy Policy - კონფიდენციალურობის პოლიტიკა',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-6">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          მთავარი გვერდი / Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          კონფიდენციალურობის პოლიტიკა / Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-4">Last updated: February 1, 2026</p>

        <div className="bg-amber-50 rounded-xl p-4 mb-8 text-gray-700 text-sm space-y-1">
          <p className="font-medium text-gray-900">შპს GeoGuide | საიდენტიფიკაციო კოდი: 401956594</p>
          <p className="font-medium text-gray-900">LLC GeoGuide | Tax ID: 401956594</p>
          <p>მისამართი / Address: შორეთის ქ 21, ასპინძა</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. შესავალი / Introduction</h2>
            <p>
              <strong>KA:</strong> GeoGuide (&quot;ჩვენ&quot;) უზრუნველყოფს აუდიო გიდის მომსახურებას საქართველოს მუზეუმებისა და ისტორიული ობიექტებისთვის. ეს კონფიდენციალურობის პოლიტიკა აღწერს როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ თქვენს ინფორმაციას ჩვენი მობილური აპლიკაციის და დაკავშირებული სერვისების გამოყენებისას.
            </p>
            <p>
              <strong>EN:</strong> GeoGuide (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides audio guide services 
              for museums and historical sites in Georgia. This Privacy Policy explains how we collect, 
              use, and protect your information when you use our mobile application and related services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. რა ინფორმაციას ვაგროვებთ / Information We Collect</h2>
            <p>
              <strong>KA:</strong> ვაგროვებთ მინიმალურ ინფორმაციას, რომელიც აუცილებელია ჩვენი მომსახურების მისაწვდომად: <strong>მოწყობილობის ინფორმაცია:</strong> უნიკალური მოწყობილობის იდენტიფიკატორი იქმნება ტურზე წვდომისა და აქტივაციის კოდების სამართავად. ასევე ვაგროვებთ თქვენი მოწყობილობის პლატფორმას (iOS, Android, Web) თავსებადობის მიზნით. <strong>გამოყენების მონაცემები:</strong> შეიძლება ვაგროვებდეთ ანონიმურ გამოყენების მონაცემებს (მაგ. რომელი ტურები იკვლევა, აუდიო ჩართვის მოვლენები) სერვისების გასაუმჯობესებლად. <strong>გადახდის ინფორმაცია:</strong> თუ ტურზე წვდომას ყიდულობთ აპლიკაციის მეშვეობით, გადახდის დამუშავებას ახორციელებს TBC Bank. ჩვენ არ ვინახავთ თქვენი საკრედიტო ბარათის ან საბანკო მონაცემებს.
            </p>
            <p>
              <strong>EN:</strong> We collect minimal information necessary to provide our services: <strong>Device Information:</strong> A unique device identifier is generated to manage your tour access and activation codes. We also collect your device platform (iOS, Android, Web) for compatibility purposes. <strong>Usage Data:</strong> We may collect anonymous usage data such as which tours are played and audio playback events to improve our services. <strong>Payment Information:</strong> If you purchase tour access through our app, payment processing is handled by TBC Bank. We do not store your credit card or banking details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. როგორ ვიყენებთ ინფორმაციას / How We Use Your Information</h2>
            <p>
              <strong>KA:</strong> შეგროვებულ ინფორმაციას ვიყენებთ: ტურზე წვდომის უზრუნველსაყოფად აქტივაციის კოდებისა და უფლებების მეშვეობით; აუდიო გიდებისა და მომხმარებლის გამოცდილების გასაუმჯობესებლად; ფასიანი ტურების გადახდის დასამუშავებლად; მომხმარებლის მხარდაჭერის მისაწვდომად.
            </p>
            <p>
              <strong>EN:</strong> We use collected information to: provide and maintain tour access through activation codes and entitlements; improve our audio guides and user experience; process payments for paid tours; provide customer support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. მონაცემთა შენახვა და უსაფრთხოება / Data Storage and Security</h2>
            <p>
              <strong>KA:</strong> თქვენი მონაცემები ინახება უსაფრთხოდ ღრუბლოვან სერვერებზე. ვიყენებთ შესაბამის ტექნიკურ და ორგანიზაციულ ზომებს პირადი ინფორმაციის დაუკანონებელი წვდომის, ცვლილების, გამჟღავნების ან განადგურებისგან დასაცავად.
            </p>
            <p>
              <strong>EN:</strong> Your data is stored securely on cloud servers. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. მესამე მხარის სერვისები / Third-Party Services</h2>
            <p>
              <strong>KA:</strong> ჩვენი აპლიკაცია შეიძლება იყენებდეს მესამე მხარის სერვისებს გადახდის დამუშავებისთვის (TBC Bank) და ღრუბლოვანი შენახვისთვის (Cloudflare, Vercel). ამ სერვისებს აქვთ საკუთარი კონფიდენციალურობის პოლიტიკა იმის შესახებ, თუ როგორ მუშაობენ თქვენს მონაცემებთან.
            </p>
            <p>
              <strong>EN:</strong> Our app may use third-party services for payment processing (TBC Bank) and cloud storage (Cloudflare, Vercel). These services have their own privacy policies governing how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. ოფლაინ მონაცემები / Offline Data</h2>
            <p>
              <strong>KA:</strong> როდესაც ტურებს ჩამოტვირთავთ ოფლაინ გამოყენებისთვის, აუდიო ფაილები და ტურის მონაცემები ინახება ლოკალურად თქვენს მოწყობილობაზე. ეს მონაცემები რჩება თქვენს მოწყობილობაზე და არ გადაეცემა ჩვენს სერვერებს.
            </p>
            <p>
              <strong>EN:</strong> When you download tours for offline use, audio files and tour data are stored locally on your device. This data remains on your device and is not transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. ბავშვების კონფიდენციალურობა / Children&apos;s Privacy</h2>
            <p>
              <strong>KA:</strong> ჩვენი მომსახურება არ მიმართულია 13 წლის ქვემოთ ასაკის ბავშვების მიმართ. შეგნებულად არ ვაგროვებთ პირად ინფორმაციას 13 წლის ქვემოთ ასაკის ბავშვებისგან.
            </p>
            <p>
              <strong>EN:</strong> Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. თქვენი უფლებები / Your Rights</h2>
            <p>
              <strong>KA:</strong> გაქვთ უფლება მოითხოვოთ თქვენი პირადი მონაცემების წვდომა, შესწორება ან წაშლა. ამ უფლებების გასახორციელებლად შეგიძლიათ დაგვიკავშირდეთ.
            </p>
            <p>
              <strong>EN:</strong> You have the right to request access to, correction of, or deletion of your personal data. You can contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. პოლიტიკის ცვლილებები / Changes to This Policy</h2>
            <p>
              <strong>KA:</strong> შეიძლება დროდადრო განვაახლოთ ეს კონფიდენციალურობის პოლიტიკა. ნებისმიერ ცვლილებაზე გაგიწვევთ ამ გვერდზე ახალი პოლიტიკის გამოქვეყნებით და &quot;ბოლო განახლება&quot; თარიღის განახლებით.
            </p>
            <p>
              <strong>EN:</strong> We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. კონტაქტი / Contact Us</h2>
            <p>
              <strong>KA:</strong> ამ კონფიდენციალურობის პოლიტიკასთან დაკავშირებული რაიმე შეკითხვის შემთხვევაში დაგვიკავშირდით:
            </p>
            <p>
              <strong>EN:</strong> If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p>Email: <a href="mailto:info@geoguide.ge" className="text-amber-600 hover:underline">info@geoguide.ge</a></p>
            <p>Phone / ტელეფონი: <a href="tel:+995599946500" className="text-amber-600 hover:underline">+995599946500</a></p>
            <p>Address / მისამართი: შორეთის ქ 21, ასპინძა</p>
          </section>
        </div>
      </div>
    </div>
  );
}
