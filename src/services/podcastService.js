/**
 * Azaad Podcast Service & Catalog
 * High-fidelity podcast series, popular episodes, search filtering, and chapter metadata.
 */

export const PODCAST_CATEGORIES = [
  'All',
  'Technology',
  'Health & Science',
  'Business & Startups',
  'Culture & Mindset',
  'True Crime & Mystery',
  'Storytelling & History',
];

export const PODCAST_SERIES = [
  {
    id: 'huberman-lab',
    title: 'Huberman Lab',
    host: 'Dr. Andrew Huberman',
    category: 'Health & Science',
    coverUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=700&auto=format&fit=crop&q=80',
    description: 'Dr. Andrew Huberman discusses neuroscience: how our brain and its connections with the organs of our body control our perceptions, our behaviors, and our health.',
    rating: 4.9,
    ratingCount: '185K reviews',
    subscribers: '4.8M listeners',
    totalEpisodes: 174,
    badge: 'Top Ranked',
    verified: true,
    website: 'hubermanlab.com',
  },
  {
    id: 'lex-fridman',
    title: 'Lex Fridman Podcast',
    host: 'Lex Fridman',
    category: 'Technology',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    description: 'Conversations about science, technology, engineering, history, philosophy, and the nature of human curiosity.',
    rating: 4.9,
    ratingCount: '142K reviews',
    subscribers: '4.2M listeners',
    totalEpisodes: 432,
    badge: 'Popular',
    verified: true,
    website: 'lexfridman.com',
  },
  {
    id: 'diary-of-a-ceo',
    title: 'The Diary Of A CEO',
    host: 'Steven Bartlett',
    category: 'Business & Startups',
    coverUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=700&auto=format&fit=crop&q=80',
    description: 'A few years ago I was a broke university dropout. Now I interview the world\'s most influential people, experts and thinkers to uncover untold truths.',
    rating: 4.8,
    ratingCount: '98K reviews',
    subscribers: '3.6M listeners',
    totalEpisodes: 310,
    badge: 'Weekly Trending',
    verified: true,
    website: 'stevenbartlett.com',
  },
  {
    id: 'deep-dive-ali',
    title: 'Deep Dive with Ali Abdaal',
    host: 'Ali Abdaal',
    category: 'Culture & Mindset',
    coverUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=700&auto=format&fit=crop&q=80',
    description: 'Delving into the minds of inspiring creators, world-class entrepreneurs, and best-selling authors to uncover the philosophies that fuel fulfilling lives.',
    rating: 4.8,
    ratingCount: '45K reviews',
    subscribers: '1.9M listeners',
    totalEpisodes: 128,
    badge: 'Essential',
    verified: true,
    website: 'aliabdaal.com/podcast',
  },
  {
    id: 'hard-fork',
    title: 'Hard Fork',
    host: 'Kevin Roose & Casey Newton',
    category: 'Technology',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
    description: 'A show about the rapidly changing world of tech from The New York Times. Exploring modern software, social networks, and what tomorrow looks like.',
    rating: 4.7,
    ratingCount: '32K reviews',
    subscribers: '1.4M listeners',
    totalEpisodes: 96,
    badge: 'Tech Award',
    verified: true,
    website: 'nytimes.com',
  },
  {
    id: 'crime-junkie',
    title: 'Crime Junkie',
    host: 'Ashley Flowers & Brit Prawat',
    category: 'True Crime & Mystery',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
    description: 'Crime Junkie is a weekly true crime podcast dedicated to discussing the cases that need attention. Fast-paced, respectful, and gripping.',
    rating: 4.8,
    ratingCount: '210K reviews',
    subscribers: '5.1M listeners',
    totalEpisodes: 380,
    badge: '#1 True Crime',
    verified: true,
    website: 'crimejunkiepodcast.com',
  },
  {
    id: 'hardcore-history',
    title: "Dan Carlin's Hardcore History",
    host: 'Dan Carlin',
    category: 'Storytelling & History',
    coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=700&auto=format&fit=crop&q=80',
    description: 'Journalist and broadcaster Dan Carlin takes his unorthodox way of thinking and applies it to the past in epic narrative journeys.',
    rating: 4.9,
    ratingCount: '115K reviews',
    subscribers: '2.8M listeners',
    totalEpisodes: 72,
    badge: 'Hall of Fame',
    verified: true,
    website: 'dancarlin.com',
  },
  {
    id: 'beerbiceps-show',
    title: 'The Ranveer Show',
    host: 'Ranveer Allahbadia',
    category: 'Culture & Mindset',
    coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=700&auto=format&fit=crop&q=80',
    description: "India's smartest podcast covering health, spirituality, geopolitics, science, and leadership with eminent world personalities.",
    rating: 4.7,
    ratingCount: '89K reviews',
    subscribers: '3.4M listeners',
    totalEpisodes: 412,
    badge: 'Top Regional',
    verified: true,
    website: 'beerbiceps.com',
  },
];

