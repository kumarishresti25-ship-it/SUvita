# SUvita

**Scan Smart. Live Green.**

SUvita is an AI-powered sustainability product intelligence platform. Users scan a product's barcode and instantly see its ingredients, a transparent sustainability score (the **EcoScore**), the confidence behind that score, and greener alternatives. A built-in assistant, **SUvita AI**, explains scores and ingredients, compares products, and helps users shop more sustainably.

> **Status:** runs locally. Deployment is planned.
> APP link: (https://suvita.ai.studio)

---

## Features

### Scanning and product analysis
- **Barcode scanner** using the device camera (EAN-13, EAN-8, UPC-A, UPC-E), with a scanning frame, camera switching, duplicate-scan prevention, and a clear message when camera permission is denied
- **Manual barcode entry** and **search by product name** as fallbacks
- **Product intelligence page** with image, name, brand, category, barcode, overall EcoScore, and an A to E grade
- **Transparent score breakdown** showing each dimension's score, weight, and data availability, plus a "Why did this product receive this score?" explanation with the strongest and weakest factors
- **Ingredient analysis** with purpose, available safety or regulatory information, warnings, and source, filterable by all ingredients, ingredients needing attention, and ingredients with limited information

### Discovery and comparison
- **Greener alternatives** recommended from the product database, taking category and user preferences into account
- **Explore products** with search, categories, EcoScore filters, sorting, and featured, top-rated, and recently added sections
- **Compare products** side by side (two or three products)
- **Scan & Compare**: scan two physical products one after another and see which has the better sustainability profile, with a summary of advantages, trade-offs, and missing data. Comparisons can be saved and shared.

### Personal features
- **Authentication** with sign up, login, logout, and password recovery
- **Guest mode** so anyone can try the app first, with an optional **Sign in / Sync** to keep data across devices
- **India-focused catalog** with prices shown in INR (₹) and support for Indian 890 retail barcodes
- **Onboarding** that captures interests and priorities (skippable, and can be re-run from My Profile) and personalises recommendations
- **My Collection** for saved products and personal collections, persisted in the user's account
- **Sustainability Insights** with scan history, average score over time, grade distribution, and category breakdown
- **Profile and Settings** for name, photo, preferences, and notifications

### SUvita AI
- Chat assistant that is aware of the product database, the user's preferences, and the current product or comparison
- Explains scores, packaging, brand information, and individual ingredients in plain language
- Natural-language shopping requests that search the real product database and return product cards
- Conversation history that users can clear or delete
- The AI **does not calculate or invent scores**. Scores always come from the SUvita scoring engine, and AI explanations are kept separate from verified product data.

---

## How the EcoScore works

Each component is normalised to a 0 to 100 scale and combined with these weights:

| Dimension | Weight |
| --- | --- |
| Ingredient Safety | 40% |
| Packaging Type | 30% |
| Brand Ethics | 20% |
| Energy Footprint | 10% |

```
Overall = (Ingredient Safety x 0.40) + (Packaging x 0.30) + (Brand Ethics x 0.20) + (Energy Footprint x 0.10)
```

| Grade | Score | Meaning |
| --- | --- | --- |
| A | 80 to 100 | Excellent |
| B | 65 to 79 | Good |
| C | 50 to 64 | Average |
| D | 35 to 49 | Poor |
| E | 0 to 34 | Very Poor |

Principles behind the score:
- **Missing data is treated as missing, not zero.** Weights are not silently redistributed, and no high score is awarded when essential information is absent.
- Every score shows a **confidence indicator** and the percentage of available data.
- Dimensions without data are shown as **"Insufficient data"** in comparisons.
- Grade thresholds are configurable.
- The same scoring engine powers the product page, comparisons, alternatives, and the AI assistant.

---

## Data sources and honesty about data

- **Open Food Facts** for food product information, ingredients, nutrition, and available environmental indicators
- Cosmetic and personal-care ingredient data, packaging information, and brand sustainability information from attributable sources, where accessible and permitted
- Where real data cannot be retrieved, the app uses **clearly labelled sample data** for demonstration. Sample data is never presented as verified real-world product data.
- SUvita does not make medical diagnoses or claim a product is harmful based on incomplete information, and it does not display invented carbon or water savings.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Icons | Lucide React |
| Routing | React Router |
| Charts | Recharts |
| Barcode scanning | html5-qrcode |
| Backend, database, auth | Supabase (PostgreSQL with Row Level Security) |
| AI | LLM API called from a secure server-side service (`<provider name>`) |

---

## Database

Main Supabase tables:

`profiles`, `user_preferences`, `products`, `product_ingredients`, `sustainability_scores`, `product_sources`, `scans`, `saved_products`, `collections`, `collection_products`, `product_comparisons`, `saved_comparisons`

Row Level Security is enabled so users can only read and change their own scans, saved products, collections, comparisons, and chats. Public product information is readable according to the app's access rules.

---


## Using SUvita

1. Sign up, then answer the quick onboarding questions (or skip them).
2. Open **Scan Product** and scan a barcode, or enter it manually.
3. Read the product's EcoScore, breakdown, and ingredients.
4. Open **Greener alternatives**, save products to **My Collection**, or ask **SUvita AI** a question.
5. Use **Scan & Compare** to scan two products and see which is the better choice for you.
6. Check **Sustainability Insights** to follow your progress over time.

---

## Screenshots

### Overview dashboard
Scan a barcode, enter one manually, or search by name. The cards show your real scan and save activity.

### Scan & Compare
Scan or select two products, one slot at a time, then compare them side by side.

### My Profile
Update your display name and avatar, and change the preferences that personalise recommendations and SUvita AI answers.

All the screenshots of profile page, dashboard and scanning shared as png files.

---

## Known limitations

- Product coverage depends on the connected data sources. Products missing from them show limited information or "Insufficient data".
- Cosmetic, packaging, and brand data may be incomplete because not every source offers an open API.
- Scores reflect available data and are a guide, not a certification.

---


## Author

Built by **Shresti Kumari** as a portfolio project.

