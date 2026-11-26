import type {
  IngredientSafetyStatus,
  ProductCategory,
} from '../shared/types.ts';

export interface SeedIngredient {
  name: string;
  inciName?: string;
  purpose: string;
  safetyStatus: IngredientSafetyStatus;
  regulatoryInfo: string;
  warningText?: string;
  sourceName: string;
}

export interface SeedProduct {
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  priceCents: number | null; // INR paise (e.g., 24900 = ₹249)
  packagingSummary: string;
  packagingType: string;
  originCountry: string;
  isSampleData: boolean;
  sourceLabel: string;
  scores: {
    ingredient: number | null;
    packaging: number | null;
    ethics: number | null;
    energy: number | null;
    ingredientExplanation: string;
    packagingExplanation: string;
    ethicsExplanation: string;
    energyExplanation: string;
    ingredientSource: string;
    packagingSource: string;
    ethicsSource: string;
    energySource: string;
  };
  ingredients: SeedIngredient[];
  sources: Array<{
    sourceName: string;
    sourceType: string;
    sourceUrl?: string;
    licenseNote: string;
    isVerifiedExternal: boolean;
  }>;
}

const IMG_FOOD = '/src/assets/images/product_food_oat_1795708657239.jpg';
const IMG_BEAUTY = '/src/assets/images/product_beauty_serum_1795708659012.jpg';
const IMG_PERSONAL = '/src/assets/images/product_personal_wash_1795708658308.jpg';
const IMG_HOUSEHOLD = '/src/assets/images/product_household_clean_1795708659070.jpg';

