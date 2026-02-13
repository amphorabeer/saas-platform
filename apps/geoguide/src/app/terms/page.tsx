import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - GeoGuide | მომსახურების პირობები',
  description: 'GeoGuide Terms of Service - მომსახურების პირობები',
};

const companyInfo = {
  name: 'შპს GeoGuide (LLC GeoGuide)',
  taxId: '401956594',
  address: 'შორეთის ქ 21, ასპინძა',
  email: 'info@geoguide.ge',
  phone: '+995599946500',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Terms of Service / მომსახურების პირობები
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 13, 2026</p>

        {/* Company identification - top */}
        <div className="bg-amber-50 rounded-xl p-4 mb-8 text-gray-700">
          <p className="font-medium text-gray-900 mb-1">
            {companyInfo.name} / {companyInfo.name}
          </p>
          <p className="text-sm">
            საიდენტიფიკაციო კოდი / Tax ID: {companyInfo.taxId}
          </p>
          <p className="text-sm">
            მისამართი / Address: {companyInfo.address}
          </p>
          <p className="text-sm">
            Email: <a href={`mailto:${companyInfo.email}`} className="text-amber-600 hover:underline">{companyInfo.email}</a>
          </p>
          <p className="text-sm">
            ტელეფონი / Phone: <a href={`tel:${companyInfo.phone}`} className="text-amber-600 hover:underline">{companyInfo.phone}</a>
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              1. Company Identification / კომპანიის იდენტიფიკაცია
            </h2>
            <p>
              <strong>EN:</strong> The service is provided by {companyInfo.name}, Tax ID {companyInfo.taxId}, 
              registered at {companyInfo.address}.
            </p>
            <p>
              <strong>KA:</strong> მომსახურებას უწევს {companyInfo.name}, საიდენტიფიკაციო კოდი {companyInfo.taxId}, 
              რეგისტრირებული მისამართი: {companyInfo.address}.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              2. Service Description / მომსახურების აღწერა
            </h2>
            <p>
              <strong>EN:</strong> GeoGuide provides audio guide services for museums and cultural sites. 
              Users can purchase or activate access to audio tours and listen to them via the GeoGuide app or website.
            </p>
            <p>
              <strong>KA:</strong> GeoGuide უზრუნველყოფს აუდიო გიდის მომსახურებას მუზეუმებისა და კულტურული ობიექტებისთვის. 
              მომხმარებლებს შეუძლიათ შეიძინონ ან აქტივირება გაუკეთონ აუდიო ტურებზე წვდომას GeoGuide აპლიკაციის ან ვებსაიტის მეშვეობით.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              3. Product Delivery / პროდუქტის მიწოდება
            </h2>
            <p>
              <strong>EN:</strong> Our product is digital. After successful payment or activation code redemption, 
              you receive instant access to the tour. Content is accessible via geoguide.ge (website and app). 
              No physical delivery is made.
            </p>
            <p>
              <strong>KA:</strong> ჩვენი პროდუქტი ციფრულია. გადახდის ან აქტივაციის კოდის გამოყენების შემდეგ 
              თქვენ იღებთ ტურზე მყისიერ წვდომას. კონტენტი ხელმისაწვდომია geoguide.ge-ის მეშვეობით (ვებსაიტი და აპლიკაცია). 
              ფიზიკური მიწოდება არ ხორციელდება.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              4. Refund Policy / დაბრუნების პოლიტიკა
            </h2>
            <p>
              <strong>EN:</strong> Because the product is digital and access is granted immediately, refunds are 
              generally not available after the tour has been accessed. Refunds may be considered within 24 hours 
              of purchase if the tour was not accessed. To request a refund, contact us at{' '}
              <a href={`mailto:${companyInfo.email}`} className="text-amber-600 hover:underline">{companyInfo.email}</a> 
              {' '}with your purchase details.
            </p>
            <p>
              <strong>KA:</strong> ვინაიდან პროდუქტი ციფრულია და წვდომა მყისიერად იხსნება, ტურის გამოყენების შემდეგ 
              დაბრუნება ზოგადად არ ხდება. დაბრუნება შეიძლება განიხილებოდეს შეძენიდან 24 საათის განმავლობაში, 
              თუ ტური არ იყო გამოყენებული. დაბრუნების მოთხოვნისთვის დაგვიკავშირდით{' '}
              <a href={`mailto:${companyInfo.email}`} className="text-amber-600 hover:underline">{companyInfo.email}</a> 
              {' '}შეძენის დეტალებით.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              5. Payment Methods / გადახდის მეთოდები
            </h2>
            <p>
              <strong>EN:</strong> Payments are accepted by Visa and Mastercard through secure bank processing. 
              We do not store your card details; all payment data is handled by the payment provider.
            </p>
            <p>
              <strong>KA:</strong> გადახდა მიღებულია Visa და Mastercard ბარათებით უსაფრთხო საბანკო დამუშავების მეშვეობით. 
              ჩვენ არ ვინახავთ თქვენი ბარათის მონაცემებს; გადახდის მონაცემებს ამუშავებს გადახდის მომწოდებელი.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              6. Access Duration / წვდომის ვადა
            </h2>
            <p>
              <strong>EN:</strong> Access to each tour is valid for a specified period, which depends on the tour 
              (typically 30 days or 365 days). The exact validity is shown at the time of purchase or activation.
            </p>
            <p>
              <strong>KA:</strong> ტურზე წვდომის ვადა განისაზღვრება თითოეული ტურის მიხედვით 
              (ჩვეულებრივ 30 ან 365 დღე). ზუსტი ვადა ნაჩვენებია შეძენის ან აქტივაციის მომენტში.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              7. Activation Codes / აქტივაციის კოდები
            </h2>
            <p>
              <strong>EN:</strong> Activation codes are for one-time use and are tied to one device. 
              Once a code is used on a device, it cannot be transferred or used on another device.
            </p>
            <p>
              <strong>KA:</strong> აქტივაციის კოდები განკუთვნილია ერთჯერადი გამოყენებისთვის და მიბმულია ერთ მოწყობილობაზე. 
              კოდის მოწყობილობაზე გამოყენების შემდეგ მისი გადატანა ან სხვა მოწყობილობაზე გამოყენება შეუძლებელია.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              8. Contact Information / საკონტაქტო ინფორმაცია
            </h2>
            <p>
              <strong>EN:</strong> For questions about these terms, refunds, or the service, contact us:
            </p>
            <p>
              <strong>KA:</strong> ამ პირობებთან, დაბრუნებასთან ან მომსახურებასთან დაკავშირებული შეკითხვებისთვის დაგვიკავშირდით:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email: <a href={`mailto:${companyInfo.email}`} className="text-amber-600 hover:underline">{companyInfo.email}</a></li>
              <li>Phone / ტელეფონი: <a href={`tel:${companyInfo.phone}`} className="text-amber-600 hover:underline">{companyInfo.phone}</a></li>
              <li>Address / მისამართი: {companyInfo.address}</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t text-sm text-gray-500">
          <Link href="/privacy" className="text-amber-600 hover:underline mr-4">Privacy Policy</Link>
          <Link href="/support" className="text-amber-600 hover:underline">Support</Link>
        </div>
      </div>
    </div>
  );
}
