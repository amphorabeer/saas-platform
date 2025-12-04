# Export Commands for Code Review

## 1. Project Structure
```bash
cd apps/hotel
tree -I 'node_modules|.git|.next|out|build' -L 3
```

## 2. Installed Packages
```bash
cd apps/hotel
pnpm list --depth=0
```

## 3. TypeScript Check
```bash
cd apps/hotel
pnpm type-check
```

## 4. Create Archive
```bash
cd apps/hotel
zip -r hotel-system-export.zip . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "tsconfig.tsbuildinfo"
```

## 5. LocalStorage Data Sample
Open browser console and run:
```javascript
const hotelData = {};
Object.keys(localStorage).forEach(key => {
  if(key.includes('hotel') || key.includes('audit') || key.includes('reservation') || key.includes('cashier') || key.includes('folio')) {
    try {
      hotelData[key] = JSON.parse(localStorage.getItem(key));
    } catch {
      hotelData[key] = localStorage.getItem(key);
    }
  }
});
console.log(JSON.stringify(hotelData, null, 2));
```

## 6. File Count
```bash
cd apps/hotel
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | wc -l
```

## 7. Project Size
```bash
cd apps/hotel
du -sh src
```