export const POPULAR_PODCAST_EPISODES = [
  {
    id: 'pod-huberman-focus-adhd',
    seriesId: 'huberman-lab',
    seriesTitle: 'Huberman Lab',
    title: 'Focus Toolkit: Tools to Improve Your Focus & Concentration',
    host: 'Dr. Andrew Huberman',
    singers: 'Dr. Andrew Huberman',
    artist: 'Huberman Lab',
    coverUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=700&auto=format&fit=crop&q=80',
    videoId: 'LG_uQvYmY7A',
    duration: 5340, // 1h 29m
    publishedAt: '2 days ago',
    publishDate: '2026-03-22',
    category: 'Health & Science',
    isPodcast: true,
    episodeNumber: 174,
    season: 2026,
    playCount: 924000,
    likesCount: 58200,
    source: 'podcast',
    description: 'In this episode, Dr. Huberman discusses actionable behavioral, nutritional, and supplement tools to immediately improve your mental focus, deepen concentration, and eliminate brain fog.',
    chapters: [
      { time: 0, title: 'Introduction & Neurological Foundation of Focus' },
      { time: 420, title: 'Visual Fixation & Attention Circuits (Prefrontal Cortex)' },
      { time: 1140, title: 'The 90-Minute Ultradian Focus Cycle' },
      { time: 1980, title: 'Binaural Beats (40Hz) & Soundscapes for Deep Work' },
      { time: 2760, title: 'Cold Exposure, Dopamine, and Sustained Alertness' },
      { time: 3840, title: 'Caffeine Timing: The 90-120 Min Delay Rule' },
      { time: 4740, title: 'Summary & Daily Protocol Checklist' },
    ],
  },
  {
    id: 'pod-huberman-sleep-mastery',
    seriesId: 'huberman-lab',
    seriesTitle: 'Huberman Lab',
    title: 'Master Your Sleep & Be More Alert When Awake',
    host: 'Dr. Andrew Huberman',
    singers: 'Dr. Andrew Huberman',
    artist: 'Huberman Lab',
    coverUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?w=700&auto=format&fit=crop&q=80',
    videoId: 'nm1TxQj9IsQ',
    duration: 6120, // 1h 42m
    publishedAt: '1 week ago',
    publishDate: '2026-03-15',
    category: 'Health & Science',
    isPodcast: true,
    episodeNumber: 173,
    season: 2026,
    playCount: 1240000,
    likesCount: 89000,
    source: 'podcast',
    description: 'Dr. Huberman covers the biological mechanisms of the circadian clock, light viewing behavior, temperature regulation, and non-sleep deep rest (NSDR) to optimize human restorative sleep.',
    chapters: [
      { time: 0, title: 'Why Sleep Is the Non-Negotiable Foundation' },
      { time: 600, title: 'Morning Sunlight & Adenosine Clearance' },
      { time: 1800, title: 'Body Temperature Minimum & Circadian Rhythm' },
      { time: 3200, title: 'NSDR (Non-Sleep Deep Rest) & Cortisol Reset' },
      { time: 4800, title: 'Supplements: Magnesium Threonate, Apigenin, Theanine' },
      { time: 5700, title: 'Night Protocol & Evening Dimming' },
    ],
  },
  {
    id: 'pod-lex-space-engineering',
    seriesId: 'lex-fridman',
    seriesTitle: 'Lex Fridman Podcast',
    title: 'Space Exploration, Rocket Propulsion, and the Future of Robotics',
    host: 'Lex Fridman',
    singers: 'Lex Fridman',
    artist: 'Lex Fridman Podcast',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    videoId: 'jvqFAi7vkBc',
    duration: 7200, // 2h 00m
    publishedAt: '5 days ago',
    publishDate: '2026-03-19',
    category: 'Technology',
    isPodcast: true,
    episodeNumber: 432,
    season: 2026,
    playCount: 1450000,
    likesCount: 112000,
    source: 'podcast',
    description: 'An in-depth conversation on the next generation of aerospace engineering, deep-space propulsion systems, clean energy breakthroughs, humanoid robotics, and human flourishing.',
    chapters: [
      { time: 0, title: 'Opening & Reflection on Modern Engineering' },
      { time: 600, title: 'Next-Generation Propulsion & Orbital Mechanics' },
      { time: 1800, title: 'Clean Energy, Nuclear Power & Global Infrastructure' },
      { time: 3100, title: 'Open Hardware vs. Frontier Engineering Paradigms' },
      { time: 4350, title: 'Robotics: Mechanical Systems Interacting in 3D Space' },
      { time: 5700, title: 'What Human Life Looks Like in 2035' },
      { time: 6800, title: 'Personal Advice for Young Engineers & Builders' },
    ],
  },
  {
    id: 'pod-diary-neuroscience-habits',
    seriesId: 'diary-of-a-ceo',
    seriesTitle: 'The Diary Of A CEO',
    title: 'The World Leading Brain Expert: How To Rebuild Your Mind & Break Any Habit',
    host: 'Steven Bartlett ft. Dr. Tara Swart',
    singers: 'Steven Bartlett & Dr. Tara Swart',
    artist: 'The Diary Of A CEO',
    coverUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=700&auto=format&fit=crop&q=80',
    videoId: '4QIP_8NUa54',
    duration: 4860, // 1h 21m
    publishedAt: '1 week ago',
    publishDate: '2026-03-17',
    category: 'Business & Startups',
    isPodcast: true,
    episodeNumber: 310,
    season: 2026,
    playCount: 840000,
    likesCount: 64000,
    source: 'podcast',
    description: 'Neuroscientist Dr. Tara Swart reveals how neuroplasticity works in adults, how subconscious trauma shapes daily business choices, and the scientific mechanism to rewire self-limiting beliefs.',
    chapters: [
      { time: 0, title: 'The Shocking Truth About Adult Neuroplasticity' },
      { time: 720, title: 'How Stress Shrinks Decision-Making Circuits' },
      { time: 1620, title: 'The 3-Step Neural Reset for Bad Habits' },
      { time: 2540, title: 'Why Manifestation Has a True Neurological Basis' },
      { time: 3600, title: 'Micro-Habits That Protect Against Cognitive Decline' },
      { time: 4500, title: 'Steven’s Quick-Fire Closing Reflection' },
    ],
  },
  {
    id: 'pod-deepdive-ali-creator-economy',
    seriesId: 'deep-dive-ali',
    seriesTitle: 'Deep Dive with Ali Abdaal',
    title: 'How to Build an Authentic 7-Figure One-Person Business Without Burnout',
    host: 'Ali Abdaal ft. Justin Welsh',
    singers: 'Ali Abdaal & Justin Welsh',
    artist: 'Deep Dive with Ali Abdaal',
    coverUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=700&auto=format&fit=crop&q=80',
    videoId: '3qHkcs3kG44',
    duration: 3960, // 1h 06m
    publishedAt: '3 days ago',
    publishDate: '2026-03-21',
    category: 'Culture & Mindset',
    isPodcast: true,
    episodeNumber: 128,
    season: 2026,
    playCount: 480000,
    likesCount: 39200,
    source: 'podcast',
    description: 'Justin Welsh breaks down his exact blueprint for creating high-leverage digital assets, writing daily without creative fatigue, and protecting personal freedom as an independent solopreneur.',
    chapters: [
      { time: 0, title: 'From Corporate Executive to Solopreneur' },
      { time: 480, title: 'The Solopreneur Operating System' },
      { time: 1200, title: 'Content Engine: How to Write 10x Faster' },
      { time: 2100, title: 'Monetization Ladders & Evergreen Products' },
      { time: 3000, title: 'Protecting Mental Health & Avoiding Audience Traps' },
      { time: 3700, title: 'Closing Questions on Purpose' },
    ],
  },
  {
    id: 'pod-hardfork-future-silicon',
    seriesId: 'hard-fork',
    seriesTitle: 'Hard Fork',
    title: 'Next-Gen Silicon Breakthroughs, Modern Coding & The Secret Lab Tour',
    host: 'Kevin Roose & Casey Newton',
    singers: 'Kevin Roose & Casey Newton',
    artist: 'Hard Fork',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
    videoId: '2OEL4P1Rz04',
    duration: 3420, // 57m
    publishedAt: '4 days ago',
    publishDate: '2026-03-20',
    category: 'Technology',
    isPodcast: true,
    episodeNumber: 96,
    season: 2026,
    playCount: 380000,
    likesCount: 28900,
    source: 'podcast',
    description: 'Kevin and Casey test out new developer tools and operating systems, break down the latest silicon developments, and debate how modern software engineering has fundamentally evolved.',
    chapters: [
      { time: 0, title: 'Cold Open & This Week in Silicon Valley' },
      { time: 360, title: 'Testing Next-Gen Developer Workflows for 48 Hours' },
      { time: 1320, title: 'Interview with Frontier Systems Engineers' },
      { time: 2280, title: 'The Social Media Landscape in 2026' },
      { time: 3120, title: 'Hat of the Week & Listener Mailbag' },
    ],
  },
  {
    id: 'pod-crime-junkie-cold-case',
    seriesId: 'crime-junkie',
    seriesTitle: 'Crime Junkie',
    title: 'WANTED: The Lost Mountain Trail Mystery & DNA Breakthrough',
    host: 'Ashley Flowers & Brit Prawat',
    singers: 'Ashley Flowers & Brit Prawat',
    artist: 'Crime Junkie',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
    videoId: 'kXYiU_JCYtU',
    duration: 3120, // 52m
    publishedAt: '1 week ago',
    publishDate: '2026-03-17',
    category: 'True Crime & Mystery',
    isPodcast: true,
    episodeNumber: 380,
    season: 2026,
    playCount: 910000,
    likesCount: 78000,
    source: 'podcast',
    description: 'Ashley Flowers investigates a decades-old disappearance in the Pacific Northwest that suddenly blew wide open following cutting-edge genetic genealogy breakthroughs.',
    chapters: [
      { time: 0, title: 'The Vanishing on the Cascade Ridge' },
      { time: 600, title: 'Initial Search Efforts and Baffling Clues' },
      { time: 1440, title: 'Years of Silence & Community Suspicions' },
      { time: 2220, title: 'The Genetic Genealogy Match in 2025' },
      { time: 2880, title: 'Current Status & How Listeners Can Help' },
    ],
  },
  {
    id: 'pod-hardcore-history-twilight',
    seriesId: 'hardcore-history',
    seriesTitle: "Dan Carlin's Hardcore History",
    title: 'Twilight of the Titans: The Iron Empires of Antiquity',
    host: 'Dan Carlin',
    singers: 'Dan Carlin',
    artist: "Dan Carlin's Hardcore History",
    coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=700&auto=format&fit=crop&q=80',
    videoId: 'Xb2kF_t96gA',
    duration: 12600, // 3h 30m
    publishedAt: '2 weeks ago',
    publishDate: '2026-03-10',
    category: 'Storytelling & History',
    isPodcast: true,
    episodeNumber: 72,
    season: 2026,
    playCount: 1120000,
    likesCount: 94000,
    source: 'podcast',
    description: 'Dan Carlin plunges deep into the brutal clash of ancient civilizations, examining what human psychology feels like when an entire known world crumbles beneath marching legions.',
    chapters: [
      { time: 0, title: 'Prologue: What Makes an Empire Fall?' },
      { time: 1800, title: 'The Bronze Age Collapse Echoes' },
      { time: 4200, title: 'Warfare on an Unimaginable Scale' },
      { time: 7200, title: 'The Psychology of the Ancient Soldier' },
      { time: 10200, title: 'Lessons for the Modern Era & Carlin Epilogue' },
    ],
  },
  {
    id: 'pod-beerbiceps-deep-space',
    seriesId: 'beerbiceps-show',
    seriesTitle: 'The Ranveer Show',
    title: 'Astrophysics, Dark Matter & The Secrets of Deep Space ft. Dr. Jayant Murthy',
    host: 'Ranveer Allahbadia ft. Dr. Jayant Murthy',
    singers: 'Ranveer Allahbadia & Dr. Jayant Murthy',
    artist: 'The Ranveer Show',
    coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=700&auto=format&fit=crop&q=80',
    videoId: 'W6NZfCO5SIk',
    duration: 4980, // 1h 23m
    publishedAt: '6 days ago',
    publishDate: '2026-03-18',
    category: 'Culture & Mindset',
    isPodcast: true,
    episodeNumber: 412,
    season: 2026,
    playCount: 650000,
    likesCount: 46000,
    source: 'podcast',
    description: 'Renowned astrophysicist Dr. Jayant Murthy breaks down the secrets of interstellar dust, what happens inside black holes, and the philosophical wonders of the cosmos.',
    chapters: [
      { time: 0, title: 'Welcome to TRS & The Wonder of the Night Sky' },
      { time: 540, title: 'What Is Dark Matter Really Doing?' },
      { time: 1620, title: 'Are We Alone in the Milky Way?' },
      { time: 2700, title: 'Space Telescopes & Decoding Ancient Light' },
      { time: 3900, title: 'Spirituality, Science and the Cosmic Perspective' },
      { time: 4700, title: 'Closing Thoughts on Humanity’s Next 100 Years' },
    ],
  },
];

