import type { Destination } from '../types';

export const MOCK_DESTINATIONS: Destination[] = [
  {
    id: 'paris',
    name: 'Paris',
    primaryCity: 'Paris',
    country: 'France',
    countryCode: 'FR',
    region: 'Île-de-France',
    coordinates: { lat: 48.8566, lng: 2.3522 },
    description: 'The City of Light, renowned for art, fashion, gastronomy, and the iconic Eiffel Tower.',
    category: 'cultural',
    tags: ['art', 'romance', 'history', 'food', 'architecture', 'paris', 'france'],
    rating: 4.9,
    subtitle: 'The City of Light',
    arrivalMessage: "Bienvenue! We're in Paris.",
    landmarkSvgType: 'paris',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:30 AM',
        title: 'Café de Flore Breakfast',
        description: 'Start your day with warm buttery croissants and rich espresso in Saint-Germain-des-Prés.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:00 PM',
        title: "Musée d'Orsay Gallery",
        description: "Walk across the Seine to explore Monet, Degas, and Van Gogh inside the former Beaux-Arts railway station.",
        category: 'art',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Seine River Sunset Stroll',
        description: 'Watch golden hour illuminate Notre-Dame and the Eiffel Tower along the historic riverbanks.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['Metro Line 1 & RER C', 'Velib Electric Bikes', 'Bateaux-Mouches Seine Ferry'],
      food: ['Fresh Croissants at Du Pain et des Idées', 'Bistro Wine & Duck Confit at Le Petit Marche', 'Macarons at Ladurée'],
      stay: ['Hôtel Madame Rêve (Louvre)', 'Le Meurice Palace', 'Montmartre Artists Boutique Hotel'],
      mustVisit: ['Eiffel Tower & Champ de Mars', 'Louvre Museum Glass Pyramid', 'Sainte-Chapelle Stained Glass'],
      mustTry: ['Warm Baguette with Camembert', 'Hot Chocolate at Angelina', 'Vintage Flea Market Shopping'],
      mustDo: ['Evening Eiffel Tower Sparkle Stroll', 'Picnic along Canal Saint-Martin', 'Opéra Garnier Guided Walk'],
    },
  },
  {
    id: 'cairo',
    name: 'Cairo',
    primaryCity: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    region: 'Middle East & North Africa',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    description: 'Land of Ancient Wonders, featuring the Pyramids of Giza, the Nile, and vibrant Cairo bazaars.',
    category: 'cultural',
    tags: ['pyramids', 'history', 'nile', 'desert', 'culture', 'cairo', 'egypt', 'giza'],
    rating: 4.9,
    subtitle: 'Land of Ancient Wonders',
    arrivalMessage: "Marhaban! We're in Cairo, Egypt.",
    landmarkSvgType: 'egypt',
    itinerary: [
      {
        timeSlot: 'MORNING · 08:30 AM',
        title: 'Giza Pyramids & Sphinx',
        description: 'Explore the Great Pyramid, the Sphinx, and the ancient Giza plateau before the desert heat.',
        category: 'landmark',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Grand Egyptian Museum',
        description: 'Discover thousands of ancient artifacts, royal mummies, and King Tutankhamun’s golden treasures.',
        category: 'art',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Khan el-Khalili & Nile Sunset',
        description: 'Wander through the historic 14th-century bazaar, sample Egyptian tea, and take a felucca sailboat ride.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['Cairo Metro System', 'Nile Water Taxis', 'Ride-Hailing Apps (Uber & Careem)', 'Private Guided Drivers'],
      food: ['Authentic Koshari at Abou Tarek', 'Traditional Ful Medames & Fresh Flatbread', 'Mint Tea at Historic El Fishawy Café'],
      stay: ['Marriott Mena House (Giza Pyramids View)', 'Four Seasons Hotel Cairo at Nile Plaza', 'Boutique Heritage Hotel in Downtown Cairo'],
      mustVisit: ['Pyramids of Giza & Great Sphinx', 'Grand Egyptian Museum', 'Khan el-Khalili Historic Bazaar', 'Citadel of Saladin'],
      mustTry: ['Piping Hot Koshari Bowl', 'Fresh Sugarcane Juice (Aseer Asab)', 'Aromatic Mint Tea & Shisha at El Fishawy'],
      mustDo: ['Sunset Felucca Sailboat Ride on the Nile', 'Sound & Light Show at Giza Plateau', 'Exploring Islamic Cairo Architecture'],
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    primaryCity: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    region: 'Kanto',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    description: 'A vibrant metropolis blending futuristic technology with ancient shinto shrines.',
    category: 'urban',
    tags: ['technology', 'food', 'shopping', 'culture', 'tokyo', 'japan'],
    rating: 4.9,
    subtitle: 'Where Tradition Meets Tomorrow',
    arrivalMessage: "Kon'nichiwa! We're in Tokyo.",
    landmarkSvgType: 'tokyo',
    itinerary: [
      {
        timeSlot: 'MORNING · 08:30 AM',
        title: 'Tsukiji Outer Market Breakfast',
        description: 'Savor fresh tuna nigiri, tamagoyaki omelettes, and hot matcha tea at the historic market stalls.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Meiji Shrine & Harajuku Stroll',
        description: 'Walk through tranquil cypress forests to Meiji Jingu, then wander down vibrant Takeshita Street.',
        category: 'stroll',
      },
      {
        timeSlot: 'EVENING · 07:00 PM',
        title: 'Shinjuku Neon Lights & Izakaya',
        description: 'Watch glowing neon billboards from Omoide Yokocho while enjoying charcoal yakitori and local sake.',
        category: 'landmark',
      },
    ],
    categories: {
      transport: ['Yamanote JR Train Loop', 'Tokyo Metro Suica Card', 'Shinkansen Bullet Train'],
      food: ['Tonkotsu Ramen at Ichiran', 'A5 Wagyu Beef Teppanyaki', 'Matcha Parfait in Ginza'],
      stay: ['Trunk Hotel Yoyogi Park', 'Aman Tokyo (Otemachi)', 'Traditional Ryokan Hoshinoya Tokyo'],
      mustVisit: ['Senso-ji Temple in Asakusa', 'Shibuya Crossing & Hachiko Statue', 'TeamLab Planets Digital Art'],
      mustTry: ['Piping Hot Takoyaki Stalls', 'Automated Vending Machine Hot Coffee', 'Tea Ceremony in Hamarikyu Gardens'],
      mustDo: ['Early Morning Fish Market Walk', 'Anime & Tech Hunting in Akihabara', 'Sumo Wrestling Practice Viewing'],
    },
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    primaryCity: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    region: 'Maharashtra',
    coordinates: { lat: 19.076, lng: 72.8777 },
    description: 'The City of Dreams along the Arabian Sea, brimming with energy, history, and street food.',
    category: 'urban',
    tags: ['culture', 'history', 'coastal', 'food', 'mumbai', 'india'],
    rating: 4.7,
    subtitle: 'The City of Dreams along the Arabian Sea',
    arrivalMessage: "Namaste! We're in Mumbai.",
    landmarkSvgType: 'mumbai',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:00 AM',
        title: 'Gateway of India & Irani Chai',
        description: 'Watch harbor boats by the archway, followed by bun maska and spiced Irani chai at Leopold Café.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Chhatrapati Shivaji Terminus & Kala Ghoda',
        description: 'Admire Victorian Gothic heritage architecture before browsing indie art galleries and boutiques.',
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Marine Drive Queen’s Necklace Sunset',
        description: 'Join locals sitting on the sea promenade as golden hour turns the Arabian coast into light.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['Mumbai Local Railway Lines', 'Iconic Yellow-Black Padmini Taxis', 'Bandra-Worli Sea Link Highway'],
      food: ['Piping Hot Vada Pav at Ashok Stalls', 'Bombay Sandwich with Mint Chutney', 'Coastal Seafood Thali at Mahesh Lunch Home'],
      stay: ['Taj Mahal Palace Hotel (Colaba)', 'Soho House Mumbai (Juhu Beach)', 'Abode Bombay Heritage Boutique'],
      mustVisit: ['Gateway of India Promenade', 'Elephanta Island Cave Temples', 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya'],
      mustTry: ['Crispy Pani Puri at Chowpatty', 'Filter Coffee in Matunga', 'Kala Ghoda Art Walk'],
      mustDo: ['Sunset Walk along Marine Drive', 'Dabbawala Lunch Delivery Observation', 'Heritage Architecture Walk in Fort'],
    },
  },
  {
    id: 'london',
    name: 'London',
    primaryCity: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    region: 'Greater London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    description: 'A global cultural capital with royal parks, historic museums, and theater districts.',
    category: 'cultural',
    tags: ['history', 'museums', 'theater', 'architecture', 'london', 'uk'],
    rating: 4.8,
    subtitle: 'Capital of History & Royal Parks',
    arrivalMessage: "Hello! Welcome to London.",
    landmarkSvgType: 'london',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:30 AM',
        title: 'Borough Market Artisan Bakery',
        description: 'Sample fresh sourdough pastries, English cheeses, and artisanal coffee along the Thames.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:00 PM',
        title: 'British Museum & Covent Garden',
        description: 'Explore ancient world treasures, then watch street performers around classic glass arcades.',
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 07:00 PM',
        title: 'West End Theater & Pub Evening',
        description: 'Catch a world-class play in Shaftesbury Avenue followed by a cozy pub pint in Soho.',
        category: 'art',
      },
    ],
    categories: {
      transport: ['The London Underground Tube', 'Double-Decker Red Buses', 'Thames Clipper River Bus'],
      food: ['Fish & Chips with Mushy Peas', 'Traditional Afternoon Tea at Fortnum & Mason', 'Sunday Roast with Yorkshire Pudding'],
      stay: ['The Savoy (Strand)', 'Rosewood London (Holborn)', 'The Ned (City of London)'],
      mustVisit: ['Big Ben & Houses of Parliament', 'Tower Bridge & Tower of London', 'Tate Modern Art Museum'],
      mustTry: ['Fresh Sourdough at Borough Market', 'Pimms Cup in Hyde Park', 'Notting Hill Antique Hunting'],
      mustDo: ['Walk across Millennium Bridge', 'West End Musical Show', 'Changing of the Guard at Buckingham Palace'],
    },
  },
  {
    id: 'new-york',
    name: 'New York',
    primaryCity: 'New York',
    country: 'United States',
    countryCode: 'US',
    region: 'New York',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description: 'The Big Apple, featuring Central Park, Broadway, and iconic skyline views.',
    category: 'urban',
    tags: ['skylines', 'culture', 'shopping', 'art', 'nyc', 'new york', 'usa'],
    rating: 4.8,
    subtitle: 'The City That Never Sleeps',
    arrivalMessage: "Welcome to New York!",
    landmarkSvgType: 'newyork',
    itinerary: [
      {
        timeSlot: 'MORNING · 08:30 AM',
        title: 'High Line Stroll & Bagel Breakfast',
        description: 'Walk elevated greenways through Chelsea, stopping for an authentic NYC sesame bagel with lox.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Central Park & MoMA Galleries',
        description: 'Stroll around Bethesda Terrace before viewing modern art masterpieces in Midtown.',
        category: 'art',
      },
      {
        timeSlot: 'EVENING · 07:00 PM',
        title: 'Brooklyn Bridge Sunset & Jazz',
        description: 'Cross the iconic wooden walkway for Manhattan skyline views, ending in a Greenwich Village jazz cellar.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['NYC Subway 24/7', 'Yellow Cab Fleet', 'East River NYC Ferry'],
      food: ['Classic NYC Dollar Slice Pizza', 'Pastrami on Rye at Katz Deli', 'Cheesecake at Junior’s'],
      stay: ['The Plaza Hotel (Fifth Ave)', 'The Bowery Hotel (SoHo)', '1 Hotel Brooklyn Bridge'],
      mustVisit: ['Statue of Liberty & Ellis Island', 'Empire State Building Observatory', 'Metropolitan Museum of Art'],
      mustTry: ['Everything Bagel with Cream Cheese', 'Pastrami Sandwich at Katz’s', 'Cronut at Dominique Ansel'],
      mustDo: ['Sunset Walk across Brooklyn Bridge', 'Broadway Show in Times Square', 'Rowing Boats in Central Park'],
    },
  },
  {
    id: 'rome',
    name: 'Rome',
    primaryCity: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    region: 'Lazio',
    coordinates: { lat: 41.9028, lng: 12.4964 },
    description: 'The Eternal City of ancient ruins, Colosseum, Vatican treasures, and espresso bars.',
    category: 'cultural',
    tags: ['ancient-history', 'food', 'architecture', 'art', 'rome', 'italy'],
    rating: 4.9,
    subtitle: 'The Eternal City of Empires & Espresso',
    arrivalMessage: "Ciao! We're in Rome.",
    landmarkSvgType: 'rome',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:00 AM',
        title: 'Piazza Navona Espresso & Pastry',
        description: 'Enjoy a rich espresso and cornetto while watching fountain sculptures wake up.',
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Colosseum & Roman Forum Walk',
        description: 'Step back two millennia through marble arches, temple ruins, and imperial plazas.',
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 07:00 PM',
        title: 'Trastevere Dinner & Trevi Fountain',
        description: 'Dine on classic Cacio e Pepe in cobblestone alleys, then toss a coin into illuminated Trevi Fountain.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['ATAC Rome Metro Lines', 'Vintage Vespas', 'Historical Tram Network'],
      food: ['Authentic Carbonara & Cacio e Pepe', 'Wood-fired Roman Thin Crust Pizza', 'Artisanal Pistachio Gelato'],
      stay: ['Hotel Eden (Via Veneto)', 'J.K. Place Roma', 'Portrait Roma Suites'],
      mustVisit: ['The Colosseum & Roman Forum', 'Pantheon Dome Architecture', 'Vatican Museums & Sistine Chapel'],
      mustTry: ['Espresso standing at Sant’Eustachio', 'Tossing a Coin in Trevi Fountain', 'Aperol Spritz in Campo de’ Fiori'],
      mustDo: ['Sunset View from Janiculum Hill', 'Explore Cobblestone Trastevere Alleys', 'Villa Borghese Park Stroll'],
    },
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    primaryCity: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    region: 'Kansai',
    coordinates: { lat: 35.0116, lng: 135.7681 },
    description: 'Japan’s cultural heart, famous for classical Zen temples, tea houses, and bamboo groves.',
    category: 'cultural',
    tags: ['temples', 'nature', 'gardens', 'history', 'kyoto', 'japan'],
    rating: 4.9,
    subtitle: 'Heart of Zen Temples & Bamboo Groves',
    arrivalMessage: "Kon'nichiwa! We're in Kyoto.",
    landmarkSvgType: 'tokyo',
    itinerary: [
      {
        timeSlot: 'MORNING · 07:30 AM',
        title: 'Arashiyama Bamboo Grove Walk',
        description: 'Experience serene morning light filtering through towering green bamboo stalks.',
        category: 'nature',
      },
      {
        timeSlot: 'AFTERNOON · 01:00 PM',
        title: 'Fushimi Inari Vermilion Gates',
        description: 'Hike beneath thousands of torii gates winding up the sacred wooded mountain.',
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Gion Lantern Stroll & Tea Ceremony',
        description: 'Wander wooden machiya townhouses in search of traditional matcha and seasonal kaiseki.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['Kyoto City Bus Pass', 'Keihan Main Line', 'Rental Bicycles'],
      food: ['Kaiseki Multi-Course Dining', 'Fresh Yofu Tofu Dishes', 'Uji Matcha Soft Serve'],
      stay: ['Hoshinoya Kyoto (Arashiyama)', 'Sowaka Luxury Machiya', 'Traditional Gion Ryokan'],
      mustVisit: ['Kinkaku-ji Golden Pavilion', 'Fushimi Inari Taisha Shrine', 'Kiyomizu-dera Wooden Stage'],
      mustTry: ['Matcha Tea Ceremony', 'Yudofu Tofu Hotpot', 'Shojin Ryori Temple Cuisine'],
      mustDo: ['Morning Bamboo Grove Walk', 'Evening Gion Machiya Stroll', 'Philosopher’s Path Walk'],
    },
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    primaryCity: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    region: 'Catalonia',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    description: 'Mediterranean city famous for Gaudí architecture, sunny beaches, and tapas culture.',
    category: 'coastal',
    tags: ['architecture', 'beaches', 'food', 'art', 'barcelona', 'spain'],
    rating: 4.8,
    subtitle: 'Gaudí Architecture & Sunny Tapas Shores',
    arrivalMessage: "¡Hola! We're in Barcelona.",
    landmarkSvgType: 'generic',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:00 AM',
        title: 'Sagrada Família Guided Spire Tour',
        description: 'Marvel at Antoni Gaudí’s ongoing architectural masterpiece in morning light.',
        category: 'landmark',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Park Güell & Gothic Quarter Tapas',
        description: 'Stroll mosaic terraces overlooking the Mediterranean before sampling jamón ibérico in Gothic alleys.',
        category: 'food',
      },
      {
        timeSlot: 'EVENING · 07:30 PM',
        title: 'Barceloneta Beach Sunset Promenade',
        description: 'Enjoy sea breezes and fresh seafood paella along the lively beachfront promenade.',
        category: 'stroll',
      },
    ],
    categories: {
      transport: ['TMB Metro & Bus System', 'Bicing Bike Share', 'Montjuïc Cable Car'],
      food: ['Seafood Paella at La Barceloneta', 'Jamón Ibérico & Pan con Tomate', 'Churros with Dark Chocolate'],
      stay: ['Hotel Arts Barcelona', 'Cotton House Hotel', 'Mercer Hotel Gothic Quarter'],
      mustVisit: ['Basílica de la Sagrada Família', 'Park Güell Mosaic Terraces', 'Casa Batlló Modernist Façade'],
      mustTry: ['Fresh Sangria & Tapas', 'La Boqueria Market Tasting', 'Churros con Chocolate at Petritxol'],
      mustDo: ['Sunset Walk along Barceloneta', 'Gothic Quarter Walking Tour', 'Flamenco Performance in El Born'],
    },
  },
  {
    id: 'singapore',
    name: 'Singapore',
    primaryCity: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    region: 'Southeast Asia',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    description: 'A futuristic garden city known for Supertree groves, hawker stalls, and lush parks.',
    category: 'urban',
    tags: ['gardens', 'food', 'modern', 'nature', 'singapore'],
    rating: 4.8,
    subtitle: 'Futuristic Garden City of Asia',
    arrivalMessage: "Welcome to Singapore!",
    landmarkSvgType: 'generic',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:00 AM',
        title: 'Singapore Botanic Gardens Walk',
        description: 'Explore UNESCO-listed orchid gardens and lush tropical rainforest trails.',
        category: 'nature',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Lau Pa Sat Hawker Center Feast',
        description: 'Sample Hainanese chicken rice, laksa noodles, and grilled satay skewers.',
        category: 'food',
      },
      {
        timeSlot: 'EVENING · 07:30 PM',
        title: 'Gardens by the Bay Light Show',
        description: 'Watch the illuminated Supertree Grove come alive to music under the tropical night sky.',
        category: 'landmark',
      },
    ],
    categories: {
      transport: ['SMRT Metro System', 'EZ-Link Card', 'Electric Taxis'],
      food: ['Hainanese Chicken Rice at Tian Tian', 'Katong Laksa Bowl', 'Chili Crab at Jumbo Seafood'],
      stay: ['Marina Bay Sands Hotel', 'Raffles Hotel Singapore', 'The Warehouse Hotel (Robertson Quay)'],
      mustVisit: ['Gardens by the Bay Supertrees', 'Marina Bay Sands SkyPark', 'Jewel Changi Rain Vortex'],
      mustTry: ['Kaya Toast & Soft-Boiled Eggs', 'Singapore Sling at Long Bar', 'Hawker Center Satay Skewers'],
      mustDo: ['Night Safari Tram Ride', 'Evening Light & Water Show', 'Explore Chinatown & Kampong Glam'],
    },
  },
  {
    id: 'dubai',
    name: 'Dubai',
    primaryCity: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    region: 'Middle East',
    coordinates: { lat: 25.2048, lng: 55.2708 },
    description: 'A striking desert metropolis of towering skyscrapers, luxury shopping, and sand dunes.',
    category: 'urban',
    tags: ['architecture', 'desert', 'modern', 'shopping', 'dubai', 'uae'],
    rating: 4.7,
    subtitle: 'Metropolis of Dunes & Skyscrapers',
    arrivalMessage: "Marhaban! We're in Dubai.",
    landmarkSvgType: 'generic',
    itinerary: [
      {
        timeSlot: 'MORNING · 09:00 AM',
        title: 'Burj Khalifa At the Top Viewpoint',
        description: 'Look out across the skyline and Arabian Gulf from the world’s tallest tower.',
        category: 'landmark',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: 'Old Dubai Souk & Abra River Ride',
        description: 'Cross Dubai Creek on a wooden abra boat to explore Gold and Spice Souks.',
        category: 'stroll',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Desert Safari Sunset & Dinner',
        description: 'Experience red sand dunes, camel rides, and traditional dinner under desert stars.',
        category: 'nature',
      },
    ],
    categories: {
      transport: ['Dubai Metro Red Line', 'Dubai Tram & Monorail', 'Abra Creek Ferries'],
      food: ['Emirati Al Machboos Rice', 'Fresh Shawarma Wraps', 'Arabic Coffee & Cardamom Pastries'],
      stay: ['Burj Al Arab Jumeirah', 'Armani Hotel Dubai', 'Bab Al Shams Desert Resort'],
      mustVisit: ['Burj Khalifa Observatory', 'Museum of the Future', 'Dubai Fountain Show'],
      mustTry: ['Arabic Coffee & Stuffed Dates', 'Camel Milk Chocolate', 'Desert Dune Bashing'],
      mustDo: ['Sunset Abra Ride on Dubai Creek', 'Fountain Show at Dubai Mall', 'Hot Air Balloon over Desert Dunes'],
    },
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    primaryCity: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    region: 'Central Thailand',
    coordinates: { lat: 13.7563, lng: 100.5018 },
    description: 'Thailand’s vibrant capital famed for ornate riverside shrines, vibrant night markets, and rich street food culture.',
    category: 'cultural',
    tags: ['temples', 'food', 'culture', 'markets', 'bangkok', 'thailand'],
    rating: 4.8,
    subtitle: 'City of Angels & Golden Shrines',
    arrivalMessage: "Sawasdee! We're in Bangkok, Thailand.",
    landmarkSvgType: 'generic',
    itinerary: [
      {
        timeSlot: 'MORNING · 08:30 AM',
        title: 'Grand Palace & Emerald Buddha',
        description: 'Explore the spectacular royal residence and Wat Phra Kaew before the tropical midday sun.',
        category: 'landmark',
      },
      {
        timeSlot: 'AFTERNOON · 02:00 PM',
        title: 'Wat Arun Temple of Dawn',
        description: 'Cross the Chao Phraya River on a shuttle ferry to admire porcelain-mosaic stupas.',
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: 'Yaowarat Chinatown Street Food & Sunset Stroll',
        description: 'Taste aromatic noodle soups, fresh fruit, and watch neon signs illuminate historic Chinatown.',
        category: 'food',
      },
    ],
    categories: {
      transport: ['BTS Skytrain & MRT Subway', 'Chao Phraya Express River Ferries', 'Traditional Longtail Boats'],
      food: ['Authentic Pad Thai & Tom Yum', 'Mango Sticky Rice', 'Yaowarat Chinatown Street Stalls'],
      stay: ['Riverside Heritage Hotel', 'Sukhumvit Boutique Suites', 'Old Town Heritage Hotel'],
      mustVisit: ['Grand Palace & Wat Phra Kaew', 'Wat Arun (Temple of Dawn)', 'Chatuchak Weekend Market'],
      mustTry: ['Crispy Pad Thai Noodles', 'Spicy Green Papaya Salad (Som Tum)', 'Fresh Coconut Ice Cream'],
      mustDo: ['Sunset River Cruise on Chao Phraya', 'Exploring Yaowarat Road Street Food', 'Traditional Thai Massage in Old Town'],
    },
  },
];

