export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number; // BDT
  duration?: string; // for salon
  image?: string; // for restaurant
}

// ---- Salon services (Bangladeshi context) ------------------------------
export const SALON_MENU: MenuItem[] = [
  { id: "s1",  name: "Classic Haircut",        category: "Hair",          price: 350,  duration: "30 min",  image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=70" },
  { id: "s2",  name: "Premium Hair Style",     category: "Hair",          price: 750,  duration: "45 min",  image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=70" },
  { id: "s3",  name: "Beard Trim & Shape",     category: "Beard",         price: 250,  duration: "20 min",  image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=70" },
  { id: "s4",  name: "Hot Towel Shave",        category: "Beard",         price: 350,  duration: "25 min",  image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=70" },
  { id: "s5",  name: "Hair Color (Black)",     category: "Hair",          price: 1200, duration: "60 min",  image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&q=70" },
  { id: "s6",  name: "Hair Spa",               category: "Hair",          price: 1500, duration: "60 min",  image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400&q=70" },
  { id: "s7",  name: "Keratin Treatment",      category: "Hair",          price: 4500, duration: "120 min", image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=70" },
  { id: "s8",  name: "Facial — Herbal",        category: "Facial",        price: 900,  duration: "45 min",  image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=70" },
  { id: "s9",  name: "Facial — Gold Glow",     category: "Facial",        price: 2200, duration: "60 min",  image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=70" },
  { id: "s10", name: "Threading (Eyebrow)",    category: "Facial",        price: 100,  duration: "10 min",  image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=70" },
  { id: "s11", name: "Manicure",               category: "Hands & Feet",  price: 600,  duration: "30 min",  image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=70" },
  { id: "s12", name: "Pedicure",               category: "Hands & Feet",  price: 800,  duration: "40 min",  image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&q=70" },
  { id: "s13", name: "Full Body Massage",      category: "Massage",       price: 2500, duration: "60 min",  image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=70" },
  { id: "s14", name: "Head & Shoulder Massage",category: "Massage",       price: 800,  duration: "30 min",  image: "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=400&q=70" },
  { id: "s15", name: "Mehedi (Bridal)",        category: "Bridal",        price: 3500, duration: "90 min",  image: "https://images.unsplash.com/photo-1610465299996-30f240ac2b1c?w=400&q=70" },
];

// ---- Restaurant menu (Bangladeshi context) -----------------------------
// Free image URLs (Unsplash) — works without download.
export const RESTAURANT_MENU: MenuItem[] = [
  {
    id: "r1", name: "Kacchi Biryani", category: "Biryani", price: 380,
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&q=70",
  },
  {
    id: "r2", name: "Morog Polao", category: "Biryani", price: 320,
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=70",
  },
  {
    id: "r3", name: "Beef Tehari", category: "Biryani", price: 280,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=70",
  },
  {
    id: "r4", name: "Chicken Roast", category: "Curry", price: 260,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=70",
  },
  {
    id: "r5", name: "Beef Bhuna", category: "Curry", price: 320,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=70",
  },
  {
    id: "r6", name: "Hilsa Curry (Ilish)", category: "Curry", price: 450,
    image: "https://images.unsplash.com/photo-1626500155435-a8eccebd0aa1?w=400&q=70",
  },
  {
    id: "r7", name: "Shorshe Ilish", category: "Curry", price: 520,
    image: "https://images.unsplash.com/photo-1631292784640-2b24be784d5d?w=400&q=70",
  },
  {
    id: "r8", name: "Plain Rice", category: "Rice", price: 60,
    image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&q=70",
  },
  {
    id: "r9", name: "Naan Bread", category: "Bread", price: 40,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=70",
  },
  {
    id: "r10", name: "Ruti (4 pcs)", category: "Bread", price: 50,
    image: "https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?w=400&q=70",
  },
  {
    id: "r11", name: "Daal Bhuna", category: "Sides", price: 90,
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=70",
  },
  {
    id: "r12", name: "Borhani (1 glass)", category: "Drinks", price: 80,
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=70",
  },
  {
    id: "r13", name: "Fresh Lime Soda", category: "Drinks", price: 70,
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=70",
  },
  {
    id: "r14", name: "Mishti Doi", category: "Dessert", price: 120,
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=70",
  },
  {
    id: "r15", name: "Roshogolla (2 pcs)", category: "Dessert", price: 90,
    image: "https://images.unsplash.com/photo-1605197788044-5c8a2d4b8b1b?w=400&q=70",
  },
  {
    id: "r16", name: "Firni", category: "Dessert", price: 110,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=70",
  },
];

export function menuFor(role: "salon" | "restaurant"): MenuItem[] {
  return role === "salon" ? SALON_MENU : RESTAURANT_MENU;
}
