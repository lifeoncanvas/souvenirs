const fs = require('fs');
const path = require('path');

const prodDir = path.resolve('c:/Users/Sharon/souvneirs/souvenirs/frontend/public/images/products');
const catDir = path.resolve('c:/Users/Sharon/souvneirs/souvenirs/frontend/public/images/categories');

fs.mkdirSync(prodDir, { recursive: true });
fs.mkdirSync(catDir, { recursive: true });

function createSvg({ title, subtitle, iconSvg, accent = '#D4AF37', bgTheme = 'dark' }) {
  const isDark = bgTheme === 'dark';
  const bg1 = isDark ? '#211C18' : '#FAF8F5';
  const bg2 = isDark ? '#14100E' : '#EFEAE1';
  const textColor = isDark ? '#F5F2EB' : '#1C1815';
  const subColor = isDark ? '#C5A880' : '#8A7356';
  const borderColor = isDark ? 'url(#gold)' : '#D4AF37';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F2E3C6"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#AA8232"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="${isDark ? '0.12' : '0.08'}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000" flood-opacity="${isDark ? '0.5' : '0.15'}"/>
    </filter>
  </defs>

  <rect width="800" height="1000" fill="url(#bg)"/>
  <rect width="800" height="1000" fill="url(#glow)"/>

  <!-- Luxury Borders -->
  <rect x="36" y="36" width="728" height="928" fill="none" stroke="${borderColor}" stroke-width="1" opacity="0.35"/>
  <rect x="44" y="44" width="712" height="912" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.2"/>

  <!-- Decorative Corner Accents -->
  <path d="M 54 64 L 64 64 L 64 54" fill="none" stroke="url(#gold)" stroke-width="1.5"/>
  <path d="M 746 64 L 736 64 L 736 54" fill="none" stroke="url(#gold)" stroke-width="1.5"/>
  <path d="M 54 936 L 64 936 L 64 946" fill="none" stroke="url(#gold)" stroke-width="1.5"/>
  <path d="M 746 936 L 736 936 L 736 946" fill="none" stroke="url(#gold)" stroke-width="1.5"/>

  <!-- Center Artwork / Illustration -->
  <g filter="url(#shadow)" transform="translate(400, 460)">
    ${iconSvg}
  </g>

  <!-- Title & Branding -->
  <g transform="translate(400, 750)">
    <text text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="28" font-weight="600" fill="url(#gold)" letter-spacing="3">${title.toUpperCase()}</text>
    <text y="36" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="18" font-weight="400" fill="${textColor}" letter-spacing="4" opacity="0.85">${subtitle.toUpperCase()}</text>
    <line x1="-60" y1="62" x2="60" y2="62" stroke="url(#gold)" stroke-width="1" opacity="0.6"/>
    <text y="92" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${subColor}" letter-spacing="3" opacity="0.85">LICHT SIGNATURE SOUVENIRS</text>
  </g>
</svg>`;
}

const products = [
  {
    slug: 'the-signature-keepsake-box',
    title: 'The Signature',
    subtitle: 'Keepsake Box',
    iconSvg: `
      <polygon points="-120,-80 120,-80 160,-20 -80,-20" fill="#3D322B" stroke="url(#gold)" stroke-width="1.5"/>
      <polygon points="-160,0 80,0 160,-20 -80,-20" fill="#251E1A" stroke="url(#gold)" stroke-width="1.5"/>
      <polygon points="-160,0 -160,140 80,140 80,0" fill="#201A16" stroke="url(#gold)" stroke-width="1.5"/>
      <polygon points="80,0 160,-20 160,120 80,140" fill="#171310" stroke="url(#gold)" stroke-width="1.5"/>
      <rect x="-50" y="0" width="20" height="140" fill="url(#gold)" opacity="0.9"/>
      <ellipse cx="-40" cy="0" rx="20" ry="10" fill="none" stroke="url(#gold)" stroke-width="2"/>
    `
  },
  {
    slug: 'monogrammed-ring-dish',
    title: 'Monogrammed',
    subtitle: 'Porcelain Ring Dish',
    iconSvg: `
      <ellipse cx="0" cy="30" rx="150" ry="85" fill="#EAE5DC" stroke="url(#gold)" stroke-width="3"/>
      <ellipse cx="0" cy="26" rx="130" ry="70" fill="#F4EFE6" stroke="url(#gold)" stroke-width="1" opacity="0.7"/>
      <ellipse cx="0" cy="22" rx="100" ry="50" fill="#FAF7F2"/>
      <circle cx="-15" cy="18" r="30" fill="none" stroke="url(#gold)" stroke-width="3"/>
      <circle cx="20" cy="24" r="24" fill="none" stroke="url(#gold)" stroke-width="2.5"/>
      <text x="0" y="28" text-anchor="middle" font-family="serif" font-size="28" font-style="italic" fill="#C5A880">L &amp; S</text>
    `
  },
  {
    slug: 'personalised-soy-candle',
    title: 'Personalised',
    subtitle: 'Amber Soy Candle',
    iconSvg: `
      <!-- Candle Flame -->
      <path d="M 0,-140 Q 20,-100 0,-70 Q -20,-100 0,-140" fill="url(#gold)"/>
      <circle cx="0" cy="-90" r="8" fill="#FFF8E7"/>
      <line x1="0" y1="-70" x2="0" y2="-50" stroke="#443322" stroke-width="3"/>
      <!-- Glass Jar -->
      <rect x="-80" y="-50" width="160" height="210" rx="10" fill="#8A4A1C" stroke="url(#gold)" stroke-width="2" opacity="0.95"/>
      <rect x="-70" y="-45" width="20" height="200" fill="#FFFFFF" opacity="0.15"/>
      <!-- Label -->
      <rect x="-60" y="0" width="120" height="120" rx="4" fill="#FAF6ED" stroke="#D4AF37" stroke-width="1"/>
      <text x="0" y="45" text-anchor="middle" font-family="serif" font-size="14" fill="#211C18" letter-spacing="2">NO. 07</text>
      <text x="0" y="70" text-anchor="middle" font-family="serif" font-size="11" font-weight="bold" fill="#8C6D46" letter-spacing="1">AMBER &amp; CEDAR</text>
      <text x="0" y="90" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#555" letter-spacing="2">SOY CANDLE</text>
    `
  },
  {
    slug: 'hand-thrown-keepsake-cups',
    title: 'Hand-Thrown',
    subtitle: 'Stoneware Cups',
    iconSvg: `
      <!-- Cup 1 -->
      <path d="M -110,-20 L -80,120 Q -40,135 0,120 L 30,-20 Q -40,-35 -110,-20 Z" fill="#D6CDC4" stroke="url(#gold)" stroke-width="2"/>
      <ellipse cx="-40" cy="-20" rx="70" ry="16" fill="#EDE7DF" stroke="url(#gold)" stroke-width="1.5"/>
      <!-- Cup 2 (offset) -->
      <path d="M -10,10 L 15,130 Q 55,145 95,130 L 120,10 Q 55,-5 -10,10 Z" fill="#C2B7AC" stroke="url(#gold)" stroke-width="2"/>
      <ellipse cx="55" cy="10" rx="65" ry="15" fill="#DDD5CB" stroke="url(#gold)" stroke-width="1.5"/>
    `
  },
  {
    slug: 'initial-pendant-necklace',
    title: 'Initial Pendant',
    subtitle: 'Fine Gold Necklace',
    iconSvg: `
      <!-- Chain Arc -->
      <path d="M -120,-120 Q 0,40 120,-120" fill="none" stroke="url(#gold)" stroke-width="2.5" stroke-dasharray="4,2"/>
      <!-- Pendant -->
      <circle cx="0" cy="55" r="50" fill="#FAF7F2" stroke="url(#gold)" stroke-width="4"/>
      <circle cx="0" cy="55" r="42" fill="none" stroke="url(#gold)" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="0" cy="0" r="6" fill="url(#gold)"/>
      <text x="0" y="68" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="40" font-weight="bold" fill="url(#gold)">L</text>
    `
  },
  {
    slug: 'engraved-celebration-bracelet',
    title: 'Celebration',
    subtitle: 'Engraved Cuff Bracelet',
    iconSvg: `
      <ellipse cx="0" cy="30" rx="140" ry="70" fill="none" stroke="url(#gold)" stroke-width="22" stroke-dasharray="550" stroke-dashoffset="60"/>
      <text x="0" y="36" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="12" fill="#1C1815" letter-spacing="4">XIV · VI · MMXXVII</text>
    `
  },
  {
    slug: 'leather-travel-pouch',
    title: 'Leather',
    subtitle: 'Travel Pouch',
    iconSvg: `
      <rect x="-140" y="-60" width="280" height="180" rx="14" fill="#5C3B24" stroke="url(#gold)" stroke-width="2"/>
      <rect x="-130" y="-50" width="260" height="160" rx="10" fill="none" stroke="url(#gold)" stroke-width="1" stroke-dasharray="6,4" opacity="0.6"/>
      <!-- Zipper -->
      <rect x="-140" y="-60" width="280" height="18" rx="4" fill="#3D2616"/>
      <circle cx="100" cy="-51" r="7" fill="url(#gold)"/>
      <!-- Monogram Stamp -->
      <rect x="-35" y="10" width="70" height="50" rx="6" fill="#4A2F1C" stroke="url(#gold)" stroke-width="1"/>
      <text x="0" y="42" text-anchor="middle" font-family="serif" font-size="18" fill="url(#gold)" letter-spacing="2">LICHT</text>
    `
  },
  {
    slug: 'linen-notebook-pen-set',
    title: 'Linen Notebook',
    subtitle: '& Pen Keepsake Set',
    iconSvg: `
      <!-- Notebook -->
      <rect x="-120" y="-80" width="190" height="240" rx="6" fill="#DDD5CB" stroke="url(#gold)" stroke-width="2"/>
      <rect x="-120" y="-80" width="25" height="240" rx="2" fill="#BAAF9F"/>
      <!-- Gold Ribbon Bookmark -->
      <path d="M -30,-80 L -30,170 L -20,158 L -10,170 L -10,-80 Z" fill="url(#gold)"/>
      <!-- Pen -->
      <g transform="translate(110, -60) rotate(22)">
        <rect x="-6" y="0" width="12" height="240" rx="6" fill="#1C1815" stroke="url(#gold)" stroke-width="1.5"/>
        <polygon points="-6,240 6,240 0,260" fill="url(#gold)"/>
        <rect x="-6" y="20" width="12" height="15" fill="url(#gold)"/>
      </g>
    `
  },
  {
    slug: 'canvas-event-tote',
    title: 'Natural Canvas',
    subtitle: 'Event Favour Tote',
    iconSvg: `
      <!-- Handles -->
      <path d="M -60,-20 C -60,-120 60,-120 60,-20" fill="none" stroke="#C5A880" stroke-width="16"/>
      <!-- Bag Body -->
      <polygon points="-120,-20 120,-20 100,160 -100,160" fill="#EAE2D5" stroke="url(#gold)" stroke-width="2"/>
      <!-- Print -->
      <circle cx="0" cy="70" r="35" fill="none" stroke="#251E1A" stroke-width="1.5"/>
      <text x="0" y="74" text-anchor="middle" font-family="'Playfair Display', serif" font-size="13" fill="#251E1A" letter-spacing="2">CELEBRATE</text>
    `
  },
  {
    slug: 'artisan-chocolate-favour-box',
    title: 'Artisan Chocolate',
    subtitle: 'Favour Box',
    iconSvg: `
      <rect x="-130" y="-50" width="260" height="180" rx="10" fill="#362216" stroke="url(#gold)" stroke-width="2"/>
      <!-- Belly Band -->
      <rect x="-130" y="10" width="260" height="60" fill="#FAF6EE" stroke="url(#gold)" stroke-width="1"/>
      <text x="0" y="46" text-anchor="middle" font-family="serif" font-size="14" fill="#211C18" letter-spacing="3">FINE CONFECTIONERY</text>
    `
  },
  {
    slug: 'the-botanical-ritual-box',
    title: 'The Botanical',
    subtitle: 'Ritual Keepsake Box',
    iconSvg: `
      <!-- Box -->
      <rect x="-130" y="-40" width="260" height="190" rx="8" fill="#232B25" stroke="url(#gold)" stroke-width="2"/>
      <!-- Sprig / Leaf Vector -->
      <path d="M 0,110 Q 0,0 40,-60 M 10,60 Q 30,50 35,35 M -10,30 Q -30,20 -35,5 M 15,0 Q 35,-10 40,-25 M -15,-30 Q -35,-40 -40,-55" fill="none" stroke="url(#gold)" stroke-width="3"/>
    `
  },
  {
    slug: 'pressed-bloom-keepsake-frame',
    title: 'Pressed Bloom',
    subtitle: 'Oak Float Frame',
    iconSvg: `
      <!-- Oak Frame -->
      <rect x="-120" y="-80" width="240" height="260" rx="4" fill="#755238" stroke="url(#gold)" stroke-width="3"/>
      <rect x="-95" y="-55" width="190" height="210" fill="#EDE6DC" stroke="url(#gold)" stroke-width="1"/>
      <!-- Float Glass & Pressed Flower -->
      <path d="M 0,90 Q 5,10 0,-20" stroke="#8A7356" stroke-width="3" fill="none"/>
      <circle cx="0" cy="-20" r="16" fill="url(#gold)"/>
      <ellipse cx="-20" cy="-20" rx="14" ry="8" fill="#C5A880"/>
      <ellipse cx="20" cy="-20" rx="14" ry="8" fill="#C5A880"/>
      <ellipse cx="0" cy="-40" rx="8" ry="14" fill="#C5A880"/>
      <ellipse cx="0" cy="0" rx="8" ry="14" fill="#C5A880"/>
    `
  },
  {
    slug: 'default',
    title: 'Signature Piece',
    subtitle: 'Luxury Souvenir',
    iconSvg: `
      <polygon points="0,-90 70,-45 70,45 0,90 -70,45 -70,-45" fill="none" stroke="url(#gold)" stroke-width="3"/>
      <circle cx="0" cy="0" r="30" fill="none" stroke="url(#gold)" stroke-width="1.5"/>
      <text x="0" y="8" text-anchor="middle" font-family="'Playfair Display', serif" font-size="24" fill="url(#gold)">L</text>
    `
  }
];

const categories = [
  {
    slug: 'wedding-souvenirs',
    title: 'Wedding',
    subtitle: 'Souvenirs & Keepsakes',
    iconSvg: `
      <circle cx="-30" cy="10" r="60" fill="none" stroke="url(#gold)" stroke-width="5"/>
      <circle cx="30" cy="10" r="60" fill="none" stroke="url(#gold)" stroke-width="5"/>
    `
  },
  {
    slug: 'birthday-gifts',
    title: 'Birthday',
    subtitle: 'Milestone Celebrations',
    iconSvg: `
      <rect x="-80" y="-20" width="160" height="130" rx="6" fill="#2E241E" stroke="url(#gold)" stroke-width="2"/>
      <line x1="0" y1="-20" x2="0" y2="110" stroke="url(#gold)" stroke-width="12"/>
      <path d="M 0,-20 C -40,-70 0,-70 0,-20 C 0,-70 40,-70 0,-20" fill="url(#gold)"/>
    `
  },
  {
    slug: 'corporate-gifts',
    title: 'Corporate',
    subtitle: 'Refined Client Gifting',
    iconSvg: `
      <rect x="-100" y="-30" width="200" height="140" rx="8" fill="#1E232A" stroke="url(#gold)" stroke-width="2"/>
      <rect x="-35" y="-60" width="70" height="30" rx="4" fill="none" stroke="url(#gold)" stroke-width="3"/>
      <circle cx="0" cy="40" r="12" fill="url(#gold)"/>
    `
  },
  {
    slug: 'personalised-gifts',
    title: 'Personalised',
    subtitle: 'Names, Dates & Messages',
    iconSvg: `
      <circle cx="0" cy="15" r="70" fill="none" stroke="url(#gold)" stroke-width="3"/>
      <text x="0" y="32" text-anchor="middle" font-family="'Playfair Display', serif" font-size="52" font-style="italic" fill="url(#gold)">L</text>
    `
  },
  {
    slug: 'gift-boxes',
    title: 'Gift Boxes',
    subtitle: 'Curated Keepsake Sets',
    iconSvg: `
      <rect x="-100" y="-40" width="200" height="150" rx="6" fill="#2B211A" stroke="url(#gold)" stroke-width="2"/>
      <line x1="-100" y1="35" x2="100" y2="35" stroke="url(#gold)" stroke-width="8"/>
      <line x1="0" y1="-40" x2="0" y2="110" stroke="url(#gold)" stroke-width="8"/>
      <circle cx="0" cy="-40" r="18" fill="url(#gold)"/>
    `
  }
];

products.forEach(p => {
  const content = createSvg(p);
  fs.writeFileSync(path.join(prodDir, `${p.slug}.svg`), content, 'utf8');
});

categories.forEach(c => {
  const content = createSvg(c);
  fs.writeFileSync(path.join(catDir, `${c.slug}.svg`), content, 'utf8');
});

console.log('Successfully generated all product and category SVG images in frontend/public/images/');

