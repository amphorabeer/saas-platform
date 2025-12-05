# SYSTEM_RULES.md Updates Required

## 1. Update Reservation Creation Rules (Line 125)

**REPLACE:**
```
- Room `status` = `VACANT` ან `AVAILABLE`
```

**WITH:**
```
- Room `status` = `VACANT`
```

## 2. Add Naming Conventions Section (Before "Important Notes")

Add this new section before line 851 ("## ⚠️ Important Notes"):

```markdown
---

## 📝 Naming Conventions

### Room Status (Code/Database Values):

- `VACANT` - ოთახი თავისუფალია (room is free, not occupied)
- `OCCUPIED` - ოთახი დაკავებულია (guest is checked in)
- `MAINTENANCE` - რემონტში (under maintenance)
- `OUT_OF_ORDER` - გაუმართავი (not usable)
- `RESERVED` - დაჯავშნილია (reserved for future guest)
- `CLEANING` - იწმინდება (being cleaned)

**Important:** Always use `VACANT` (not `available`, `Available`, or `AVAILABLE`) as the canonical code/database value.

### Room Status (UI Display Labels):

- "თავისუფალი" / "Available" → Maps to `VACANT`
- "დაკავებული" / "Occupied" → Maps to `OCCUPIED`
- "რემონტში" / "Maintenance" → Maps to `MAINTENANCE`
- "გაუმართავი" / "Out of Order" → Maps to `OUT_OF_ORDER`
- "დაჯავშნილია" / "Reserved" → Maps to `RESERVED`
- "იწმინდება" / "Cleaning" → Maps to `CLEANING`

### Cleaning Status (Code/Database Values):

- `dirty` - საჭიროებს დასუფთავებას (needs cleaning)
- `cleaning` - იწმინდება (currently being cleaned)
- `clean` - სუფთა (cleaned and ready)
- `inspected` - შემოწმებული (inspected and approved)

### Display Function Example:

```typescript
const getRoomStatusLabel = (status: string): string => {
  switch (status) {
    case 'VACANT': return 'თავისუფალი'
    case 'OCCUPIED': return 'დაკავებული'
    case 'MAINTENANCE': return 'რემონტში'
    case 'OUT_OF_ORDER': return 'გაუმართავი'
    case 'RESERVED': return 'დაჯავშნილია'
    case 'CLEANING': return 'იწმინდება'
    default: return status
  }
}
```

---
```

