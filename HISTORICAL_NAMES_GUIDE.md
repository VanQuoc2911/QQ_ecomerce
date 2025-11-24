# Historical Province Names (Pre-2024 Merger)

## Overview
The reverse geocoding system now returns both current and historical province/district names from before Vietnam's 2024 administrative consolidation.

## API Response

The `/api/address/reverse` endpoint now returns:

```json
{
  "province": "Hà Giang",           // Current name
  "oldProvince": "Hà Giang (cũ)",   // Pre-2024 name
  "district": "Vị Xuyên",            // Current name
  "oldDistrict": "Vị Xuyên (cũ)",    // Pre-2024 name
  "ward": "Tân Hợp",
  "detail": "...",
  "source": "nominatim"
}
```

## Setting Up Historical Names

### Step 1: Add oldName to existing provinces/districts

Run the migration script:
```bash
cd backend
node seed/migrateOldNames.js
```

### Step 2: Populate the provinceOldNames mapping

Edit `backend/seed/migrateOldNames.js` and add mappings for provinces affected by the 2024 consolidation:

```javascript
const provinceOldNames = {
  "Hà Giang": "Hà Giang",
  "Cao Bằng": "Cao Bằng",
  "Bạc Liêu": "Bạc Liêu",
  "Cà Mau": "Cà Mau",
  // Add more mappings here
};

const districtOldNames = {
  "Hà Giang|Vị Xuyên": "Vị Xuyên (cũ)",
  "Cao Bằng|Hà Quảng": "Hà Quảng (cũ)",
  // Add more district mappings here
};
```

### Step 3: Run migration

```bash
npm run seed:migrate-old-names
```

## Frontend Usage

In checkout form (`web/src/pages/user/Checkout.tsx`), you can use the `oldProvince`, `oldDistrict` fields if available:

```javascript
// In the GPS autocomplete handler
const response = await fetch(`/api/address/reverse?lat=${lat}&lng=${lng}`);
const data = await response.json();

// Use old names if you need to reference historical data
const provinceToDisplay = data.oldProvince || data.province;
const districtToDisplay = data.oldDistrict || data.district;
```

## Database Model Changes

### Province Schema
```javascript
{
  name: String,              // Current name
  oldName: String,           // Pre-2024 name (can be null)
  createdAt: Date
}
```

### District Schema
```javascript
{
  name: String,              // Current name
  oldName: String,           // Pre-2024 name (can be null)
  province: ObjectId,
  createdAt: Date
}
```

## Vietnam 2024 Administrative Changes

The following provinces underwent changes:
- Hà Giang: absorbed some districts
- Cao Bằng: administrative reorganization
- Bạc Liêu: border changes
- Cà Mau: boundary adjustments
- And others...

For a complete list, see: https://en.wikipedia.org/wiki/Provinces_and_cities_of_Vietnam

## Testing

```bash
# Test reverse geocoding with old names
curl "http://localhost:4000/api/address/reverse?lat=22.8&lng=104.7"

# Response will include both current and old names:
{
  "province": "Hà Giang",
  "oldProvince": "Hà Giang (cũ)",
  ...
}
```
