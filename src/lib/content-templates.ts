export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
}

export interface ContentSnippet {
  id: string;
  name: string;
  content: string;
  category: string;
  shortcut?: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // Overview Templates
  {
    id: 'overview-beach-destination',
    name: 'Beach Destination Overview',
    description: 'Perfect for coastal destinations with beaches and water activities',
    category: 'overview',
    tags: ['beach', 'coastal', 'water', 'sun'],
    content: `<h3>Welcome to Paradise</h3>
<p>Discover the stunning beauty of [Destination Name], where pristine beaches meet vibrant culture and endless adventure. This breathtaking destination offers the perfect blend of relaxation and excitement, making it an ideal getaway for travelers seeking both tranquility and thrills.</p>

<h4>What Makes This Special</h4>
<ul>
<li>🏖️ Crystal-clear waters and golden sandy beaches</li>
<li>🏛️ Rich cultural heritage and local traditions</li>
<li>🍽️ World-class dining and entertainment</li>
<li>☀️ Perfect weather year-round</li>
<li>🎯 Endless activities for all ages</li>
</ul>

<blockquote>
<p>"A destination where every sunset paints a new masterpiece and every day brings a new adventure."</p>
</blockquote>`
  },
  {
    id: 'overview-city-destination',
    name: 'City Destination Overview',
    description: 'Ideal for urban destinations with culture, shopping, and nightlife',
    category: 'overview',
    tags: ['city', 'urban', 'culture', 'shopping'],
    content: `<h3>Urban Adventure Awaits</h3>
<p>Experience the dynamic energy of [Destination Name], a vibrant metropolis where modern innovation meets timeless tradition. This cosmopolitan hub offers an unparalleled urban experience with world-class attractions, diverse neighborhoods, and endless possibilities.</p>

<h4>City Highlights</h4>
<ul>
<li>🏙️ Iconic skyline and architectural marvels</li>
<li>🎨 Rich arts and cultural scene</li>
<li>🛍️ Premier shopping districts</li>
<li>🍴 Diverse culinary landscape</li>
<li>🚇 Excellent public transportation</li>
</ul>

<p><strong>Perfect for:</strong> Culture enthusiasts, food lovers, shopping aficionados, and urban explorers.</p>`
  },

  // Accommodation Templates
  {
    id: 'accommodation-luxury',
    name: 'Luxury Accommodation',
    description: 'Showcase high-end hotels and resorts',
    category: 'accommodation',
    tags: ['luxury', '5-star', 'premium', 'resort'],
    content: `<h3>Luxury Stays</h3>
<p>Experience unparalleled comfort and sophistication in our carefully selected luxury accommodations. Each property offers exceptional service, premium amenities, and stunning locations.</p>

<h4>Featured Properties</h4>
<ul>
<li><strong>5-Star Resorts:</strong> All-inclusive luxury with world-class spas, gourmet dining, and private beaches</li>
<li><strong>Boutique Hotels:</strong> Intimate settings with personalized service and unique character</li>
<li><strong>Beachfront Villas:</strong> Private retreats with stunning ocean views and exclusive amenities</li>
<li><strong>City Penthouses:</strong> Urban sophistication with panoramic city views</li>
</ul>

<h4>Luxury Amenities</h4>
<ul>
<li>🏊‍♀️ Infinity pools and private beaches</li>
<li>🧘‍♀️ World-class spa and wellness centers</li>
<li>🍾 Michelin-starred restaurants</li>
<li>🛎️ 24/7 concierge service</li>
<li>🚁 Private transfers and helicopter tours</li>
</ul>`
  },
  {
    id: 'accommodation-budget',
    name: 'Budget-Friendly Options',
    description: 'Highlight affordable accommodation choices',
    category: 'accommodation',
    tags: ['budget', 'affordable', 'hostel', 'guesthouse'],
    content: `<h3>Comfortable & Affordable</h3>
<p>Enjoy great value accommodations without compromising on comfort or location. Our budget-friendly options provide excellent amenities and convenient access to all major attractions.</p>

<h4>Accommodation Types</h4>
<ul>
<li><strong>Modern Hostels:</strong> Clean, safe, and social environments perfect for backpackers</li>
<li><strong>Guesthouses:</strong> Family-run properties with local charm and personal touches</li>
<li><strong>Budget Hotels:</strong> Comfortable rooms with essential amenities at great prices</li>
<li><strong>Apartments:</strong> Self-catering options ideal for longer stays</li>
</ul>

<h4>What's Included</h4>
<ul>
<li>🛏️ Clean, comfortable rooms</li>
<li>🌐 Free Wi-Fi throughout</li>
<li>🍳 Kitchen facilities (selected properties)</li>
<li>🚌 Easy access to public transport</li>
<li>🗺️ Local area information and maps</li>
</ul>`
  },

