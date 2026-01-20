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
      from: `"BrewMaster PRO" <${process.env.GMAIL_USER}>`,
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

export function generatePasswordResetEmail(resetUrl: string, userName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d97706;">BrewMaster PRO</h2>
      <p>გამარჯობა ${userName},</p>
      <p>თქვენ მოითხოვეთ პაროლის აღდგენა.</p>
      <p>დააჭირეთ ქვემოთ მოცემულ ღილაკს პაროლის შესაცვლელად:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">პაროლის აღდგენა</a>
      <p style="color: #666; font-size: 14px;">ეს ბმული მოქმედებს 1 საათის განმავლობაში.</p>
      <p style="color: #666; font-size: 14px;">თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უგულებელყოთ ეს წერილი.</p>
    </div>
  `
}

export function generateWelcomeEmail(tenantCode: string, userName: string, email: string, password?: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d97706;">მოგესალმებით BrewMaster PRO-ში! 🍺</h2>
      <p>გამარჯობა ${userName},</p>
      <p>თქვენი რეგისტრაცია წარმატებით დასრულდა!</p>
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">თქვენი შესვლის მონაცემები:</h3>
        <p style="margin: 5px 0;"><strong>კომპანიის კოდი:</strong> ${tenantCode}</p>
        <p style="margin: 5px 0;"><strong>ელ-ფოსტა:</strong> ${email}</p>
        ${password ? `<p style="margin: 5px 0;"><strong>პაროლი:</strong> ${password}</p>
        <p style="color: #dc2626; font-size: 12px;">⚠️ უსაფრთხოების მიზნით, გთხოვთ შეცვალოთ პაროლი შესვლის შემდეგ!</p>` : ''}
      </div>
      <p>შესვლისთვის გამოიყენეთ: <a href="https://brewery.geobiz.app/login">brewery.geobiz.app/login</a></p>
      <p style="color: #666; font-size: 14px;">გმადლობთ რომ აირჩიეთ BrewMaster PRO!</p>
    </div>
  `
}
