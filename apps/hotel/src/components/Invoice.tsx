'use client'

import { useState, useMemo } from 'react'
import moment from 'moment'
import { ActivityLogger } from '../lib/activityLogger'
import { calculateTaxBreakdown } from '../utils/taxCalculator'
import { hasDisplayableLogo } from '@/lib/logo'

export default function Invoice({ reservation, hotelInfo, onPrint, onEmail }: any) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  
  const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
  const pricePerNight = nights > 0 ? reservation.totalAmount / nights : reservation.totalAmount
  
  // Check if reservation has company data
  const hasCompany = reservation.companyName && reservation.companyName.trim() !== ''
  
  // Generate human-readable invoice number (consistent for same reservation)
  const generateInvoiceNumber = (reservation: any): string => {
    // Priority 1: Use existing invoiceNumber if saved in reservation
    if (reservation.invoiceNumber) {
      return reservation.invoiceNumber
    }
    
    // Priority 2: Check localStorage for saved invoice number
    if (typeof window !== 'undefined') {
      const savedInvoiceNumbers = JSON.parse(localStorage.getItem('invoiceNumbers') || '{}')
      if (savedInvoiceNumbers[reservation.id]) {
        return savedInvoiceNumbers[reservation.id]
      }
      
      // Priority 3: Use folio number (convert F to INV-)
      const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
      const folio = folios.find((f: any) => f.reservationId === reservation.id)
      if (folio?.folioNumber) {
        // Convert F251210-102-abc4 → INV-251210-102-abc4
        const invoiceNum = folio.folioNumber.replace(/^F/, 'INV-')
        // Save for consistency
        savedInvoiceNumbers[reservation.id] = invoiceNum
        localStorage.setItem('invoiceNumbers', JSON.stringify(savedInvoiceNumbers))
        return invoiceNum
      }
      
      // Priority 4: Generate new invoice number
      const date = moment().format('YYMMDD')
      const roomNumber = reservation.roomNumber || reservation.room?.roomNumber || '000'
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
      const invoiceNum = `INV-${date}-${roomNumber}-${randomSuffix}`
      
      // Save for consistency
      savedInvoiceNumbers[reservation.id] = invoiceNum
      localStorage.setItem('invoiceNumbers', JSON.stringify(savedInvoiceNumbers))
      return invoiceNum
    }
    
    // Fallback (server-side or no localStorage)
    const date = moment().format('YYMMDD')
    const roomNumber = reservation.roomNumber || reservation.room?.roomNumber || '000'
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `INV-${date}-${roomNumber}-${randomSuffix}`
  }
  
  // Get invoice number (memoized to keep it consistent)
  const invoiceNumber = useMemo(() => {
    return generateInvoiceNumber(reservation)
  }, [reservation.id, reservation.invoiceNumber, reservation.roomNumber])
  
  // Load ALL charges from folio
  const getInvoiceData = async () => {
    if (typeof window === 'undefined') return null
    
    // Try API first
    let folios: any[] = []
    try {
      const response = await fetch('/api/hotel/folios')
      if (response.ok) {
        const data = await response.json()
        folios = data.folios || []
      }
    } catch (error) {
      console.error('[Invoice] API error:', error)
    }
    
    // Fallback to localStorage
    if (folios.length === 0) {
      folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
    }
    
    const folio = folios.find((f: any) => f.reservationId === reservation.id)
    
    if (!folio) {
      // No folio found, use reservation data as fallback
      return {
        folioNumber: null,
        charges: [{
          description: `ოთახი ${reservation.roomNumber || 'N/A'}`,
          quantity: nights,
          price: pricePerNight,
          amount: reservation.totalAmount || 0
        }],
        payments: [],
        totalCharges: reservation.totalAmount || 0,
        totalPayments: 0,
        balance: reservation.totalAmount || 0
      }
    }
    
    const transactions = folio.transactions || []
    
    // Get charges from transactions (type === 'charge' or debit > 0)
    const charges = transactions.filter((t: any) => 
      t.type === 'charge' || (t.debit && t.debit > 0)
    ).map((t: any) => ({
      description: t.description || 'Charge',
      quantity: 1,
      price: t.amount || t.debit || 0,
      amount: t.amount || t.debit || 0
    }))
    
    // If no charges found, add room charge as default
    if (charges.length === 0) {
      charges.push({
        description: `ოთახი ${reservation.roomNumber || 'N/A'}`,
        quantity: nights,
        price: pricePerNight,
        amount: reservation.totalAmount || 0
      })
    }
    
    // Get payments from transactions (type === 'payment' or credit > 0)
    const payments = transactions.filter((t: any) => 
      t.type === 'payment' || t.type === 'refund' || (t.credit && t.credit > 0)
    ).map((t: any) => ({
      description: t.description || 'Payment',
      amount: t.amount || t.credit || 0,
      method: t.paymentMethod || t.method || 'cash'
    }))
    
    // Calculate totals
    const totalCharges = charges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
    const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const balance = totalCharges - totalPayments
    
    return {
      folioNumber: folio.folioNumber,
      charges,
      payments,
      totalCharges,
      totalPayments,
      balance
    }
  }
  
  const invoiceData = getInvoiceData()
  
  const generateInvoiceHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ინვოისი #${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DejaVu Sans', Arial, sans-serif; padding: 40px; font-size: 13px; color: #333; max-width: 100%; }
          .invoice-container { max-width: 700px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 2px solid #2563eb; margin-bottom: 15px; }
          .logo { max-width: 100px; }
          .company-info { text-align: right; max-width: 250px; }
          .company-info h2 { color: #2563eb; margin-bottom: 5px; font-size: 16px; word-wrap: break-word; }
          .company-info p { color: #666; font-size: 11px; line-height: 1.5; }
          .invoice-title { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 12px 15px; border-radius: 6px; margin-bottom: 15px; }
          .invoice-title h1 { font-size: 20px; margin-bottom: 3px; }
          .invoice-title p { opacity: 0.9; font-size: 12px; }
          .two-columns { display: flex; gap: 15px; margin-bottom: 15px; }
          .column { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; }
          .column h3 { color: #1e40af; font-size: 13px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
          .column p { font-size: 12px; margin: 4px 0; word-wrap: break-word; }
          .column .label { color: #64748b; }
          .column .value { font-weight: 500; }
          .company-section { background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #f59e0b; }
          .company-section h4 { color: #92400e; margin-bottom: 8px; font-size: 13px; }
          .company-section p { font-size: 11px; margin: 3px 0; word-wrap: break-word; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #1e40af; color: white; padding: 10px 8px; text-align: left; font-size: 11px; }
          th:last-child { text-align: right; }
          td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          td:last-child { text-align: right; }
          .total-row { background: #f0f9ff; font-weight: bold; }
          .total-row td { border-bottom: 2px solid #2563eb; }
          .amount { font-size: 16px; color: #1e40af; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; }
          .footer h4 { color: #1e40af; margin-bottom: 8px; font-size: 13px; }
          .footer p { font-size: 11px; color: #64748b; margin: 2px 0; }
          .thank-you { text-align: center; margin-top: 20px; padding: 12px; background: #f0fdf4; border-radius: 6px; color: #166534; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            ${hasDisplayableLogo(hotelInfo?.logo) ? `<img src="${hotelInfo!.logo}" class="logo" alt="Logo">` : '<div></div>'}
            <div class="company-info">
              <h2>${hotelInfo?.name || 'Hotel Tbilisi'}</h2>
              ${hotelInfo?.company ? `<p><strong>${hotelInfo.company}</strong></p>` : ''}
              ${hotelInfo?.taxId ? `<p>ს/კ: ${hotelInfo.taxId}</p>` : ''}
              ${hotelInfo?.address ? `<p>📍 ${hotelInfo.address}</p>` : ''}
              ${hotelInfo?.phone ? `<p>📞 ${hotelInfo.phone}</p>` : ''}
              ${hotelInfo?.email ? `<p>📧 ${hotelInfo.email}</p>` : ''}
            </div>
          </div>
          
          <div class="invoice-title">
            <h1>ინვოისი #${invoiceNumber}</h1>
            <p>თარიღი: ${moment().format('DD/MM/YYYY')}</p>
          </div>
          
          <div class="two-columns">
            <div class="column">
              <h3>👤 მიმღები</h3>
              <p><span class="value">${reservation.guestName}</span></p>
              ${reservation.guestPhone ? `<p><span class="label">ტელეფონი:</span> <span class="value">${reservation.guestPhone}</span></p>` : ''}
              ${reservation.guestEmail ? `<p><span class="label">ელ-ფოსტა:</span> <span class="value">${reservation.guestEmail}</span></p>` : ''}
              ${reservation.guestCountry ? `<p><span class="label">ქვეყანა:</span> <span class="value">${reservation.guestCountry}</span></p>` : ''}
            </div>
            <div class="column">
              <h3>🏨 ჯავშნის დეტალები</h3>
              <p><span class="label">ჯავშნის #:</span> <span class="value">${invoiceNumber}</span></p>
              <p><span class="label">ოთახი:</span> <span class="value">${reservation.roomNumber || 'N/A'}</span></p>
              <p><span class="label">Check-in:</span> <span class="value">${moment(reservation.checkIn).format('DD/MM/YYYY')}</span></p>
              <p><span class="label">Check-out:</span> <span class="value">${moment(reservation.checkOut).format('DD/MM/YYYY')}</span></p>
              <p><span class="label">ღამეები:</span> <span class="value">${nights}</span></p>
            </div>
          </div>
          
          ${hasCompany ? `
          <div class="company-section">
            <h4>🏢 გადამხდელი კომპანია</h4>
            <p><strong>${reservation.companyName}</strong></p>
            ${reservation.companyTaxId ? `<p><span class="label">საიდენტიფიკაციო:</span> ${reservation.companyTaxId}</p>` : ''}
            ${reservation.companyAddress ? `<p><span class="label">მისამართი:</span> ${reservation.companyAddress}</p>` : ''}
            ${reservation.companyBank ? `<p><span class="label">ბანკი:</span> ${reservation.companyBank}</p>` : ''}
            ${reservation.companyBankAccount ? `<p><span class="label">ანგარიში:</span> ${reservation.companyBankAccount}</p>` : ''}
          </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th style="width: 40%">აღწერა</th>
                <th style="width: 20%">რაოდენობა</th>
                <th style="width: 20%">ფასი</th>
                <th style="width: 20%">სულ</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData?.charges.map((charge: any) => `
              <tr>
                <td>${charge.description}</td>
                <td>${charge.quantity || 1}</td>
                <td>₾${charge.price?.toFixed(2) || '0.00'}</td>
                <td>₾${charge.amount?.toFixed(2) || '0.00'}</td>
              </tr>
              `).join('') || `
              <tr>
                <td>ოთახი ${reservation.roomNumber || 'N/A'}</td>
                <td>${nights} ღამე</td>
                <td>₾${pricePerNight.toFixed(2)}</td>
                <td>₾${reservation.totalAmount}</td>
              </tr>
              `}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3"><strong>სულ ხარჯები:</strong></td>
                <td class="amount">₾${invoiceData?.totalCharges?.toFixed(2) || reservation.totalAmount}</td>
              </tr>
            </tfoot>
          </table>
          
          ${(() => {
            const totalAmount = invoiceData?.totalCharges || reservation.totalAmount || 0
            const taxData = calculateTaxBreakdown(totalAmount)
            if (taxData.totalTax > 0) {
              return `
                <div style="margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; border-top: 2px solid #e5e7eb;">
                  <h4 style="color: #374151; margin-bottom: 10px; font-size: 13px; font-weight: 600;">🧾 გადასახადის დეტალები:</h4>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                      <span>წმინდა თანხა:</span>
                      <span>₾${taxData.net.toFixed(2)}</span>
                    </div>
                    ${taxData.taxes.map((tax: any) => `
                      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>${tax.name} (${tax.rate}%):</span>
                        <span>₾${tax.amount.toFixed(2)}</span>
                      </div>
                    `).join('')}
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; margin-top: 6px; border-top: 1px solid #d1d5db; font-weight: 600; color: #111827;">
                      <span>სულ გადასახადი:</span>
                      <span>₾${taxData.totalTax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; margin-top: 4px; font-weight: bold; font-size: 14px; color: #111827;">
                      <span>სულ (გადასახადების ჩათვლით):</span>
                      <span>₾${taxData.gross.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              `
            }
            return ''
          })()}
          
          ${invoiceData?.payments && invoiceData.payments.length > 0 ? `
          <div style="margin-top: 20px; padding: 12px; background: #f0fdf4; border-radius: 6px;">
            <h4 style="color: #166534; margin-bottom: 10px; font-size: 13px;">💳 გადახდები:</h4>
            ${invoiceData.payments.map((payment: any) => `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #d1fae5;">
              <span style="font-size: 12px;">${payment.description} (${payment.method})</span>
              <span style="font-size: 12px; color: #166534; font-weight: 500;">-₾${payment.amount?.toFixed(2)}</span>
            </div>
            `).join('')}
            <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 2px solid #86efac;">
              <span style="font-size: 13px;">სულ გადახდილი:</span>
              <span style="font-size: 13px; color: #166534;">₾${invoiceData.totalPayments?.toFixed(2)}</span>
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 16px; ${invoiceData?.balance > 0 ? 'background: #fef2f2; color: #991b1b;' : 'background: #f0fdf4; color: #166534;'}">
            <span>ბალანსი: </span>
            <span>₾${invoiceData?.balance?.toFixed(2) || reservation.totalAmount}</span>
          </div>
          
          ${hotelInfo?.bank || hotelInfo?.account ? `
          <div class="footer">
            <h4>🏦 საბანკო რეკვიზიტები</h4>
            ${hotelInfo.bank ? `<p><span class="label">ბანკი:</span> ${hotelInfo.bank}</p>` : ''}
            ${hotelInfo.account ? `<p><span class="label">ანგარიში:</span> ${hotelInfo.account}</p>` : ''}
            ${hotelInfo?.company ? `<p><span class="label">მიმღები:</span> ${hotelInfo.company}</p>` : ''}
          </div>
          ` : ''}
          
          <div class="thank-you">
            <p>გმადლობთ, რომ აირჩიეთ <strong>${hotelInfo?.name || 'ჩვენი სასტუმრო'}</strong>! 🙏</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
  
  // Print Invoice
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=600')
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML())
      printWindow.document.close()
      printWindow.print()
    }
    
    ActivityLogger.log('INVOICE_PRINTED', {
      reservation: invoiceNumber,
      guest: reservation.guestName
    })
    
    if (onPrint) onPrint()
  }
  
  // Download as PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      // Create temporary container
      const container = document.createElement('div')
      container.innerHTML = generateInvoiceHTML()
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      document.body.appendChild(container)
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Generate canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
      })
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`invoice-${invoiceNumber}.pdf`)
      
      // Cleanup
      document.body.removeChild(container)
      
      ActivityLogger.log('INVOICE_DOWNLOADED', {
        reservation: invoiceNumber,
        guest: reservation.guestName,
        format: 'PDF'
      })
      
      alert('✅ PDF წარმატებით ჩამოიტვირთა!')
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('❌ PDF-ის გენერაცია ვერ მოხერხდა. სცადეთ დაბეჭდვა.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }
  
  // Send via Email (opens email client with instructions)
  const handleEmail = () => {
    if (!reservation.guestEmail) {
      alert('❌ სტუმრის email არ არის მითითებული')
      return
    }
    
    const subject = `ინვოისი #${invoiceNumber} - ${hotelInfo?.name || 'Hotel'}`
    const body = `ძვირფასო ${reservation.guestName},



გიგზავნით ინვოისს თქვენი ვიზიტისთვის.



ჯავშნის დეტალები:

- ჯავშნის #: ${invoiceNumber}

- ოთახი: ${reservation.roomNumber}

- Check-in: ${moment(reservation.checkIn).format('DD/MM/YYYY')}

- Check-out: ${moment(reservation.checkOut).format('DD/MM/YYYY')}

- თანხა: ₾${invoiceData?.totalCharges?.toFixed(2) || reservation.totalAmount}



გთხოვთ, PDF ინვოისი იხილეთ დანართში.



გმადლობთ!

${hotelInfo?.name || 'Hotel'}

${hotelInfo?.phone || ''}

${hotelInfo?.email || ''}`
    
    window.location.href = `mailto:${reservation.guestEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    
    ActivityLogger.log('INVOICE_EMAIL_OPENED', {
      reservation: invoiceNumber,
      email: reservation.guestEmail
    })
    
    // Show instruction
    setTimeout(() => {
      alert('📧 Email კლიენტი გაიხსნა.\n\n💡 რჩევა: ჯერ ჩამოტვირთეთ PDF და შემდეგ მიამაგრეთ email-ს.')
    }, 500)
  }
  
  // Send via WhatsApp
  const handleWhatsApp = () => {
    let phone = reservation.guestPhone || ''
    
    // Clean phone number
    phone = phone.replace(/[^\d+]/g, '')
    if (phone.startsWith('0')) {
      phone = '995' + phone.substring(1)
    }
    if (!phone.startsWith('+') && !phone.startsWith('995')) {
      phone = '995' + phone
    }
    phone = phone.replace('+', '')
    
    if (!phone || phone.length < 9) {
      alert('❌ სტუმრის ტელეფონის ნომერი არ არის მითითებული ან არასწორია')
      return
    }
    
    const message = `გამარჯობა ${reservation.guestName}! 👋



${hotelInfo?.name || 'Hotel'}-დან გიგზავნით ინვოისს:



📋 ჯავშნის #: ${invoiceNumber}

🏠 ოთახი: ${reservation.roomNumber}

📅 ${moment(reservation.checkIn).format('DD/MM/YYYY')} - ${moment(reservation.checkOut).format('DD/MM/YYYY')}

💰 თანხა: ₾${invoiceData?.totalCharges?.toFixed(2) || reservation.totalAmount}



გმადლობთ! 🙏`
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    ActivityLogger.log('INVOICE_WHATSAPP_SENT', {
      reservation: invoiceNumber,
      phone: reservation.guestPhone
    })
  }
  
  return (
    <div className="space-y-3">
      {/* Main Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          🖨️ დაბეჭდვა
        </button>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isGeneratingPDF ? '⏳ იტვირთება...' : '📄 PDF ჩამოტვირთვა'}
        </button>
      </div>
      
      {/* Send Options */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleEmail}
          disabled={!reservation.guestEmail}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📧 Email-ით
        </button>
        
        <button
          onClick={handleWhatsApp}
          disabled={!reservation.guestPhone}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💬 WhatsApp
        </button>
      </div>
      
      {/* Info */}
      {hasCompany && (
        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          🏢 კორპორატიული ინვოისი: {reservation.companyName}
        </div>
      )}
      
      {(!reservation.guestEmail && !reservation.guestPhone) && (
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          ℹ️ Email ან ტელეფონი არ არის მითითებული
        </div>
      )}
    </div>
  )
}