  // Attractions Templates
  {
    id: 'attractions-cultural',
    name: 'Cultural Attractions',
    description: 'Highlight museums, historical sites, and cultural experiences',
    category: 'attractions',
    tags: ['culture', 'history', 'museums', 'heritage'],
    content: `<h3>Cultural Treasures</h3>
<p>Immerse yourself in the rich cultural heritage of [Destination Name]. From ancient monuments to contemporary art galleries, discover the stories that shaped this remarkable destination.</p>

<h4>Must-Visit Cultural Sites</h4>
<ul>
<li><strong>Historic Old Town:</strong> Wander through cobblestone streets and admire colonial architecture</li>
<li><strong>National Museum:</strong> Explore artifacts and exhibits showcasing local history</li>
<li><strong>Art Galleries:</strong> Discover works by renowned local and international artists</li>
<li><strong>Religious Sites:</strong> Visit beautiful churches, temples, or mosques with stunning architecture</li>
</ul>

<h4>Cultural Experiences</h4>
<ul>
<li>🎭 Traditional performances and festivals</li>
<li>🎨 Art workshops and cultural classes</li>
<li>🏛️ Guided historical tours</li>
<li>🎵 Local music and dance shows</li>
<li>📚 Literary walks and storytelling sessions</li>
</ul>`
  },

  // Beaches Templates
  {
    id: 'beaches-paradise',
    name: 'Paradise Beaches',
    description: 'Showcase beautiful beaches and water activities',
    category: 'beaches',
    tags: ['beach', 'swimming', 'water sports', 'paradise'],
    content: `<h3>Pristine Beaches</h3>
<p>Discover some of the world's most beautiful beaches, where crystal-clear waters meet soft, golden sand. Each beach offers its own unique character and attractions.</p>

<h4>Featured Beaches</h4>
<ul>
<li><strong>Main Beach:</strong> The heart of beach life with restaurants, bars, and water sports</li>
<li><strong>Secluded Cove:</strong> A hidden gem perfect for romantic getaways</li>
<li><strong>Family Beach:</strong> Shallow waters and gentle waves ideal for children</li>
<li><strong>Surfer's Paradise:</strong> Consistent waves and perfect conditions for surfing</li>
</ul>

<h4>Beach Activities</h4>
<ul>
<li>🏄‍♀️ Surfing and paddleboarding</li>
<li>🤿 Snorkeling and diving</li>
<li>🏐 Beach volleyball and games</li>
<li>🚤 Boat trips and island hopping</li>
<li>🌅 Sunrise and sunset watching</li>
</ul>

<blockquote>
<p><strong>Beach Tip:</strong> Visit early morning or late afternoon for the best lighting and fewer crowds.</p>
</blockquote>`
  },

  // Nightlife Templates
  {
    id: 'nightlife-vibrant',
    name: 'Vibrant Nightlife',
    description: 'Showcase bars, clubs, and evening entertainment',
    category: 'nightlife',
    tags: ['nightlife', 'bars', 'clubs', 'entertainment'],
    content: `<h3>After Dark Adventures</h3>
<p>When the sun sets, [Destination Name] comes alive with an electrifying nightlife scene. From sophisticated cocktail lounges to high-energy dance clubs, there's something for every night owl.</p>

<h4>Nightlife Districts</h4>
<ul>
<li><strong>Old Town:</strong> Historic bars and traditional taverns with local character</li>
<li><strong>Beach Strip:</strong> Beachfront bars with stunning ocean views</li>
<li><strong>Club Quarter:</strong> High-energy venues with international DJs</li>
<li><strong>Rooftop Scene:</strong> Elevated bars with panoramic city views</li>
</ul>

<h4>Entertainment Options</h4>
<ul>
<li>🍸 Craft cocktail bars and speakeasies</li>
<li>💃 Dance clubs with live DJs</li>
<li>🎤 Live music venues and concerts</li>
<li>🎭 Theater shows and performances</li>
<li>🌙 Night markets and street food</li>
</ul>`
  },

  // Dining Templates
  {
    id: 'dining-gourmet',
    name: 'Gourmet Dining',
    description: 'Highlight fine dining and culinary experiences',
    category: 'dining',
    tags: ['fine dining', 'gourmet', 'restaurants', 'cuisine'],
    content: `<h3>Culinary Excellence</h3>
<p>Embark on a gastronomic journey through [Destination Name]'s diverse culinary landscape. From Michelin-starred establishments to hidden local gems, every meal is an adventure.</p>

<h4>Dining Experiences</h4>
<ul>
<li><strong>Fine Dining:</strong> Award-winning restaurants with innovative cuisine</li>
<li><strong>Local Specialties:</strong> Authentic dishes showcasing regional flavors</li>
<li><strong>Seafood Excellence:</strong> Fresh catches prepared by master chefs</li>
<li><strong>International Fusion:</strong> Creative combinations of global cuisines</li>
</ul>

<h4>Must-Try Dishes</h4>
<ul>
<li>🦞 Fresh seafood platters</li>
<li>🥘 Traditional local stews</li>
<li>🍷 Wine pairings with regional vintages</li>
<li>🍰 Artisanal desserts and pastries</li>
<li>☕ Specialty coffee and local beverages</li>
</ul>

<blockquote>
<p><strong>Foodie Tip:</strong> Make reservations in advance for popular restaurants, especially during peak season.</p>
</blockquote>`
  },

