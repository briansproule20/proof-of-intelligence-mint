/**
 * 163 Trivia Categories for Question Generation
 * Each category is mapped to a number (1-163) for randomization
 */
export const TRIVIA_CATEGORIES = [
  // Current Categories (1-23)
  "History",
  "Science",
  "Literature",
  "Film & TV",
  "Sports",
  "Geography",
  "Arts",
  "Technology",
  "General Knowledge",
  "Music",
  "Food & Drink",
  "Nature & Animals",
  "Greek Mythology",
  "Roman Mythology",
  "Norse Mythology",
  "Egyptian Mythology",
  "Space & Astronomy",
  "Video Games",
  "Politics & Government",
  "Business & Economics",
  "Health & Medicine",
  "Architecture",
  "Fashion",

  // Pop Culture & Entertainment (24-31)
  "Anime & Manga",
  "Comic Books & Graphic Novels",
  "Broadway & Theater",
  "Podcasts & Radio",
  "Memes & Internet Culture",
  "Reality TV",
  "Stand-Up Comedy",
  "Award Shows & Ceremonies",

  // Academic & Intellectual (32-41)
  "Philosophy",
  "Psychology",
  "Linguistics & Languages",
  "Anthropology",
  "Sociology",
  "Mathematics",
  "Chemistry",
  "Physics",
  "Biology",
  "Astronomy",

  // Regional & Cultural (42-49)
  "Asian History & Culture",
  "European History & Culture",
  "Latin American History & Culture",
  "Middle Eastern History & Culture",
  "African History & Culture",
  "Ancient Civilizations",
  "Indigenous Cultures",
  "World Religions",

  // Historical Eras (50-61)
  "Ancient Rome",
  "Ancient Greece",
  "Medieval Times",
  "Renaissance Era",
  "Age of Exploration",
  "Industrial Revolution",
  "World Wars",
  "Cold War Era",
  "1960s-1970s Culture",
  "1980s Nostalgia",
  "1990s Nostalgia",
  "2000s Pop Culture",

  // Professional & Specialized (62-69)
  "Law & Legal Systems",
  "Military & Warfare",
  "Aviation & Aerospace",
  "Maritime & Naval History",
  "Engineering & Innovation",
  "Medicine & Healthcare",
  "Education & Academia",
  "Journalism & Media",

  // Hobbies & Lifestyle (70-79)
  "Cooking & Culinary Arts",
  "Wine & Spirits",
  "Coffee & Tea",
  "Fitness & Exercise",
  "Yoga & Meditation",
  "Board Games & Tabletop",
  "Card Games & Poker",
  "Puzzles & Brain Teasers",
  "Photography",
  "Gardening & Horticulture",

  // Sports Specific (80-89)
  "Soccer/Football",
  "Basketball",
  "Baseball",
  "American Football",
  "Tennis",
  "Golf",
  "Olympic Sports",
  "Extreme Sports",
  "Combat Sports (MMA, Boxing)",
  "Motorsports & Racing",

  // Arts Specific (90-98)
  "Classical Music",
  "Jazz & Blues",
  "Rock & Roll History",
  "Hip Hop & Rap",
  "Country Music",
  "Electronic & Dance Music",
  "Painting & Visual Arts",
  "Sculpture",
  "Street Art & Graffiti",

  // Science & Nature Specific (99-107)
  "Marine Biology & Oceanography",
  "Dinosaurs & Paleontology",
  "Insects & Entomology",
  "Birds & Ornithology",
  "Ecology & Environment",
  "Climate & Weather",
  "Volcanoes & Earthquakes",
  "Genetics & DNA",
  "Neuroscience",

  // Technology Specific (108-115)
  "Social Media & Platforms",
  "Cryptocurrency & Blockchain",
  "Artificial Intelligence",
  "Cybersecurity",
  "Programming & Coding",
  "Smartphones & Mobile Tech",
  "Gaming Hardware & Consoles",
  "Internet History",

  // Quirky & Fun (116-125)
  "Urban Legends & Folklore",
  "Conspiracy Theories (debunked)",
  "Guinness World Records",
  "Famous Disasters & Accidents",
  "Unsolved Mysteries",
  "Famous Trials & Court Cases",
  "Hoaxes & Pranks",
  "Inventions & Patents",
  "Superstitions & Traditions",
  "Oddities & Strange Facts",

  // Literature Specific (126-133)
  "Poetry",
  "Science Fiction",
  "Fantasy Literature",
  "Mystery & Detective Fiction",
  "Horror & Gothic Literature",
  "Romance Novels",
  "Children's Literature",
  "Shakespeare",

  // Geography Specific (134-141)
  "World Capitals",
  "Mountains & Peaks",
  "Rivers & Lakes",
  "Deserts & Biomes",
  "Islands & Archipelagos",
  "US Geography",
  "European Geography",
  "Flags & Symbols",

  // Food & Drink Specific (142-148)
  "Baking & Pastries",
  "International Cuisine",
  "Fast Food & Chains",
  "Vegetarian & Vegan",
  "Cocktails & Mixology",
  "Craft Beer & Brewing",
  "Candy & Sweets",

  // Miscellaneous (149-163)
  "Toys & Collectibles",
  "Brands & Logos",
  "Advertising & Marketing",
  "Holidays & Celebrations",
  "Weddings & Traditions",
  "Etiquette & Manners",
  "Crime & Criminology",
  "Espionage & Spies",
  "Pirates & Privateers",
  "Royalty & Nobility",
  "Haunted Places & Ghost Stories",
  "Amusement Parks & Theme Parks",
  "Circuses & Carnivals",
  "Magic & Illusions",
  "Cartoons & Animation",
] as const;

/**
 * Get a random category from the 160 available categories
 */
export function getRandomCategory(): string {
  const randomIndex = Math.floor(Math.random() * TRIVIA_CATEGORIES.length);
  return TRIVIA_CATEGORIES[randomIndex];
}

/**
 * Get a specific category by number (1-163)
 */
export function getCategoryByNumber(num: number): string {
  if (num < 1 || num > TRIVIA_CATEGORIES.length) {
    throw new Error(`Category number must be between 1 and ${TRIVIA_CATEGORIES.length}, got ${num}`);
  }
  return TRIVIA_CATEGORIES[num - 1]; // Convert to 0-indexed
}

/**
 * Get total number of categories
 */
export function getTotalCategories(): number {
  return TRIVIA_CATEGORIES.length;
}
