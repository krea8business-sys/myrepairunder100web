/**
 * Lightweight i18n foundation. English is complete; Hindi covers the main navigation and
 * homepage chrome. Add keys to `hi` to translate more of the UI — missing keys fall back to English.
 */
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "mru_lang";

const en = {
  "nav.home": "Home",
  "nav.services": "Services",
  "nav.cart": "Cart",
  "nav.track": "Track Booking",
  "nav.support": "Support",
  "nav.areas": "Service areas",
  "header.area": "Delhi NCR",
  "header.checkPincode": "Check your pincode",
  "hero.eyebrow": "AC & home appliance repair · Delhi NCR",
  "hero.title": "Expert Home Appliance Repair at Your Convenience.",
  "hero.body":
    "AC service and repair, washing machine, refrigerator and microwave repair at your doorstep across Delhi NCR. Book in minutes — no account needed.",
  "hero.cta": "Book a Service",
  "hero.secondary": "Track a booking",
  "home.categories": "What needs fixing?",
  "home.categoriesSub": "Choose an appliance to see services and prices.",
  "home.explore": "Explore Services",
  "home.popular": "Popular services",
  "home.how": "How it works",
  "home.trust": "Why book with us",
  "home.areas": "Where we serve",
  "home.faq": "Frequently asked questions",
  "cart.proceed": "Proceed to Booking",
  "common.add": "Add",
} as const;

export type DictKey = keyof typeof en;

const hi: Partial<Record<DictKey, string>> = {
  "nav.home": "होम",
  "nav.services": "सेवाएं",
  "nav.cart": "कार्ट",
  "nav.track": "बुकिंग ट्रैक करें",
  "nav.support": "सहायता",
  "nav.areas": "सेवा क्षेत्र",
  "header.area": "दिल्ली NCR",
  "header.checkPincode": "अपना पिनकोड जांचें",
  "hero.eyebrow": "AC और होम अप्लायंस रिपेयर · दिल्ली NCR",
  "hero.title": "घर बैठे भरोसेमंद अप्लायंस रिपेयर।",
  "hero.body": "पूरे दिल्ली NCR में AC सर्विस और रिपेयर, वॉशिंग मशीन, फ्रिज और माइक्रोवेव रिपेयर। मिनटों में बुक करें — कोई अकाउंट ज़रूरी नहीं।",
  "hero.cta": "सर्विस बुक करें",
  "hero.secondary": "बुकिंग ट्रैक करें",
  "home.categories": "क्या ठीक करवाना है?",
  "home.categoriesSub": "सेवाएं और कीमतें देखने के लिए अप्लायंस चुनें।",
  "home.explore": "सेवाएं देखें",
  "home.popular": "लोकप्रिय सेवाएं",
  "home.how": "कैसे काम करता है",
  "home.trust": "हमें क्यों चुनें",
  "home.areas": "हम कहाँ सेवा देते हैं",
  "home.faq": "अक्सर पूछे जाने वाले सवाल",
  "cart.proceed": "बुकिंग के लिए आगे बढ़ें",
  "common.add": "जोड़ें",
};

const dicts: Record<Lang, Partial<Record<DictKey, string>>> = { en, hi };

export function translator(lang: Lang) {
  return (key: DictKey) => dicts[lang][key] ?? en[key];
}

export function parseLang(v: string | undefined | null): Lang {
  return v === "hi" ? "hi" : "en";
}