  // Practical Templates
  {
    id: 'practical-comprehensive',
    name: 'Comprehensive Travel Guide',
    description: 'Essential practical information for travelers',
    category: 'practical',
    tags: ['practical', 'travel tips', 'logistics', 'information'],
    content: `<h3>Essential Travel Information</h3>
<p>Everything you need to know for a smooth and enjoyable trip to [Destination Name]. From transportation to local customs, we've got you covered.</p>

<h4>Getting There</h4>
<ul>
<li><strong>Airport:</strong> [Airport Name] - 30 minutes from city center</li>
<li><strong>Airlines:</strong> Direct flights from major international hubs</li>
<li><strong>Transfers:</strong> Taxis, shuttles, and public transport available</li>
</ul>

<h4>Getting Around</h4>
<ul>
<li>🚌 Efficient public bus system</li>
<li>🚕 Taxis and ride-sharing services</li>
<li>🚲 Bike rentals and cycling paths</li>
<li>🚗 Car rentals for exploring the region</li>
</ul>

<h4>Essential Information</h4>
<ul>
<li><strong>Currency:</strong> [Local Currency] - ATMs widely available</li>
<li><strong>Language:</strong> [Local Language] - English widely spoken</li>
<li><strong>Time Zone:</strong> [Time Zone]</li>
<li><strong>Emergency:</strong> Police 911, Medical 112</li>
</ul>

<h4>Local Tips</h4>
<ul>
<li>💳 Credit cards accepted at most establishments</li>
<li>📱 Free Wi-Fi available in most hotels and cafes</li>
<li>🏥 Excellent healthcare facilities</li>
<li>🛡️ Very safe for tourists</li>
</ul>`
  }
];

export const CONTENT_SNIPPETS: ContentSnippet[] = [
  {
    id: 'highlight-box',
    name: 'Highlight Box',
    category: 'formatting',
    shortcut: 'hb',
    content: `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
<p><strong>💡 Pro Tip:</strong> [Your tip here]</p>
</div>`
  },
  {
    id: 'warning-box',
    name: 'Warning Box',
    category: 'formatting',
    shortcut: 'wb',
    content: `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
<p><strong>⚠️ Important:</strong> [Your warning here]</p>
</div>`
  },
  {
    id: 'info-box',
    name: 'Info Box',
    category: 'formatting',
    shortcut: 'ib',
    content: `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
<p><strong>ℹ️ Good to Know:</strong> [Your information here]</p>
</div>`
  },
  {
    id: 'price-range',
    name: 'Price Range',
    category: 'content',
    shortcut: 'pr',
    content: `<p><strong>Price Range:</strong> 💰 Budget (€) | 💰💰 Mid-range (€€) | 💰💰💰 Luxury (€€€)</p>`
  },
  {
    id: 'opening-hours',
    name: 'Opening Hours',
    category: 'content',
    shortcut: 'oh',
    content: `<p><strong>Opening Hours:</strong><br>
Monday - Friday: 9:00 AM - 6:00 PM<br>
Saturday - Sunday: 10:00 AM - 4:00 PM</p>`
  },
  {
    id: 'contact-info',
    name: 'Contact Information',
    category: 'content',
    shortcut: 'ci',
    content: `<p><strong>Contact:</strong><br>
📞 Phone: [Phone Number]<br>
📧 Email: [Email Address]<br>
🌐 Website: [Website URL]</p>`
  },
  {
    id: 'rating-stars',
    name: 'Rating Stars',
    category: 'content',
    shortcut: 'rs',
    content: `<p><strong>Rating:</strong> ⭐⭐⭐⭐⭐ (5/5)</p>`
  },
  {
    id: 'best-time',
    name: 'Best Time to Visit',
    category: 'content',
    shortcut: 'bt',
    content: `<p><strong>Best Time to Visit:</strong> [Season/Months] for [reason - weather, events, etc.]</p>`
  }
];

export function getTemplatesByCategory(category: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(template => template.category === category);
}

export function getSnippetsByCategory(category: string): ContentSnippet[] {
  return CONTENT_SNIPPETS.filter(snippet => snippet.category === category);
}

export function searchTemplates(query: string): ContentTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return CONTENT_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

export function getTemplateById(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(template => template.id === id);
}

export function getSnippetById(id: string): ContentSnippet | undefined {
  return CONTENT_SNIPPETS.find(snippet => snippet.id === id);
}