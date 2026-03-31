# CNN Module 1 - Database Schema Requirements

## Overview

When your teammate completes Module 1 (CNN-based diagnosis), you'll need to store its output in the database. Here's what to add to the `skin_images` table.

---

## SQL Migration for CNN Fields

Run this migration when Module 1 is ready:

```sql
-- Add CNN predictions as JSON
ALTER TABLE skin_images ADD COLUMN IF NOT EXISTS cnn_predictions JSONB;

-- Add affected body region/location
ALTER TABLE skin_images ADD COLUMN IF NOT EXISTS affected_region TEXT;

-- Add severity score (0-1 scale)
ALTER TABLE skin_images ADD COLUMN IF NOT EXISTS severity_score FLOAT;

-- Add extracted image features (texture, color, patterns, etc.)
ALTER TABLE skin_images ADD COLUMN IF NOT EXISTS image_features JSONB;

-- Add timestamp for when CNN analysis was performed
ALTER TABLE skin_images ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;
```

---

## Field Descriptions

### 1. `cnn_predictions` (JSONB) - **CRITICAL**

**This is the main CNN output that the RAG module consumes**

Expected JSON structure:

```json
{
  "condition_id": "dermatitis_contact",
  "condition_name": "Contact Dermatitis",
  "confidence": 0.87,
  "top_alternatives": [
    {
      "name": "Allergic Reaction",
      "confidence": 0.08
    },
    {
      "name": "Eczema",
      "confidence": 0.05
    }
  ]
}
```

**When to populate:** After Module 1 CNN analysis completes
**Used by:** RAG pipeline for diagnosis and clinical reasoning

---

### 2. `cnn_label` (String) - **EXISTING**

Single condition class name from CNN (already in schema)

```
Examples: "psoriasis", "eczema", "dermatitis", "melanoma"
```

---

### 3. `cnn_confidence` (Float) - **EXISTING**

Confidence score 0-1 (already in schema)

```
Examples: 0.87, 0.92, 0.65
```

---

### 4. `affected_region` (Text) - **RECOMMENDED**

Location on body where the condition is detected

```
Examples:
- "left_arm_upper"
- "face_left_cheek"
- "scalp_center"
- "chest_right_side"
- "foot_sole"
- "neck_back"
```

**When to populate:** During CNN image processing
**Used by:** Context for clinical recommendations (e.g., facial condition may need different treatment than body)

---

### 5. `severity_score` (Float) - **RECOMMENDED**

Quantitative measure of condition severity (0-1 scale)

```
Where:
- 0.0 = Minimal/barely visible
- 0.3 = Mild
- 0.6 = Moderate
- 0.8 = Severe
- 1.0 = Very severe/critical
```

**When to populate:** During CNN analysis
**Used by:** Urgency assessment and treatment intensity recommendations

---

### 6. `image_features` (JSONB) - **OPTIONAL**

Any extracted visual features from the CNN feature layers

```json
{
  "dominant_colors": ["red", "pink", "white"],
  "texture": "scaly",
  "edges": "well_defined",
  "symmetry": "asymmetric",
  "lesion_count": 5,
  "average_lesion_size_mm": 4.2,
  "erythema_level": 0.75
}
```

---

### 7. `analyzed_at` (Timestamp) - **OPTIONAL**

When the CNN analysis was performed

```
Example: 2026-03-28 17:55:30+00:00
```

---

## Integration Workflow

### Step 1: Module 1 Ready

When your teammate finishes Module 1:

1. Run the SQL migration above
2. Update the SkinImage model:

```python
# In backend/app/models/skin_image.py
class SkinImage(Base):
    # ... existing fields ...

    # Add these:
    cnn_predictions = Column(JSON, nullable=True)
    affected_region = Column(String(100), nullable=True)
    severity_score = Column(Float, nullable=True)
    image_features = Column(JSON, nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
```

### Step 2: Module 1 Output Format

Have Module 1 store results in this format:

```python
# After CNN inference
skin_image.cnn_label = "dermatitis"
skin_image.cnn_confidence = 0.87
skin_image.cnn_predictions = {
    "condition_id": "dermatitis_contact",
    "condition_name": "Contact Dermatitis",
    "confidence": 0.87,
    "top_alternatives": [...]
}
skin_image.affected_region = "left_arm_upper"
skin_image.severity_score = 0.65
skin_image.analyzed_at = datetime.utcnow()

db.commit()
```

### Step 3: RAG Pipeline Uses It

The new `/patients/{patient_id}/analyze-skin-image` endpoint automatically:

1. Reads `cnn_predictions` from skin_images
2. Sends to RAG pipeline (Module 2)
3. Returns complete clinical analysis

---

## Current Status

✅ Backend endpoint ready: `POST /patients/{patient_id}/analyze-skin-image`  
✅ Frontend connected and showing results  
⏳ Waiting for Module 1 CNN to store `cnn_predictions`

Once Module 1 fills in the JSON structure above, everything will work end-to-end!

---

## Testing Without Module 1

You can test the frontend/backend integration by manually adding CNN data to the database:

```sql
-- Test with manual data
UPDATE skin_images
SET cnn_predictions = '{
  "condition_id": "test_condition",
  "condition_name": "Test Condition",
  "confidence": 0.85,
  "top_alternatives": [
    {"name": "Alternative 1", "confidence": 0.10},
    {"name": "Alternative 2", "confidence": 0.05}
  ]
}'::jsonb,
cnn_label = 'test_condition',
cnn_confidence = 0.85,
affected_region = 'test_location',
severity_score = 0.65
WHERE id = 'your-image-uuid';
```

---

## Questions?

Refer to these files for implementation:

- Frontend: `doctor-web/src/pages/PatientDetailsPage.jsx`
- Backend: `backend/app/api/analysis.py`
- RAG Pipeline: `backend/ai/modele2_RAG/rag_pipeline.py`