export const SEED_PRODUCTS: SeedProduct[] = [
  // ===================== FOOD & BEVERAGES (INDIA) =====================
  {
    barcode: '8901100001011',
    name: 'Cold-Pressed Organic Oat Milk (Returnable Glass)',
    brand: 'Sahyadri Roots',
    category: 'food_beverages',
    description:
      'Minimal-ingredient organic oat beverage crafted in Pune and bottled in returnable frosted glass with zero added gums, palm oil, or refined sugars.',
    imageUrl: IMG_FOOD,
    priceCents: 24500, // ₹245
    packagingSummary: 'Returnable frosted glass bottle with tinplate cap & unbleached kraft label',
    packagingType: 'returnable_glass',
    originCountry: 'India (Maharashtra)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 94,
      packaging: 92,
      ethics: 88,
      energy: 86,
      ingredientExplanation:
        'Three whole, Jaivik Bharat organic-aligned ingredients with no synthetic emulsifiers, stabilizers, or added sugars.',
      packagingExplanation:
        'Returnable glass bottle with closed-loop deposit recovery and uncoated FSC kraft paper label.',
      ethicsExplanation:
        'Published direct farmer-cooperative sourcing ledger and fair-pricing disclosure in demo reference profile.',
      energyExplanation:
        'Regional oat sourcing and solar-assisted cold-press bottling facility in Pune.',
      ingredientSource: 'FSSAI / Demo Food Ingredient Registry',
      packagingSource: 'India EPR / Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Filtered Spring Water',
        purpose: 'Base liquid',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Potable food-grade water meeting BIS IS 10500 / FSSAI standards.',
        sourceName: 'FSSAI / BIS Food Standards',
      },
      {
        name: 'Organic Whole Grain Oats (14%)',
        purpose: 'Primary grain base and natural soluble fiber',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Certified organic cereal grain with low agricultural water intensity relative to dairy.',
        sourceName: 'Jaivik Bharat / FSSAI Reference',
      },
      {
        name: 'Himalayan Pink Salt',
        purpose: 'Natural flavor balance',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Food-grade mineral salt present at <0.1% by weight.',
        sourceName: 'General Food Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Food)',
        sourceType: 'demo_catalog',
        licenseNote: 'Clearly labelled demonstration product for testing SUvita Score methodology and Indian INR pricing.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8901100001059',
    name: '72% Single-Origin Idukki Dark Chocolate (Compostable Foil)',
    brand: 'Malabar Cacao Co.',
    category: 'food_beverages',
    description:
      'Bean-to-bar Kerala single-origin dark chocolate sweetened with unrefined coconut blossom sugar and wrapped in home-compostable cellulose film and recycled cotton paper.',
    imageUrl: IMG_FOOD,
    priceCents: 29000, // ₹290
    packagingSummary: 'Recycled handmade cotton paper sleeve with plastic-free home-compostable cellulose inner wrap',
    packagingType: 'compostable_paper',
    originCountry: 'India (Kerala)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 92,
      packaging: 95,
      ethics: 93,
      energy: 84,
      ingredientExplanation:
        'Three whole ingredients (organic Idukki cacao, cocoa butter, unrefined coconut sugar); zero palm oil, soy lecithin, or artificial vanillin.',
      packagingExplanation:
        'Zero plastic or aluminum lamination; both outer sleeve and inner cellulose barrier are compostable.',
      ethicsExplanation:
        'Direct farm-gate procurement from smallholder Kerala cacao cooperatives paying above commodity parity.',
      energyExplanation:
        'Domestic bean-to-bar roasting eliminates international cocoa shipping legs.',
      ingredientSource: 'FSSAI / Demo Food Registry',
      packagingSource: 'India EPR / Packaging Reference',
      ethicsSource: 'Demo Direct-Trade Disclosure',
      energySource: 'Demo Regional Freight Indicator',
    },
    ingredients: [
      {
        name: 'Organic Idukki Cacao Beans (72%)',
        purpose: 'Primary cacao solids and natural flavanols',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Single-origin Indian cacao cultivated under shade-grown agroforestry.',
        sourceName: 'FSSAI / General Food Reference',
      },
      {
        name: 'Organic Unrefined Coconut Blossom Sugar',
        purpose: 'Low-processing natural sweetener',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Unrefined plant sap sugar; moderate consumption advised as with all sugars.',
        sourceName: 'FSSAI Nutritional Reference',
      },
      {
        name: 'Pure Cocoa Butter',
        purpose: 'Natural cacao lipid for smooth temper',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Unadulterated cocoa fat; replaces palm-derived vegetable fat substitutes.',
        sourceName: 'FSSAI Chocolate Standards',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Food)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8901100001066',
    name: 'Creamy Milk Choco-Crisp Bar (Multi-Layer Plastic Wrapper)',
    brand: 'SweetRush India',
    category: 'food_beverages',
    description:
      'Mass-market sweet milk chocolate wafer bar containing refined sugar, uncertified palmolein oil, synthetic vanillin, and non-recyclable metallized multi-layer plastic film.',
    imageUrl: IMG_FOOD,
    priceCents: 6000, // ₹60
    packagingSummary: 'Non-recyclable MLP (multi-layer metallized plastic) flow-wrap pouch',
    packagingType: 'multi_layer_plastic',
    originCountry: 'India',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 40,
      packaging: 26,
      ethics: 44,
      energy: 45,
      ingredientExplanation:
        'High refined sugar, uncertified refined palmolein oil, PGPR emulsifier (INS 476), and artificial flavoring.',
      packagingExplanation:
        'Multi-layer metallized plastic (MLP) wrapper has very low municipal recycling recovery across India.',
      ethicsExplanation:
        'No verifiable farm-level cacao traceability or deforestation-free palm sourcing published.',
      energyExplanation:
        'High-energy industrial refining and virgin petrochemical laminate packaging.',
      ingredientSource: 'FSSAI Additive Reference',
      packagingSource: 'India PWM Rules / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Refined Sugar',
        purpose: 'Primary sweetener (first ingredient by weight)',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted food ingredient; ICMR-NIN guidelines advise restricting high added-sugar snacks.',
        warningText: 'High added sugar content per serving.',
        sourceName: 'ICMR-NIN / WHO Reference',
      },
      {
        name: 'Refined Palmolein Oil',
        purpose: 'Low-cost vegetable fat substitute for cocoa butter',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted edible oil under FSSAI; carries deforestation concern without RSPO certification.',
        warningText: 'Uncertified palm oil origin is not disclosed on label.',
        sourceName: 'Sustainability Commodity Reference',
      },
      {
        name: 'Polyglycerol Polyricinoleate (INS 476)',
        purpose: 'Synthetic viscosity reducer / emulsifier',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted food additive (INS 476 / E476) within FSSAI maximum permitted limits.',
        warningText: 'Ultra-processed synthetic emulsifier used to reduce cocoa butter content.',
        sourceName: 'FSSAI / EFSA Additive Reference',
      },
      {
        name: 'Artificial Vanillin Flavouring',
        purpose: 'Synthetic aroma',
        safetyStatus: 'limited_info',
        regulatoryInfo: 'Permitted nature-identical / artificial flavouring substance.',
        warningText: 'Specific synthetic flavor blend components are not individually listed.',
        sourceName: 'Label Transparency Assessment',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Food)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8901100001042',
    name: 'Himalayan Sprouted Ragi & Oat Granola (Partial Disclosure)',
    brand: 'Deodar Provisions',
    category: 'food_beverages',
    description:
      'Small-batch toasted ragi, sprouted oats, and jaggery granola from Uttarakhand. Demonstrates SUvita transparent handling when brand ethics and energy data are unavailable.',
    imageUrl: IMG_FOOD,
    priceCents: 36000, // ₹360
    packagingSummary: 'Recyclable mono-PE #4 stand-up pouch',
    packagingType: 'mono_plastic_pouch',
    originCountry: 'India (Uttarakhand)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Catalog (Partial Data Example)',
    scores: {
      ingredient: 88,
      packaging: 62,
      ethics: null,
      energy: null,
      ingredientExplanation:
        'Whole climate-resilient finger millet (ragi), sprouted oats, pumpkin seeds, and natural jaggery with zero artificial preservatives.',
      packagingExplanation:
        'Mono-material polyethylene pouch is recyclable where dedicated LDPE collection exists, though not curbside everywhere.',
      ethicsExplanation:
        'No public sustainability report or third-party ethical certification data is currently available for this brand.',
      energyExplanation:
        'Manufacturing energy and lifecycle emissions disclosures are unavailable.',
      ingredientSource: 'FSSAI / Demo Food Registry',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Unavailable',
      energySource: 'Unavailable',
    },
    ingredients: [
      {
        name: 'Finger Millet (Ragi) Flakes',
        purpose: 'Drought-tolerant indigenous whole grain',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Nutrient-dense Indian millet requiring significantly less irrigation water than rice or wheat.',
        sourceName: 'ICMR-NIN / FSSAI Reference',
      },
      {
        name: 'Sprouted Rolled Oats',
        purpose: 'Whole grain base',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Whole grain cereal ingredient.',
        sourceName: 'General Food Reference',
      },
      {
        name: 'Natural Palm Jaggery',
        purpose: 'Unrefined traditional sweetener',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Minimally processed natural sweetener.',
        sourceName: 'FSSAI Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Partial Data Demo)',
        sourceType: 'demo_catalog',
        licenseNote: 'Intentionally omits brand ethics and energy data to demonstrate honest confidence scoring.',
        isVerifiedExternal: false,
      },
    ],
  },

  // ===================== BEAUTY & COSMETICS (INDIA) =====================
  {
    barcode: '8902200002010',
    name: 'Botanical Squalane & Niacinamide Barrier Serum',
    brand: 'Aranya Apothecary',
    category: 'beauty_cosmetics',
    description:
      'Fragrance-free barrier-repair facial serum using sugarcane-derived squalane in a UV-protective refillable amber glass dropper bottle crafted in Bengaluru.',
    imageUrl: IMG_BEAUTY,
    priceCents: 69900, // ₹699
    packagingSummary: 'Refillable 60% PCR amber glass bottle with separable glass pipette',
    packagingType: 'refillable_glass',
    originCountry: 'India (Karnataka)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 95,
      packaging: 90,
      ethics: 91,
      energy: 84,
      ingredientExplanation:
        'Short, biodegradable INCI formula free of cyclic silicones, synthetic fragrances, PEGs, and parabens.',
      packagingExplanation:
        'Refillable amber glass bottle minimizes single-use plastic; dropper collar separates cleanly for recycling.',
      ethicsExplanation:
        'Cruelty-free certified, full INCI percentage transparency, and verifiable domestic sugarcane bio-fermentation sourcing.',
      energyExplanation:
        'Cold-process emulsion manufacturing lowers batch thermal energy use.',
      ingredientSource: 'EU CosIng / BIS Cosmetics Reference',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Water',
        inciName: 'AQUA',
        purpose: 'Solvent base',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Purified cosmetic-grade water permitted under BIS & EU CosIng.',
        sourceName: 'EU CosIng / BIS Reference',
      },
      {
        name: 'Sugarcane Squalane',
        inciName: 'SQUALANE',
        purpose: 'Plant-derived emollient and moisture barrier support',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Bio-fermented renewable emollient; well-tolerated and readily biodegradable.',
        sourceName: 'EU CosIng / INCI Reference',
      },
      {
        name: 'Niacinamide (5%)',
        inciName: 'NIACINAMIDE',
        purpose: 'Skin conditioning vitamin B3 derivative',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Widely studied cosmetic active with established safety profile under CIR review.',
        sourceName: 'CIR / EU CosIng Reference',
      },
      {
        name: 'Plant Glycerin',
        inciName: 'GLYCERIN',
        purpose: 'Humectant that draws hydration into skin',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Readily biodegradable humectant with strong safety profile.',
        sourceName: 'EU CosIng Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Cosmetics INCI)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product illustrating INCI transparency.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8902200002027',
    name: 'Amla & Vitamin C Glow Drops',
    brand: 'Surya Botanics',
    category: 'beauty_cosmetics',
    description:
      'Daily brightening serum formulated with Indian gooseberry extract, stabilized vitamin C, and hyaluronic acid in a recyclable glass vial.',
    imageUrl: IMG_BEAUTY,
    priceCents: 54900, // ₹549
    packagingSummary: 'Recyclable glass bottle with mixed-material plastic dropper cap',
    packagingType: 'recyclable_glass',
    originCountry: 'India (Himachal Pradesh)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 81,
      packaging: 74,
      ethics: 78,
      energy: 72,
      ingredientExplanation:
        'Well-tolerated brightening actives with low concentration of standard regulated preservative.',
      packagingExplanation:
        'Glass bottle is recyclable, though glued rubber/plastic dropper assembly is typically non-recyclable.',
      ethicsExplanation:
        'Cruelty-free statement published with regional Himachal botanical sourcing.',
      energyExplanation:
        'Domestic formulation and distribution keep transport emissions moderate.',
      ingredientSource: 'EU CosIng / INCI Reference',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Water',
        inciName: 'AQUA',
        purpose: 'Solvent',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Cosmetic-grade purified water.',
        sourceName: 'EU CosIng Reference',
      },
      {
        name: '3-O-Ethyl Ascorbic Acid',
        inciName: '3-O-ETHYL ASCORBIC ACID',
        purpose: 'Stabilized antioxidant / brightening agent',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Permitted cosmetic antioxidant listed in EU CosIng.',
        sourceName: 'EU CosIng Reference',
      },
      {
        name: 'Phenoxyethanol',
        inciName: 'PHENOXYETHANOL',
        purpose: 'Antimicrobial preservative',
        safetyStatus: 'attention',
        regulatoryInfo: 'Regulated in EU Cosmetics Regulation (Annex V) up to 1.0% maximum concentration.',
        warningText: 'Permitted within regulatory cap (<=1%); sensitive skin types occasionally report mild irritation.',
        sourceName: 'EU Cosmetics Regulation Annex V',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Cosmetics INCI)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8902200002034',
    name: 'Luxe Silk Blur Primer (Airless Acrylic)',
    brand: 'Aurelia Glamour',
    category: 'beauty_cosmetics',
    description:
      'Silicone-heavy smoothing makeup primer housed in a heavy double-walled virgin acrylic pump bottle with synthetic fragrance.',
    imageUrl: IMG_BEAUTY,
    priceCents: 129900, // ₹1,299
    packagingSummary: 'Non-recyclable multi-layer metallic-coated virgin acrylic airless pump',
    packagingType: 'non_recyclable_acrylic',
    originCountry: 'Imported (EU)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 34,
      packaging: 22,
      ethics: 38,
      energy: 36,
      ingredientExplanation:
        'Contains persistent cyclic silicones and undisclosed synthetic fragrance components.',
      packagingExplanation:
        'Heavy double-wall virgin acrylic with internal metal spring is virtually unrecyclable in municipal streams.',
      ethicsExplanation:
        'Minimal public disclosure on supply chain ethics or plastic reduction commitments.',
      energyExplanation:
        'Energy-intensive virgin acrylic molding, silicone synthesis, and long-haul air import.',
      ingredientSource: 'EU CosIng / ECHA Reference',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Cyclopentasiloxane',
        inciName: 'CYCLOPENTASILOXANE',
        purpose: 'Volatile silicone for silky slip feel',
        safetyStatus: 'attention',
        regulatoryInfo: 'Restricted under EU REACH (Annex XVII) due to environmental persistence (vPvB) in aquatic ecosystems.',
        warningText: 'Environmental persistence concern; restricted in EU wash-off and leave-on regulatory updates.',
        sourceName: 'ECHA / EU REACH Reference',
      },
      {
        name: 'Dimethicone Crosspolymer',
        inciName: 'DIMETHICONE CROSSPOLYMER',
        purpose: 'Film former and pore-blurring polymer',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted cosmetic silicone polymer; non-biodegradable synthetic polymer.',
        warningText: 'Low biodegradability in wastewater environments.',
        sourceName: 'EU CosIng Reference',
      },
      {
        name: 'Parfum / Fragrance',
        inciName: 'PARFUM',
        purpose: 'Scent blend',
        safetyStatus: 'limited_info',
        regulatoryInfo: 'Umbrella term permitted on labels; individual aroma chemicals are often undisclosed except regulated allergens.',
        warningText: 'Incomplete ingredient transparency; fragrance mixtures are common contact sensitivity triggers.',
        sourceName: 'Regulatory Labelling Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Cosmetics INCI)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },

  // ===================== PERSONAL CARE (INDIA — SHAMPOOS UNDER ₹300 INCLUDED!) =====================
  {
    barcode: '8903300003040',
    name: 'Reetha & Hibiscus Solid Shampoo Bar (Plastic-Free)',
    brand: 'Prakriti Craft',
    category: 'personal_care',
    description:
      'Waterless Ayurvedic-inspired botanical shampoo bar with soapnut (reetha), hibiscus extract, and mild coconut cleansers wrapped in 100% recycled seed paper. Replaces 2 liquid plastic bottles.',
    imageUrl: IMG_PERSONAL,
    priceCents: 24900, // ₹249 (under ₹300!)
    packagingSummary: 'Plastic-free 100% recycled uncoated compostable paper box',
    packagingType: 'compostable_paper',
    originCountry: 'India (Dehradun)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 94,
      packaging: 98,
      ethics: 90,
      energy: 91,
      ingredientExplanation:
        'Biodegradable plant cleansers (sodium cocoyl isethionate, reetha, shikakai) free of SLS/SLES, silicones, parabens, and synthetic dyes.',
      packagingExplanation:
        'Zero plastic bottle; lightweight uncoated recycled paper carton is fully recyclable and home-compostable.',
      ethicsExplanation:
        'Women-led Uttarakhand botanical cooperative sourcing with full INCI disclosure and cruelty-free verification.',
      energyExplanation:
        'Waterless concentrated bar eliminates ~80% shipping water weight compared to liquid shampoos.',
      ingredientSource: 'INCI / BIS Cosmetics Reference',
      packagingSource: 'India EPR / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Sodium Cocoyl Isethionate',
        inciName: 'SODIUM COCOYL ISETHIONATE',
        purpose: 'Ultra-mild coconut-derived cleansing surfactant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Readily biodegradable, sulfate-free surfactant with established dermal mildness.',
        sourceName: 'EU CosIng / CIR Reference',
      },
      {
        name: 'Sapindus Mukorossi (Reetha / Soapnut) Extract',
        inciName: 'SAPINDUS MUKOROSSI FRUIT EXTRACT',
        purpose: 'Natural saponin gentle hair cleanser',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Traditional Indian botanical cleanser listed in CosIng; biodegradable.',
        sourceName: 'EU CosIng / Traditional Botanical Reference',
      },
      {
        name: 'Hibiscus Rosa-Sinensis Flower Powder',
        inciName: 'HIBISCUS ROSA-SINENSIS FLOWER POWDER',
        purpose: 'Natural hair conditioning botanical',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Plant botanical extract widely permitted in personal care.',
        sourceName: 'EU CosIng Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Personal Care)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8903300003057',
    name: 'Bhringraj & Aloe Mild Liquid Shampoo (100% PCR Refill)',
    brand: 'Neem & Loom',
    category: 'personal_care',
    description:
      'Sulfate-free everyday herbal shampoo formulated for hard Indian municipal water, housed in a 100% recycled aluminum/PCR refill bottle under ₹300.',
    imageUrl: IMG_PERSONAL,
    priceCents: 28500, // ₹285 (under ₹300!)
    packagingSummary: '100% post-consumer recycled aluminum refill bottle with mono-PP pump',
    packagingType: 'refillable_aluminum',
    originCountry: 'India (Tamil Nadu)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 88,
      packaging: 86,
      ethics: 84,
      energy: 79,
      ingredientExplanation:
        'Plant glucoside cleansers with bhringraj and aloe vera; free from SLS, parabens, and cyclic silicones.',
      packagingExplanation:
        'Recycled aluminum vessel designed for multi-cycle refills significantly cuts single-use HDPE waste.',
      ethicsExplanation:
        'Transparent INCI list and cruelty-free verification published by brand.',
      energyExplanation:
        'Recycled aluminum uses ~95% less energy than primary aluminum smelting; regional domestic transport.',
      ingredientSource: 'INCI / Biodegradability Reference',
      packagingSource: 'India EPR / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Water',
        inciName: 'AQUA',
        purpose: 'Solvent base',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Purified cosmetic-grade water.',
        sourceName: 'EU CosIng Reference',
      },
      {
        name: 'Coco-Glucoside',
        inciName: 'COCO-GLUCOSIDE',
        purpose: 'Mild plant-derived cleansing surfactant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Readily biodegradable coconut & fruit sugar surfactant.',
        sourceName: 'EU CosIng / OECD 301B Reference',
      },
      {
        name: 'Eclipta Prostrata (Bhringraj) Extract',
        inciName: 'ECLIPTA PROSTRATA EXTRACT',
        purpose: 'Scalp conditioning botanical',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Widely permitted botanical extract in Indian personal care.',
        sourceName: 'EU CosIng / BIS Reference',
      },
      {
        name: 'Aloe Barbadensis Leaf Juice',
        inciName: 'ALOE BARBADENSIS LEAF JUICE',
        purpose: 'Soothing humectant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Botanical soothing agent.',
        sourceName: 'EU CosIng Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Personal Care)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8903300003019',
    name: 'Refillable Eucalyptus & Vetiver Body Wash (Aluminum)',
    brand: 'Kestrel India',
    category: 'personal_care',
    description:
      'Plant-surfactant body cleanser with Nilgiri eucalyptus and khus vetiver in an infinitely recyclable brushed aluminum vessel.',
    imageUrl: IMG_PERSONAL,
    priceCents: 44900, // ₹449
    packagingSummary: '100% recycled brushed aluminum bottle designed for refill pouches',
    packagingType: 'refillable_aluminum',
    originCountry: 'India (Tamil Nadu)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 91,
      packaging: 93,
      ethics: 87,
      energy: 82,
      ingredientExplanation:
        'Mild coconut-derived glucosides with rapid biodegradability and zero sulfates.',
      packagingExplanation:
        'Post-consumer recycled aluminum bottle with refill ecosystem significantly reduces lifecycle packaging waste.',
      ethicsExplanation:
        'Published ethical Nilgiri botanical sourcing and vegan verification.',
      energyExplanation:
        'Recycled aluminum smelting footprint is dramatically lower than virgin metal.',
      ingredientSource: 'INCI / Biodegradability Reference',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Water',
        inciName: 'AQUA',
        purpose: 'Base solvent',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Standard cosmetic-grade water.',
        sourceName: 'EU CosIng Reference',
      },
      {
        name: 'Coco-Glucoside',
        inciName: 'COCO-GLUCOSIDE',
        purpose: 'Gentle plant-derived cleansing surfactant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Derived from coconut oil and fruit sugars; readily biodegradable.',
        sourceName: 'EU CosIng / OECD Reference',
      },
      {
        name: 'Eucalyptus Globulus Leaf Oil',
        inciName: 'EUCALYPTUS GLOBULUS LEAF OIL',
        purpose: 'Natural botanical scent',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Steam-distilled essential oil used within IFRA dermal limits.',
        sourceName: 'IFRA / CosIng Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Personal Care)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8903300003033',
    name: 'Arctic Fresh 3-in-1 Shampoo & Shower Gel',
    brand: 'PeakMotion',
    category: 'personal_care',
    description:
      'Conventional mass-market sulfate cleanser with synthetic colorants and undisclosed fragrance in a single-use virgin dyed plastic bottle.',
    imageUrl: IMG_PERSONAL,
    priceCents: 22500, // ₹225
    packagingSummary: 'Single-use dyed virgin PET #1 plastic flip-top bottle',
    packagingType: 'virgin_plastic',
    originCountry: 'India',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 48,
      packaging: 44,
      ethics: 52,
      energy: 46,
      ingredientExplanation:
        'Relies on harsher ethoxylated sulfates, synthetic dyes, and undisclosed synthetic fragrance.',
      packagingExplanation:
        'Single-use dark-dyed plastic bottle with zero recycled content; dark pigments reduce optical sortability.',
      ethicsExplanation:
        'Parent conglomerate publishes general ESG targets without product-level ingredient traceability.',
      energyExplanation:
        'High water content shipping weight and virgin petroleum-derived plastic production.',
      ingredientSource: 'INCI Reference',
      packagingSource: 'Demo Packaging Classification',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Sodium Laureth Sulfate',
        inciName: 'SODIUM LAURETH SULFATE',
        purpose: 'Foaming detergent surfactant',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted cosmetic surfactant; ethoxylation process requires strict purification controls.',
        warningText: 'Can be drying for sensitive skin and scalp barriers.',
        sourceName: 'CIR / EU CosIng Reference',
      },
      {
        name: 'Parfum (Synthetic Fragrance)',
        inciName: 'PARFUM',
        purpose: 'Scent',
        safetyStatus: 'limited_info',
        regulatoryInfo: 'Proprietary fragrance blend; full composition not publicly listed.',
        warningText: 'Undisclosed scent components limit full transparency.',
        sourceName: 'Label Transparency Assessment',
      },
      {
        name: 'CI 42090 (Blue No. 1)',
        inciName: 'CI 42090',
        purpose: 'Synthetic colorant',
        safetyStatus: 'attention',
        regulatoryInfo: 'Permitted synthetic dye for rinse-off cosmetics.',
        warningText: 'Non-functional petroleum-derived aesthetic dye.',
        sourceName: 'EU Cosmetics Regulation Annex IV',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Personal Care)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },

  // ===================== HOUSEHOLD PRODUCTS (INDIA) =====================
  {
    barcode: '8904400004018',
    name: 'Concentrated Multi-Surface Refill Kit (Glass + Tablets)',
    brand: 'Nori Home India',
    category: 'household',
    description:
      'Reusable smoked-glass spray bottle paired with waterless biodegradable cleaning tablets in a home-compostable kraft pouch.',
    imageUrl: IMG_HOUSEHOLD,
    priceCents: 39900, // ₹399
    packagingSummary: 'Reusable heavy-gauge smoked glass spray bottle + compostable paper tablet refill pouch',
    packagingType: 'refillable_glass_tablets',
    originCountry: 'India (Mumbai)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 92,
      packaging: 96,
      ethics: 88,
      energy: 91,
      ingredientExplanation:
        'Plant-derived mineral salts and biodegradable surfactants; zero chlorine bleach, ammonia, or volatile organic solvents.',
      packagingExplanation:
        'Refill tablet system eliminates repeated single-use plastic spray bottles across dozens of refill cycles.',
      ethicsExplanation:
        'Full ingredient disclosure on front and back labels; BIS / green-chemistry aligned formulation.',
      energyExplanation:
        'Concentrated dry tablets eliminate shipping water weight, slashing freight energy footprint.',
      ingredientSource: 'EPA Safer Choice / Green Chemistry Reference',
      packagingSource: 'India EPR / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Citric Acid',
        purpose: 'Mineral descaler and pH balancer',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'EPA Safer Choice recognized organic acid; rapidly biodegradable.',
        sourceName: 'EPA Safer Chemical Ingredients List',
      },
      {
        name: 'Sodium Carbonate',
        purpose: 'Alkaline grease-cutting mineral salt',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Common mineral washing soda listed on EPA Safer Chemical Ingredients List.',
        sourceName: 'EPA Safer Chemical Ingredients List',
      },
      {
        name: 'Sodium Lauryl Sulfoacetate (Plant-Derived)',
        purpose: 'Mild biodegradable foaming surfactant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Coconut-derived surfactant distinct from SLS; readily biodegradable.',
        sourceName: 'Green Chemistry Surfactant Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Household)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8904400004025',
    name: 'Lemongrass & Bio-Enzyme Kitchen Spray (PCR Bottle)',
    brand: 'Hearth & Leaf India',
    category: 'household',
    description:
      'Ready-to-use plant-derived kitchen degreaser formulated with natural citrus bio-enzymes in a 100% post-consumer recycled HDPE bottle.',
    imageUrl: IMG_HOUSEHOLD,
    priceCents: 24900, // ₹249
    packagingSummary: '100% PCR HDPE plastic spray bottle with recyclable trigger',
    packagingType: 'pcr_plastic',
    originCountry: 'India (Bengaluru)',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 84,
      packaging: 70,
      ethics: 78,
      energy: 66,
      ingredientExplanation:
        'Biodegradable plant surfactants and citrus bio-enzymes; transparent ingredient list.',
      packagingExplanation:
        '100% recycled HDPE bottle improves on virgin plastic, though trigger mechanisms remain hard to recycle.',
      ethicsExplanation:
        'Publishes ingredient disclosure and cruelty-free verification.',
      energyExplanation:
        'Ready-to-use liquid format is >90% water by weight, increasing transport energy relative to concentrates.',
      ingredientSource: 'EPA Safer Choice Reference',
      packagingSource: 'India EPR / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Water',
        purpose: 'Solvent',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Standard formulation water.',
        sourceName: 'General Reference',
      },
      {
        name: 'Caprylyl/Myristyl Glucoside',
        purpose: 'Plant-derived grease-dissolving surfactant',
        safetyStatus: 'verified_safe',
        regulatoryInfo: 'Listed on EPA Safer Chemical Ingredients List.',
        sourceName: 'EPA Safer Chemical Ingredients List',
      },
      {
        name: 'D-Limonene (Citrus Peel Extract)',
        purpose: 'Natural degreaser and scent',
        safetyStatus: 'attention',
        regulatoryInfo: 'Natural citrus terpene; classified as a potential skin sensitizer in concentrated form.',
        warningText: 'Use with normal ventilation; mild skin sensitizer if left un-rinsed on sensitive hands.',
        sourceName: 'ECHA / EU CLP Reference',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Household)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
  {
    barcode: '8904400004032',
    name: 'Ultra-Power Bleach Kitchen Spray',
    brand: 'ChemBrite',
    category: 'household',
    description:
      'Heavy-duty hypochlorite bleach cleaner in a single-use virgin HDPE trigger bottle with synthetic fragrance and incomplete disclosure.',
    imageUrl: IMG_HOUSEHOLD,
    priceCents: 18500, // ₹185
    packagingSummary: 'Single-use virgin opaque plastic bottle with multi-polymer trigger sprayer',
    packagingType: 'virgin_plastic',
    originCountry: 'India',
    isSampleData: true,
    sourceLabel: 'SUvita India Demo Reference Catalog',
    scores: {
      ingredient: 26,
      packaging: 30,
      ethics: 34,
      energy: 32,
      ingredientExplanation:
        'Contains sodium hypochlorite and caustic soda with respiratory and aquatic toxicity hazards.',
      packagingExplanation:
        'Single-use virgin plastic bottle and composite sprayer rarely recycled after household chemical use.',
      ethicsExplanation:
        'Does not publish complete fragrance or surfactant breakdown on consumer packaging.',
      energyExplanation:
        'Chlor-alkali industrial manufacturing process is highly energy intensive.',
      ingredientSource: 'OSHA / ECHA Hazard Reference',
      packagingSource: 'India PWM / Packaging Reference',
      ethicsSource: 'Demo Brand Transparency Profile',
      energySource: 'Demo Lifecycle Indicator',
    },
    ingredients: [
      {
        name: 'Sodium Hypochlorite (2.4%)',
        purpose: 'Oxidizing bleaching and disinfecting agent',
        safetyStatus: 'attention',
        regulatoryInfo: 'Regulated biocide; acute aquatic toxicity and respiratory irritant if mixed with acids or ammonia.',
        warningText: 'Never mix with vinegar or acid toilet cleaners (releases hazardous chlorine gas). High aquatic toxicity.',
        sourceName: 'ECHA / EPA Regulatory Database',
      },
      {
        name: 'Sodium Hydroxide',
        purpose: 'Strong alkaline degreaser',
        safetyStatus: 'attention',
        regulatoryInfo: 'Corrosive alkaline agent; regulated eye and skin irritant.',
        warningText: 'Avoid direct skin or eye contact.',
        sourceName: 'ECHA CLP Reference',
      },
      {
        name: 'Proprietary Surfactant & Fragrance Blend',
        purpose: 'Wetting and odor masking',
        safetyStatus: 'limited_info',
        regulatoryInfo: 'Exact chemical identities withheld as trade secret on label.',
        warningText: 'Lack of ingredient disclosure prevents full environmental persistence evaluation.',
        sourceName: 'Label Transparency Assessment',
      },
    ],
    sources: [
      {
        sourceName: 'SUvita India Demo Reference Catalog (Household)',
        sourceType: 'demo_catalog',
        licenseNote: 'Demonstration product record.',
        isVerifiedExternal: false,
      },
    ],
  },
];

