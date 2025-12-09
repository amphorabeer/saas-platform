/**
 * Migration Script: Fix old folios with CUID in roomNumber
 * 
 * This script fixes folios that have CUIDs (like "cmiyoo83i0005ht...") 
 * in their roomNumber field instead of actual room numbers (like "102").
 * 
 * Usage:
 * 1. Open browser console
 * 2. Copy and paste this entire function
 * 3. Run it
 * 
 * Or import and call: migrateFolios()
 */

/**
 * Quick fix - simplified version for roomNumber only
 */
export const quickFixFoliosConsole = `
// Fix old folios
(function() {
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]');
  let fixed = 0;
  
  folios.forEach(f => {
    if (f.roomNumber && f.roomNumber.length > 10) {
      const room = rooms.find(r => r.id === f.roomNumber);
      if (room) {
        console.log(\`Fixing: \${f.roomNumber} → \${room.roomNumber}\`);
        f.roomNumber = room.roomNumber;
        fixed++;
      }
    }
  });
  
  if (fixed > 0) {
    localStorage.setItem('hotelFolios', JSON.stringify(folios));
    console.log(\`Fixed \${fixed} folios. Refresh page.\`);
  }
})();
`

export function migrateFolios(): void {
  if (typeof window === 'undefined') {
    console.error('❌ This script must run in the browser!')
    return
  }

  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]')
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')

  if (rooms.length === 0) {
    console.error('❌ Rooms not found in localStorage!')
    console.log('💡 Make sure rooms are loaded first. Try refreshing the page.')
    return
  }

  console.log('📦 Rooms:', rooms.length)
  console.log('📁 Folios:', folios.length)

  let fixed = 0
  const fixedFolios: string[] = []

  folios.forEach((folio: any) => {
    // Check if roomNumber looks like a CUID (long string, not numeric)
    if (folio.roomNumber && folio.roomNumber.length > 10 && !/^\d+$/.test(folio.roomNumber)) {
      // Try to find room by ID
      const room = rooms.find((r: any) => r.id === folio.roomNumber)
      if (room) {
        const oldRoomNumber = folio.roomNumber
        folio.roomNumber = room.roomNumber || room.number || folio.roomNumber
        console.log(`✅ Fixing folio ${folio.folioNumber}: ${oldRoomNumber} → ${folio.roomNumber}`)
        fixed++
        fixedFolios.push(folio.folioNumber)
      } else {
        console.log(`⚠️ Room not found for folio ${folio.folioNumber}: ${folio.roomNumber}`)
      }
    }
  })

  // Also fix folioNumber if it contains CUID
  folios.forEach((folio: any) => {
    if (folio.folioNumber) {
      // Extract room number part from folioNumber (format: F251209-867-reservationId)
      const parts = folio.folioNumber.split('-')
      if (parts.length >= 2) {
        const roomPart = parts[1]
        // Check if roomPart is a CUID
        if (roomPart && roomPart.length > 10 && !/^\d+$/.test(roomPart)) {
          const room = rooms.find((r: any) => r.id === roomPart)
          if (room) {
            const roomNumber = room.roomNumber || room.number
            if (roomNumber && roomNumber.length <= 4 && /^\d+$/.test(roomNumber)) {
              const oldFolioNumber = folio.folioNumber
              folio.folioNumber = `F${parts[0]}-${roomNumber}-${parts.slice(2).join('-')}`
              console.log(`✅ Fixing folioNumber: ${oldFolioNumber} → ${folio.folioNumber}`)
              if (!fixedFolios.includes(folio.folioNumber)) {
                fixed++
              }
            }
          }
        }
      }
    }
  })

  if (fixed > 0) {
    localStorage.setItem('hotelFolios', JSON.stringify(folios))
    console.log(`\n🎉 Fixed ${fixed} folios! Refresh the page to see changes.`)
  } else {
    console.log('\n✅ No folios needed fixing.')
  }
}

/**
 * Standalone function for browser console
 * Copy and paste this entire function into browser console
 */
export const migrateFoliosConsole = `
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
    if (folio.roomNumber && folio.roomNumber.length > 10 && !/^\\d+$/.test(folio.roomNumber)) {
      // Try to find room by ID
      const room = rooms.find(r => r.id === folio.roomNumber);
      if (room) {
        const oldRoomNumber = folio.roomNumber;
        folio.roomNumber = room.roomNumber || room.number || folio.roomNumber;
        console.log(\`✅ Fixing folio \${folio.folioNumber}: \${oldRoomNumber} → \${folio.roomNumber}\`);
        fixed++;
        fixedFolios.push(folio.folioNumber);
      } else {
        console.log(\`⚠️ Room not found for folio \${folio.folioNumber}: \${folio.roomNumber}\`);
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
        if (roomPart && roomPart.length > 10 && !/^\\d+$/.test(roomPart)) {
          const room = rooms.find(r => r.id === roomPart);
          if (room) {
            const roomNumber = room.roomNumber || room.number;
            if (roomNumber && roomNumber.length <= 4 && /^\\d+$/.test(roomNumber)) {
              const oldFolioNumber = folio.folioNumber;
              folio.folioNumber = \`F\${parts[0]}-\${roomNumber}-\${parts.slice(2).join('-')}\`;
              console.log(\`✅ Fixing folioNumber: \${oldFolioNumber} → \${folio.folioNumber}\`);
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
    console.log(\`\\n🎉 Fixed \${fixed} folios! Refresh the page to see changes.\`);
  } else {
    console.log('\\n✅ No folios needed fixing.');
  }
})();
`

