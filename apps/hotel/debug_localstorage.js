// Debug script to check localStorage structure
console.log('=== FINDING RESERVATION DATA ===');
Object.keys(localStorage).forEach(key => {
  const value = localStorage.getItem(key);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (parsed[0].guestName || parsed[0].roomNumber || parsed[0].checkIn || parsed[0].roomId) {
        console.log(`\n✅ FOUND POSSIBLE RESERVATIONS in key: ${key}`);
        console.log(`   Count: ${parsed.length}`);
        console.log(`   Sample:`, parsed[0]);
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.guestName || parsed.roomNumber || parsed.checkIn) {
        console.log(`\n✅ FOUND POSSIBLE RESERVATION (single) in key: ${key}`);
        console.log(parsed);
      }
    }
  } catch(e) {}
});

// Check for calendar specific keys
['calendar', 'bookings', 'reservations', 'rooms', 'hotel'].forEach(keyword => {
  console.log(`\n=== Keys containing '${keyword}': ===`);
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes(keyword)) {
      const value = localStorage.getItem(key);
      try {
        const parsed = JSON.parse(value);
        console.log(`${key}:`, Array.isArray(parsed) ? `Array[${parsed.length}]` : typeof parsed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`  Sample:`, parsed[0]);
        }
      } catch {
        console.log(`${key}:`, value?.substring(0, 100));
      }
    }
  });
});