export const DAILY_INSIGHTS = [
  {
    title: 'Why MLP Wrappers Are India’s Hardest Packaging Stream',
    body: 'Multi-layer plastic (MLP) sachets and snack wrappers bond foil and multiple polymers together, making municipal recycling difficult across Indian cities. Choosing mono-material paper, glass, or compostable wraps dramatically improves real-world recovery.',
    source: 'SUvita India Packaging & EPR Guide',
    category: 'Packaging',
  },
  {
    title: 'Why Waterless Shampoo Bars & Refill Tablets Outperform Liquid Bottles',
    body: 'Conventional liquid shampoos and household cleaners are 80–90% water by weight. Switching to solid reetha shampoo bars or dissolvable refill tablets eliminates repeated single-use plastic bottles and cuts freight emissions.',
    source: 'SUvita EcoScore Packaging Methodology',
    category: 'Packaging',
  },
  {
    title: 'Reading "Parfum" and "Fragrance" on Cosmetic Labels',
    body: 'Because fragrance formulas are frequently protected as trade secrets, a single word like "Parfum" can represent dozens of undisclosed compounds. Choosing brands that disclose full INCI lists or go fragrance-free raises ingredient transparency.',
    source: 'BIS & EU Cosmetics Labelling Guide',
    category: 'Ingredient Transparency',
  },
  {
    title: 'Why Missing Data Matters More Than Guessing',
    body: 'A sustainability score is only as trustworthy as the evidence behind it. When packaging materials or brand disclosures are absent, SUvita marks them as Insufficient Data and lowers the confidence indicator instead of inflating a rating.',
    source: 'SUvita EcoScore v1.0 Methodology',
    category: 'Methodology',
  },
];
