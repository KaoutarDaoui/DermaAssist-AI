# 🎯 New Improved CNN Model Integration Guide

## Overview

The new `DermAssistFinal` model has been integrated into the app with significant improvements:

### ✨ What's New

1. **Enhanced Metadata Integration** - The model now uses 5 key patient metadata parameters instead of 4:
   - `age` - Patient age (0-120)
   - `sex` - Male/Female/Unknown
   - `site` - Body location (8 options)
   - `wilaya` - Geographic region (4 options)
   - `saison` - Season (4 options)

2. **Improved Architecture** - Uses metadata encoding with one-hot vectors for categorical features

3. **Better Geographic Awareness** - Boosts leishmaniose diagnosis for endemic regions (south/east)

---

## API Endpoint: `/ai/analyze`

### Request Parameters

**Method:** `POST`  
**Content-Type:** `multipart/form-data`

| Parameter | Type | Required | Options | Description |
|-----------|------|----------|---------|-------------|
| `image` | File | ✅ | - | Skin lesion photo |
| `age` | Integer | ✅ | 0-120 | Patient age |
| `sex` | String | ✅ | `male`, `female`, `homme`, `femme` | Patient sex |
| `site` | String | ❌ | `visage`, `cou`, `tronc`, `dos`, `bras`, `jambe`, `pied`, `unknown` | Body location |
| `wilaya` | String | ❌ | `nord`, `sud`, `est`, `ouest` | Geographic region |
| `saison` | String | ❌ | `printemps`, `ete`, `automne`, `hiver` | Current season |
| `grossesse` | Boolean | ❌ | `true`, `false` | Pregnancy status |
| `insuffisance_cardiaque` | Boolean | ❌ | `true`, `false` | Heart issues |
| `insuffisance_renale` | Boolean | ❌ | `true`, `false` | Kidney issues |
| `insuffisance_hepatique` | Boolean | ❌ | `true`, `false` | Liver issues |
| `diabete` | Boolean | ❌ | `true`, `false` | Diabetes |
| `hypertension` | Boolean | ❌ | `true`, `false` | High blood pressure |
| `deficit_g6pd` | Boolean | ❌ | `true`, `false` | G6PD deficiency |
| `coronaropathie` | Boolean | ❌ | `true`, `false` | Coronary disease |
| `immunodepression` | Boolean | ❌ | `true`, `false` | Immunosuppression |
| `allergie_penicilline` | Boolean | ❌ | `true`, `false` | Penicillin allergy |

### Response Format

```json
{
  "status": "success",
  "request_metadata": {
    "age": 35,
    "sex": "male",
    "site": "visage",
    "wilaya": "nord",
    "saison": "ete"
  },
  "module1": {
    "condition_id": "acne",
    "condition_name": "Acné",
    "confidence": 0.87,
    "confidence_pct": 87.0,
    "top_alternatives": [
      {
        "id": "eczema",
        "name": "Eczéma",
        "confidence": 0.08,
        "confidence_pct": 8.0
      }
    ]
  },
  "rag": {
    "status": "unavailable"
  }
}
```

---

## Disease Classes

The model classifies into 10 skin diseases:

| Code | French Name |
|------|-------------|
| `acne` | Acné |
| `eczema` | Eczéma |
| `gale` | Gale |
| `keratose` | Kératose |
| `leishmaniose` | Leishmaniose |
| `melanome` | Mélanome |
| `mycose` | Mycose |
| `psoriasis` | Psoriasis |
| `rosacee` | Rosacée |
| `urticaire` | Urticaire |

---

## Frontend Integration Examples

### React (Doctor Web - [doctor-web/src/services/api.js](../../../../doctor-web/src/services/api.js))

```javascript
// Analyze skin image with new metadata
async function analyzeSkinImage(formData) {
  const response = await fetch('http://localhost:8000/ai/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  });
  return response.json();
}

// Usage
const formData = new FormData();
formData.append('image', imageFile);
formData.append('age', 35);
formData.append('sex', 'male'); // or 'homme'
formData.append('site', 'visage'); // body location
formData.append('wilaya', 'nord'); // region
formData.append('saison', 'ete'); // season
// Add comorbidities if known
formData.append('grossesse', false);
formData.append('diabete', false);

const result = await analyzeSkinImage(formData);
console.log(result.module1.condition_name); // "Acné"
console.log(result.module1.confidence_pct); // 87.0
```