/**
 * Resolves full destination data for any selected destination or string query.
 * Never defaults to Paris or France for another country or city.
 */
export function getDestinationData(destinationInput?: Destination | Partial<Destination> | string | null): Destination {
  const defaultParis = MOCK_DESTINATIONS[0];

  if (!destinationInput) {
    return defaultParis;
  }

  // Helper string capitalizer
  const formatName = (str: string) => {
    const trimmed = str.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  // If passed a string query (e.g. "Egypt", "Cairo", "japan", "Tokyo", "paris", "Thailand", "Bangkok", "Atlantis")
  if (typeof destinationInput === 'string') {
    const rawInput = destinationInput.trim();
    const searchStr = rawInput.toLowerCase();

    if (!searchStr) {
      return defaultParis;
    }

    const matched = MOCK_DESTINATIONS.find(
      (d) =>
        d.id.toLowerCase() === searchStr ||
        d.name.toLowerCase() === searchStr ||
        (d.primaryCity && d.primaryCity.toLowerCase() === searchStr) ||
        d.country.toLowerCase() === searchStr ||
        (d.countryCode && d.countryCode.toLowerCase() === searchStr) ||
        d.tags.some((t) => t.toLowerCase() === searchStr)
    );

    if (matched) {
      return matched;
    }

    // String fallback for unknown destinations (NEVER defaults to Paris!)
    const capitalized = formatName(rawInput);
    return {
      id: searchStr.replace(/\s+/g, '-'),
      name: capitalized,
      primaryCity: capitalized,
      country: capitalized,
      countryCode: capitalized.substring(0, 2).toUpperCase(),
      region: 'World Explorer',
      coordinates: { lat: 20, lng: 0 },
      description: `Discover ${capitalized} with Aan.`,
      category: 'cultural',
      tags: ['explore', searchStr],
      rating: 4.8,
      subtitle: `Discover ${capitalized}`,
      arrivalMessage: `We've arrived in ${capitalized}! Let's explore.`,
      landmarkSvgType: 'generic',
      itinerary: [
        {
          timeSlot: 'MORNING · 09:30 AM',
          title: `Breakfast & Coffee in ${capitalized}`,
          description: `Start your day enjoying local pastries and warm coffee in central ${capitalized}.`,
          category: 'food',
        },
        {
          timeSlot: 'AFTERNOON · 01:30 PM',
          title: `Heritage Walk in ${capitalized}`,
          description: `Explore historic plazas, galleries, and scenic streets in ${capitalized}.`,
          category: 'landmark',
        },
        {
          timeSlot: 'EVENING · 06:30 PM',
          title: `Sunset Stroll in ${capitalized}`,
          description: `Watch golden hour illuminate ${capitalized}.`,
          category: 'stroll',
        },
      ],
      categories: {
        transport: [`Local ${capitalized} Transit`, 'City Bicycle Network', 'Walking Trails'],
        food: [`Authentic ${capitalized} Cuisine`, 'Local Market Stalls', 'Coffee & Tea Shops'],
        stay: [`Boutique Hotel in ${capitalized}`, 'Central City Suites'],
        mustVisit: [`Historic Main Square of ${capitalized}`, 'Cultural Museum'],
        mustTry: [`Local Specialty Dish`, 'Sunset Viewpoint'],
        mustDo: [`City Center Walking Tour`, 'Evening Dining Experience'],
      },
    };
  }

  // If passed an object (e.g. from Globe click or state)
  const inputName = formatName(destinationInput.name || destinationInput.primaryCity || destinationInput.country || 'Destination');
  const inputCountry = formatName(destinationInput.country || inputName);

  const matched = MOCK_DESTINATIONS.find(
    (d) =>
      (destinationInput.id && d.id.toLowerCase() === destinationInput.id.toLowerCase()) ||
      d.name.toLowerCase() === inputName.toLowerCase() ||
      (d.primaryCity && d.primaryCity.toLowerCase() === inputName.toLowerCase()) ||
      d.country.toLowerCase() === inputCountry.toLowerCase() ||
      d.country.toLowerCase() === inputName.toLowerCase() ||
      (d.countryCode && destinationInput.countryCode && d.countryCode.toLowerCase() === destinationInput.countryCode.toLowerCase())
  );

  if (matched) {
    return matched;
  }

  // Object fallback for unknown destinations (NEVER defaults to Paris!)
  return {
    id: destinationInput.id || inputName.toLowerCase().replace(/\s+/g, '-'),
    name: inputName,
    primaryCity: destinationInput.primaryCity || inputName,
    country: inputCountry,
    countryCode: destinationInput.countryCode || inputCountry.substring(0, 2).toUpperCase(),
    region: destinationInput.region || 'World Explorer',
    coordinates: destinationInput.coordinates || { lat: 20, lng: 0 },
    description: destinationInput.description || `Discover ${inputName} in ${inputCountry} with Aan.`,
    category: destinationInput.category || 'cultural',
    tags: destinationInput.tags || ['explore', inputName.toLowerCase()],
    rating: destinationInput.rating || 4.9,
    subtitle: destinationInput.subtitle || `Explore ${inputCountry}`,
    arrivalMessage: destinationInput.arrivalMessage || `We've arrived in ${inputName}! Let's explore.`,
    landmarkSvgType: 'generic',
    itinerary: destinationInput.itinerary || [
      {
        timeSlot: 'MORNING · 09:30 AM',
        title: `Breakfast & Café Walk in ${inputName}`,
        description: `Begin your morning discovering local breakfast flavors and historic streets in ${inputName}.`,
        category: 'food',
      },
      {
        timeSlot: 'AFTERNOON · 01:30 PM',
        title: `${inputName} Cultural Landmark Exploration`,
        description: `Visit iconic heritage monuments, local art hubs, and architectural marvels across ${inputCountry}.`,
        category: 'landmark',
      },
      {
        timeSlot: 'EVENING · 06:30 PM',
        title: `Golden Hour Sunset Promenade`,
        description: `Watch the sunset illuminate ${inputName} while relaxing at cozy local evening spots.`,
        category: 'stroll',
      },
    ],
    categories: destinationInput.categories || {
      transport: [`Local ${inputName} Transit Lines`, 'Bicycle Rentals', 'Scenic Walking Trails'],
      food: [`Authentic ${inputCountry} Dishes`, `Fresh ${inputName} Market Produce`, 'Specialty Local Teas & Coffee'],
      stay: [`Boutique Heritage Hotel in ${inputName}`, 'Scenic Seaside Resort', 'Cozy City Center Suites'],
      mustVisit: [`Historic Old Quarter of ${inputName}`, 'Panoramic City Viewpoint', 'National Art & Culture Museum'],
      mustTry: [`Signature ${inputCountry} Street Delicacy`, 'Sunset Boat Cruise', 'Artisan Handicraft Shopping'],
      mustDo: ['Morning Architectural Walk', 'Evening Music & Culture Gathering', 'Local Culinary Tour'],
    },
  };
}
