# Landing — რესტორნის მოდული: აუდიტის პასუხები

## 1. apps/web/landing/src/app/modules/ — რა ფოლდერები არსებობს?

**პასუხი:** ცალკე ფოლდერები hotel, store და ა.შ. **არ არსებობს**. არსებობს მხოლოდ **დინამიური როუტი** `[module]/pricing/page.tsx` — ერთი ფაილი, რომელიც ემსახურება ყველა მოდულს (hotel, restaurant, beauty, shop, brewery, winery, distillery) `params.module`-ის მიხედვით.

---

## 2. Hotel-ის pricing

**პასუხი:** ცალკე `hotel/pricing/page.tsx` **არ არსებობს**. Hotel-ის pricing მოწოდებულია იმავე დინამიური გვერდით: `/modules/hotel/pricing` → `[module]/pricing` with `moduleData.hotel`.

---

## 3. Store-ის pricing

**პასუხი:** ცალკე `store/pricing/page.tsx` **არ არსებობს**. Store/Shop-ის pricing — იგივე დინამიური გვერდი: `/modules/shop/pricing` (landing-ზე slug არის `shop`, API-ზე `store`). `moduleData.shop` + Key Features Section for Shop.

---

## 4. Store-ის register API

**პასუხი:** **არსებობს** — `apps/web/landing/src/app/api/store/register/route.ts`. POST, იღებს name, email, password, organizationName, და ა.შ., ქმნის Organization (storeCode), User, Store, StoreEmployee, ModuleAccess, Subscription, აგზავნის welcome email (generateStoreWelcomeEmail).

---

## 5. Restaurant-ის register API

**პასუხი:** **არსებობს** — `apps/web/landing/src/app/api/restaurant/register/route.ts`. POST, იღებს name, email, password, organizationName, restaurantType (optional), და ა.შ., ქმნის Organization (restCode), User, Restaurant, RestaurantEmployee, Zone, Tables, Default categories, ModuleAccess, Subscription, აგზავნის generateRestaurantWelcomeEmail. პასუხში აბრუნებს restCode.

---

## 6. Landing schema.prisma — Organization-ში restCode

**პასუხი:** **არსებობს** — `restCode String? @unique` (ასევე `storeCode String? @unique`).

---

## 7. lib/email.ts — generateStoreWelcomeEmail და generateRestaurantWelcomeEmail

**პასუხი:** **ორივე არსებობს:**
- `generateStoreWelcomeEmail(storeCode, storeName, email, password)` — shop.geobiz.app/login.
- `generateRestaurantWelcomeEmail(restCode, restaurantName, email, password)` — rest.geobiz.app/login, orange/dark სტილი.

---

## მთავარ გვერდზე restaurant-ის ლინკი

**პასუხი:** **არსებობს** — `apps/web/landing/src/app/page.tsx`-ში `defaultModules` შეიცავს `{ name: "რესტორნი", slug: "restaurant", ... }` და ბმული იგება როგორ `href={/modules/${module.slug}/pricing}`, ანუ `/modules/restaurant/pricing`. დამატებითი ლინკის დამატება არ სჭირდება.
