const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    await transporter.sendMail({
      from: `"GeoBiz Platform" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export function generateHotelWelcomeEmail(
  hotelCode: string,
  hotelName: string,
  email: string,
  password: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">მოგესალმებით GeoBiz Hotel-ში! 🏨</h2>
      <p>გამარჯობა,</p>
      <p>თქვენი სასტუმროს <strong>${hotelName}</strong> რეგისტრაცია წარმატებით დასრულდა!</p>
      
      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">თქვენი შესვლის მონაცემები:</h3>
        <p style="margin: 5px 0;"><strong>სასტუმროს კოდი:</strong> ${hotelCode}</p>
        <p style="margin: 5px 0;"><strong>ელ-ფოსტა:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>პაროლი:</strong> ${password}</p>
        <p style="color: #dc2626; font-size: 12px; margin-top: 10px;">⚠️ უსაფრთხოების მიზნით, გთხოვთ შეცვალოთ პაროლი შესვლის შემდეგ!</p>
      </div>
      
      <p>შესვლისთვის გამოიყენეთ: <a href="https://saas-hotel.vercel.app/login" style="color: #2563eb;">saas-hotel.vercel.app/login</a></p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">გმადლობთ რომ აირჩიეთ GeoBiz Platform!</p>
    </div>
  `
}

export function generateStoreWelcomeEmail(
  storeCode: string,
  storeName: string,
  email: string,
  password: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309;">მოგესალმებით GeoBiz Store-ში! 🏪</h2>
      <p>გამარჯობა,</p>
      <p>თქვენი მაღაზიის <strong>${storeName}</strong> რეგისტრაცია წარმატებით დასრულდა!</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">თქვენი შესვლის მონაცემები:</h3>
        <p style="margin: 5px 0;"><strong>მაღაზიის კოდი:</strong> ${storeCode}</p>
        <p style="margin: 5px 0;"><strong>ელ-ფოსტა:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>პაროლი:</strong> ${password}</p>
        <p style="color: #dc2626; font-size: 12px; margin-top: 10px;">⚠️ უსაფრთხოების მიზნით, გთხოვთ შეცვალოთ პაროლი შესვლის შემდეგ!</p>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">გმადლობთ რომ აირჩიეთ GeoBiz Platform!</p>
    </div>
  `
}

export function generateHotelPasswordResetEmail(resetUrl: string, hotelName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">GeoBiz Hotel</h2>
      <p>გამარჯობა,</p>
      <p>თქვენ მოითხოვეთ პაროლის აღდგენა სასტუმროსთვის <strong>${hotelName}</strong>.</p>
      <p>დააჭირეთ ქვემოთ მოცემულ ღილაკს პაროლის შესაცვლელად:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">პაროლის აღდგენა</a>
      <p style="color: #666; font-size: 14px;">ეს ბმული მოქმედებს 1 საათის განმავლობაში.</p>
      <p style="color: #666; font-size: 14px;">თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უგულებელყოთ ეს წერილი.</p>
    </div>
  `
}
