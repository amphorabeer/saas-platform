# 🔧 Folio Migration Script

## პრობლემა

ძველ folios-ებში `roomNumber` ველში CUID-ებია (მაგ: `"cmiyoo83i0005ht..."`) room number-ების ნაცვლად (მაგ: `"102"`).

## გამოსავალი

გამოიყენე migration script, რომელიც აფიქსებს ყველა ძველ folio-ს.

## გამოყენება

### ვარიანტი 1: Quick Fix (Simplified Script)

**სწრაფი გამოსწორება** - მხოლოდ `roomNumber` ველისთვის:

```javascript
// Fix old folios
(function() {
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]');
  let fixed = 0;
  
  folios.forEach(f => {
    if (f.roomNumber && f.roomNumber.length > 10) {
      const room = rooms.find(r => r.id === f.roomNumber);
      if (room) {
        console.log(`Fixing: ${f.roomNumber} → ${room.roomNumber}`);
        f.roomNumber = room.roomNumber;
        fixed++;
      }
    }
  });
  
  if (fixed > 0) {
    localStorage.setItem('hotelFolios', JSON.stringify(folios));
    console.log(`Fixed ${fixed} folios. Refresh page.`);
  }
})();
```

### ვარიანტი 2: Browser Console (Full Script)

1. გახსენი Hotel App (`http://localhost:3010`)
2. გახსენი Browser Console (F12 ან Cmd+Option+I)
3. დააკოპირე და გაუშვი ეს კოდი:

```javascript
(function fixOldFolios() {
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]');
  
  if (rooms.length === 0) {
    console.error('❌ Rooms not found in localStorage!');
    console.log('💡 Make sure rooms are loaded first. Try refreshing the page.');
    return;
  }
  
  console.log('📦 Rooms:', rooms.length);
  console.log('📁 Folios:', folios.length);
  
  let fixed = 0;
  const fixedFolios = [];
  
  folios.forEach(folio => {
    // Check if roomNumber looks like a CUID (long string, not numeric)
    if (folio.roomNumber && folio.roomNumber.length > 10 && !/^\d+$/.test(folio.roomNumber)) {
      // Try to find room by ID
      const room = rooms.find(r => r.id === folio.roomNumber);
      if (room) {
        const oldRoomNumber = folio.roomNumber;
        folio.roomNumber = room.roomNumber || room.number || folio.roomNumber;
        console.log(`✅ Fixing folio ${folio.folioNumber}: ${oldRoomNumber} → ${folio.roomNumber}`);
        fixed++;
        fixedFolios.push(folio.folioNumber);
      } else {
        console.log(`⚠️ Room not found for folio ${folio.folioNumber}: ${folio.roomNumber}`);
      }
    }
  });
  
  // Also fix folioNumber if it contains CUID
  folios.forEach(folio => {
    if (folio.folioNumber) {
      // Extract room number part from folioNumber (format: F251209-867-reservationId)
      const parts = folio.folioNumber.split('-');
      if (parts.length >= 2) {
        const roomPart = parts[1];
        // Check if roomPart is a CUID
        if (roomPart && roomPart.length > 10 && !/^\d+$/.test(roomPart)) {
          const room = rooms.find(r => r.id === roomPart);
          if (room) {
            const roomNumber = room.roomNumber || room.number;
            if (roomNumber && roomNumber.length <= 4 && /^\d+$/.test(roomNumber)) {
              const oldFolioNumber = folio.folioNumber;
              folio.folioNumber = `F${parts[0]}-${roomNumber}-${parts.slice(2).join('-')}`;
              console.log(`✅ Fixing folioNumber: ${oldFolioNumber} → ${folio.folioNumber}`);
              if (!fixedFolios.includes(folio.folioNumber)) {
                fixed++;
              }
            }
          }
        }
      }
    }
  });
  
  if (fixed > 0) {
    localStorage.setItem('hotelFolios', JSON.stringify(folios));
    console.log(`\n🎉 Fixed ${fixed} folios! Refresh the page to see changes.`);
  } else {
    console.log('\n✅ No folios needed fixing.');
  }
})();
```

4. დააჭირე Enter-ს
5. გადატვირთე გვერდი (F5 ან Cmd+R)

### ვარიანტი 2: Import from Utility

```typescript
import { migrateFolios } from '@/utils/migrateFolios'

// Call in component or useEffect
migrateFolios()
```

## რას აკეთებს Script

1. **პოულობს rooms-ს** localStorage-დან
2. **პოულობს folios-ს** localStorage-დან
3. **ამოწმებს თითოეულ folio-ს**:
   - თუ `roomNumber` არის CUID (length > 10 და არ არის numeric)
   - პოულობს room-ს rooms მასივში `id`-ით
   - ანაცვლებს CUID-ს room number-ით
4. **აფიქსებს folioNumber-საც** (თუ შეიცავს CUID-ს)
5. **ინახავს** განახლებულ folios-ს localStorage-ში

## მაგალითი

**Before:**
```javascript
{
  folioNumber: "F251209-cmiyoo83i0005ht-cmixqrlkt0001xxakb2xz660f",
  roomNumber: "cmiyoo83i0005ht..."
}
```

**After:**
```javascript
{
  folioNumber: "F251209-102-cmixqrlkt0001xxakb2xz660f",
  roomNumber: "102"
}
```

## შენიშვნები

- ⚠️ **მნიშვნელოვანი**: Script-ის გაშვებამდე დარწმუნდი, რომ rooms უკვე ჩატვირთულია localStorage-ში
- ✅ Script არის **idempotent** - შეიძლება რამდენჯერმე გაეშვას
- 🔄 Script-ის შემდეგ **გადატვირთე გვერდი** ცვლილებების სანახავად

## Troubleshooting

### "Rooms not found in localStorage!"
- გადატვირთე გვერდი, რომ rooms ჩატვირთოს
- ან გაუშვი `loadRooms()` ფუნქცია page.tsx-დან

### "Room not found for folio"
- ეს ნიშნავს, რომ folio-ს roomNumber-ში CUID არის, მაგრამ ეს room აღარ არსებობს rooms მასივში
- შეამოწმე, რომ room არ არის წაშლილი ან შეცვლილი

### Script არ მუშაობს
- შეამოწმე Browser Console-ში errors
- დარწმუნდი, რომ localStorage ხელმისაწვდომია
- შეამოწმე, რომ rooms და folios ორივე არსებობს localStorage-ში