/**
 * Normalizes a podcast episode into the standard Azaad song object structure
 * so it plays seamlessly in the PlayerBar & MusicPlayerPage.
 */
export function normalizePodcastEpisode(ep) {
  if (!ep) return null;
  return {
    id: ep.id,
    songId: ep.id,
    title: ep.title,
    artist: ep.seriesTitle || ep.host,
    singers: ep.host || ep.seriesTitle,
    album: ep.seriesTitle || 'Podcast',
    category: ep.category || 'Podcast',
    genre: 'Podcast',
    coverUrl: ep.coverUrl,
    audioUrl: ep.audioUrl || '',
    videoId: ep.videoId || null,
    youtubeId: ep.videoId || null,
    duration: ep.duration || 3600,
    source: 'podcast',
    isFullSong: true,
    isPodcast: true,
    seriesId: ep.seriesId,
    seriesTitle: ep.seriesTitle,
    host: ep.host,
    episodeNumber: ep.episodeNumber,
    season: ep.season,
    publishedAt: ep.publishedAt,
    description: ep.description,
    chapters: ep.chapters || [],
    keyTakeaways: ep.keyTakeaways || [
      'Actionable science-backed protocols and mental models discussed by the host.',
      'Deep-dive breakdown of habits, focus systems, and real-world case studies.',
      'Use chapter markers below to jump directly to specific timestamps and segments.',
    ],
  };
}

