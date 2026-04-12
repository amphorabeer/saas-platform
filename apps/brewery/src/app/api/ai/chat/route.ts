import { NextRequest, NextResponse } from 'next/server'
import { withTenant, type RouteContext } from '@/lib/api-middleware'

export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { messages, alerts, action } = await req.json()

    // Handle direct action (auto-fill form)
    if (action) {
      return await handleAction(action, ctx, req)
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const systemPrompt = `შენ ხარ BrewMaster AI — შპს "ლუდსახარში ასპინძა"-ს HACCP და წარმოების ასისტენტი.

═══════════════════════════════════
📋 HACCP სისტემა — სრული ცოდნა
═══════════════════════════════════

## საბაზისო პრერეკვიზიტული პროგრამები (PRP)
ISO/TS 22002-1-ის მიხედვით:
1. შენობების კონსტრუქცია და განლაგება
2. სათავსების და სამუშაო ადგილების განლაგება
3. მიწოდების სისტემები (წყალი, ჰაერი, ენერგია)
4. ნარჩენების მართვა
5. დანადგარების ვარგისიანობა, დასუფთავება და მოვლა
6. შესყიდული მასალების მართვა
7. ჯვარედინი კონტამინაციის პრევენცია
8. დასუფთავება-სანიტაცია
9. მავნებლების კონტროლი
10. პერსონალის ჰიგიენა

## CCP (კრიტიკული საკონტროლო წერტილები)
- CCP-1 — ხარშვა: ტემპ. 100°C+, ხანგრძ. 70+ წთ → PASS/FAIL
- CCP-2 — ქვევრი/ავზის სანიტარია: pH 6-7, ვიზ. შემოწ. → PASS/FAIL

## SOP პროცედურები
- SOP-01: რეცხვა-დეზინფექცია (ყოველდღე)
  ნაბიჯები: ცივი ჩამოვლება → NaOH 2% 15წთ → ცხ.წყალი → HNO3 1% 10წთ → ჩამოვლება → ვიზ.შემოწმება
- SOP-02: დაკალიბრება/თერმომეტრი (კვირეული)
  ნაბიჯები: ეტალონი → ყინულის აბაზანა 0°C → გაზომვა → სხვ.>0.5°C=ამოღება → ჟურნალი
- SOP-03: პერსონალის ჰიგიენა (ყოველდღე)
  ნაბიჯები: ტანსაცმ.გამოცვლა → ფეხსაც. → ხელები → სამკაული მოხსნა → ჯანმრთ.შემოწმება
- SOP-04: ხელის დაბანა (ყოველ შეხებამდე)
  ნაბიჯები: გასველება → საპონი 20წმ → ჩამობანა → ხელსახოცი → დეზინფექტანტი
- SOP-05: ნარჩენების მართვა (ყოველდღე)
  ნაბიჯები: ორგ.→კონტეინერი → შეფ.→გადამ. → ქიმ.→სახ. → ყოველდღე გატანა → გარეცხვა
- SOP-06: მავნებლების კონტ. (კვირეული)
  ნაბიჯები: ხაფ.შემოწმება → ჟურნალი → კარ/ფანჯ.შემოწმება → ნარჩ.კონტ. → შეტყობინება
- SOP-07: ქიმიური საშ. (ყოველ გამოყ.)
  ნაბიჯები: SDS წაკითხვა → დამცავი → სწ.კონც. → ეტიკეტი → საკეტი სათავსო → ჟურნალი

## ჟურნალების სიხშირე
| ჟურნალი | სიხშირე | RS კოდი |
|---------|---------|---------|
| სანიტაცია | ყოველდღე | F-SOP-001H-01 |
| ტემპ. გაზომვა | 12სთ-ში ერთხელ | ტემპ-01 |
| მავნებლები | კვირეული | მავნ-01 |
| შემავ. კონტ. | ყოველ შეყიდვაზე | RS-10.1 |
| თერმომ. კალიბ. | თვეში ერთხელ | RS-04.1 |
| ჯანმრთ. შემოწ. | ყოველდღე | RS-11.1 |
| ქიმიკ. აღრ. | ყოველ გახსნაზე | RS-03.1 |
| საწყობი კონტ. | 2-ჯერ დღეში | RS-15.1 |
| ჟ. გადამოწმება | კვირეული | RS-18.01 |
| ჰიგ. დარღვევა | საჭიროებისამ. | RS-09.1 |
| ტრენინგი | საჭიროებისამ. | RS-06.1 |
| ინციდენტი | საჭიროებისამ. | RS-07.1 |
| კეგის რეცხვა | ყოველ კეგზე | KEG-CIP |
| ჩამოსხმა | ყოველ ჩამოსხმაზე | ჩამოსხ-01 |

## ტემპერატურის ნორმები
| ზონა | ნორმა |
|------|-------|
| საფერმენტაციო ოთახი | 18–24°C |
| კონდიციონირება | 0–4°C |
| საწყობი (გამაცივ.) | 2–6°C |
| სამლუდეო სახელოსნო | 16–22°C |
| მშრალი საწყობი | 10–20°C |
| ლაბორატორია | 18–25°C |

## ლუდის წარმოების საფრთხეები
| ეტაპი | საფრთხე | პრევენცია |
|-------|---------|-----------|
| ნედლეული | პესტიციდი, მიკრობი, ალერგენი | სერტ. მომწოდ., სპეციფ. |
| დასაწყობება | ქიმ. კონტამინ., ალერგ. | ცალკე საწყობი, ეტიკეტი |
| ხარშვა | ტემპ. არ მიაღწია | CCP-1 მონიტ. 100°C+ |
| ფერმენტ. | მიკრობ. დაბინძ. | CIP, ტემპ. კონტ. |
| ჩამოსხმა | ჰიგ. პირობები | CCP-2, სანიტ. ავზი |

## პერსონალის ჰიგიენა (SOP-001)
- სამუშ. ტანსაცმელი სავალდებულოა
- ბოჭკოს, სამკაული, საათი — აკრძალულია
- ხელები: ყოველ შეხებამდე, სველი ოპ-ის შემდეგ
- ავადმყოფი — სამუშ. შეზღუდვა ან შვებ.
- ვიზიტ. — ჰიგ.ინსტრ. გაცნობა სავალდ.

## მიმდინარე გაფრთხილებები
${alerts && alerts.length > 0
  ? alerts.map((a: { level: string; message: string }) => `- [${a.level.toUpperCase()}] ${a.message}`).join('\n')
  : '✅ გაფრთხილებები არ არის'}

═══════════════════════════════════
🤖 ქცევის წესები
═══════════════════════════════════
1. ყოველთვის ქართულად პასუხობ
2. მოკლე, კონკრეტული პასუხები
3. ფორმის შევსების მოთხოვნაზე — JSON დაბრუნება:
   {"confirm": true, "action": "fill_journal", "type": "SANITATION", "data": {"area": "იატაკი"}, "summary": "სანიტაცია — იატაკი"}
4. ხელმისაწვდომი ტიპები ავტო-შევსებისთვის:
   SANITATION, TEMPERATURE, PEST_CONTROL, HEALTH_CHECK, 
   INCIDENT, WASTE_MANAGEMENT, THERMOMETER_CALIBRATION
5. გვერდების მითითება: /haccp/journals, /haccp/sop, /haccp/ccp,
   /production, /inventory, /sales`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI სერვისი მიუწვდომელია' }, { status: 502 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || 'პასუხი ვერ მივიღე'

    // Check if AI returned a confirm action
    try {
      const parsed = JSON.parse(text)
      if (parsed.confirm && parsed.action === 'fill_journal') {
        return NextResponse.json({
          text: null,
          pendingAction: parsed,
        })
      }
    } catch {
      /* not JSON, regular text */
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return NextResponse.json({ error: 'შეცდომა მოხდა' }, { status: 500 })
  }
})

async function handleAction(
  action: { type: string; data: Record<string, unknown> },
  _ctx: RouteContext,
  req: NextRequest
) {
  try {
    const baseUrl = new URL(req.url).origin

    const res = await fetch(`${baseUrl}/api/haccp/journals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        type: action.type,
        data: action.data,
        recordedAt: new Date().toISOString(),
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'ჩანაწერის შექმნა ვერ მოხერხდა' }, { status: 500 })
    }

    return NextResponse.json({
      text: `✅ ჩანაწერი შეიქმნა! ${action.type} ჟურნალში დაემატა.`,
      filled: true,
    })
  } catch (error) {
    console.error('[AI Action] Error:', error)
    return NextResponse.json({ error: 'შეცდომა' }, { status: 500 })
  }
}