### React Native (Patient Mobile - [patient-mobile/src/services/api.js](../../../../patient-mobile/src/services/api.js))

```javascript
// Analyze image with metadata
async function uploadAndAnalyze(imageUri, patientData) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'lesion.jpg'
  });
  formData.append('age', patientData.age);
  formData.append('sex', patientData.sex); // 'male' or 'female'
  formData.append('site', patientData.site || 'unknown');
  formData.append('wilaya', patientData.wilaya || 'nord');
  formData.append('saison', getCurrentSeason());

  const response = await fetch(
    'http://localhost:8000/ai/analyze',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    }
  );
  return response.json();
}

// Helper to determine current season
function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'printemps';
  if (month >= 5 && month <= 7) return 'ete';
  if (month >= 8 && month <= 10) return 'automne';
  return 'hiver';
}
```

---

## Testing with cURL

```bash
# Test the improved model
curl -X POST http://localhost:8000/ai/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/skin_image.jpg" \
  -F "age=35" \
  -F "sex=male" \
  -F "site=visage" \
  -F "wilaya=nord" \
  -F "saison=ete" \
  -F "diabete=false"

# Example response (truncated)
{
  "status": "success",
  "request_metadata": {
    "age": 35,
    "sex": "male",
    "site": "visage",
    "wilaya": "nord",
    "saison": "ete"
  },
  "module1": {
    "condition_id": "acne",
    "condition_name": "Acné",
    "confidence_pct": 87.0,
    "top_alternatives": [...]
  }
}
```

---

## Key Differences from Old Model

### Old Model Parameters
- `fitzpatrick` (1-6) - Skin type scale
- `localisation` (limited options) - Body location
- `ville` (city name) - City for geographic boost

### New Model Parameters
- `site` (8 options) - More precise body locations
- `wilaya` (4 options) - Region-based (Algeria)
- `saison` (4 options) - Seasonal factors
- No Fitzpatrick scale needed

### Migration Checklist

- [ ] Update frontend forms to collect: `site`, `wilaya`, `saison`
- [ ] Remove `fitzpatrick` input field
- [ ] Update API calls to use new parameters
- [ ] Test with real images
- [ ] Update any stored procedures/migrations
- [ ] Update documentation

---

## Performance Notes

- **Model Architecture**: EfficientNet-B0 + Metadata MLP + Fusion network
- **Input Resolution**: 224x224
- **Device Support**: GPU (CUDA) if available, falls back to CPU
- **Inference Time**: ~100-150ms per image (CPU), ~20-30ms (GPU)
- **Memory**: ~500MB loaded model

---

## Troubleshooting

### "Model not found" Error
- Make sure `best_model_FINAL.pth` exists in `backend/ai/Modele1_CNN/`
- Check file permissions

### Low Confidence Scores
- Ensure image quality is good (clear, well-lit photo of lesion)
- Verify patient metadata is accurate
- Check that image is actual skin lesion photo

### Geographic Boost Not Working
- Verify `wilaya` parameter is correctly set to endemic region
- Leishmaniose boost only applies when confidence > 5%

---

## Next Steps

1. **Update Frontend Forms** - Add dropdowns for site, wilaya, saison
2. **Test API Integration** - Use cURL or Postman to test
3. **Update Database Schema** - Store new metadata fields
4. **Monitor Performance** - Track confidence scores and accuracy
5. **Collect Feedback** - Verify diagnoses with doctors

---

## Files Modified

- ✅ [`backend/ai/Modele1_CNN/cnn_service.py`](./cnn_service.py) - New service with improved model
- ✅ [`backend/app/api/ai.py`](../../../app/api/ai.py) - Updated endpoint
- ✅ [`backend/ai/Modele1_CNN/predict.py`](./predict.py) - Reference implementation