/**
 * Filter and search podcasts across series and popular episodes
 */
export function searchPodcastsCatalog({
  query = '',
  category = 'All',
  seriesFilter = 'all',
  sortBy = 'popular',
  subscribedSeriesIds = [],
  onlySubscribed = false,
}) {
  const cleanQ = query.trim().toLowerCase();

  // Filter series
  let matchedSeries = PODCAST_SERIES.filter((s) => {
    if (category !== 'All' && s.category !== category) return false;
    if (onlySubscribed && !subscribedSeriesIds.includes(s.id)) return false;
    if (!cleanQ) return true;
    return (
      s.title.toLowerCase().includes(cleanQ) ||
      s.host.toLowerCase().includes(cleanQ) ||
      s.description.toLowerCase().includes(cleanQ) ||
      s.category.toLowerCase().includes(cleanQ)
    );
  });

  // Filter episodes
  let matchedEpisodes = POPULAR_PODCAST_EPISODES.map(normalizePodcastEpisode).filter((ep) => {
    if (category !== 'All' && ep.category !== category) return false;
    if (seriesFilter !== 'all' && ep.seriesId !== seriesFilter) return false;
    if (onlySubscribed && !subscribedSeriesIds.includes(ep.seriesId)) return false;
    if (!cleanQ) return true;
    return (
      ep.title.toLowerCase().includes(cleanQ) ||
      ep.artist.toLowerCase().includes(cleanQ) ||
      ep.singers.toLowerCase().includes(cleanQ) ||
      ep.seriesTitle?.toLowerCase().includes(cleanQ) ||
      ep.description?.toLowerCase().includes(cleanQ) ||
      ep.category.toLowerCase().includes(cleanQ)
    );
  });

  // Sort episodes
  if (sortBy === 'popular') {
    matchedEpisodes.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  } else if (sortBy === 'newest') {
    matchedEpisodes.sort((a, b) => (b.episodeNumber || 0) - (a.episodeNumber || 0));
  } else if (sortBy === 'duration-asc') {
    matchedEpisodes.sort((a, b) => a.duration - b.duration);
  } else if (sortBy === 'duration-desc') {
    matchedEpisodes.sort((a, b) => b.duration - a.duration);
  }

  return {
    series: matchedSeries,
    episodes: matchedEpisodes,
  };
}

export function formatPodcastDuration(secs) {
  if (typeof secs !== 'number' || isNaN(secs) || secs <= 0) return '0m';
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  }
  return `${mins}m`;
}

export const CURATED_PODCAST_SHOWS = PODCAST_SERIES;

export function getPopularPodcastEpisodes(limit = 16) {
  return POPULAR_PODCAST_EPISODES.map(normalizePodcastEpisode).slice(0, limit);
}
