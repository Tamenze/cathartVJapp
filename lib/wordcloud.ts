import type { JournalEntry } from "@/types";

const STOPWORDS = new Set([
  // articles / determiners
  "a","an","the","this","that","these","those","my","your","his","her","its","our","their",
  // prepositions
  "in","on","at","to","for","of","with","by","from","up","about","into","through","during",
  "before","after","above","below","between","out","off","over","under","again","then","once",
  // conjunctions
  "and","but","or","nor","so","yet","because","although","while","if","when","where","which",
  "who","whom","whose","what","how","than","as","whether","since","until","unless","though",
  // pronouns
  "i","me","we","us","you","he","she","it","they","them","him","her","myself","yourself",
  "himself","herself","itself","ourselves","themselves",
  // auxiliaries / modals
  "is","are","was","were","be","been","being","have","has","had","do","does","did","will",
  "would","could","should","may","might","must","shall","can","need","dare","ought","am",
  // contractions — full forms (tokenizer strips suffixes first, these catch any that slip through)
  "i'm","i'll","i've","i'd",
  "you're","you'll","you've","you'd",
  "he's","he'll","he'd",
  "she's","she'll","she'd",
  "it's","it'll","it'd",
  "we're","we'll","we've","we'd",
  "they're","they'll","they've","they'd",
  "that's","that'll","that'd","there's","here's","what's","who's","who'll","who'd",
  "isn't","aren't","wasn't","weren't",
  "don't","doesn't","didn't","won't","wouldn't","couldn't","shouldn't","can't","mustn't","mightn't",
  "haven't","hasn't","hadn't","let's","ain't",
  // common short words
  "not","no","yes","just","also","very","really","much","more","most","some","any","all",
  "each","every","both","few","more","other","such","same","own","only","even","here","there",
  "now","then","too","so","up","down","out","off","over","under","again","further","once",
  // spoken filler
  "um","uh","like","you","know","kind","sort","thing","things","stuff","lot","lots","bit",
  "actually","basically","literally","honestly","totally","definitely","probably","maybe",
  "gonna","wanna","gotta","kinda","sorta","okay","ok","yeah","yep","nope","well","right",
  // time words that add little meaning
  "today","yesterday","tomorrow","day","week","month","year","time","times","moment","bit",
  // high-frequency but low-signal
  "get","got","go","went","come","came","said","say","think","thought","feel","felt","want",
  "wanted","need","needed","make","made","take","took","see","saw","know","knew","look","looked",
  "use","used","find","found","give","gave","tell","told","show","showed","try","tried",
  "seem","seemed","become","became","keep","kept","put","set","let","let","run","ran",
  "work","worked","call","called","ask","asked","turn","turned","move","moved","live","lived",
  "back","way","first","last","long","little","good","new","old","great","big","small",
  "high","low","next","early","never","always","often","ever","still","already","around",
  // -ing verb forms (high frequency in speech)
  "going","getting","doing","having","coming","trying","thinking","saying","taking","making",
  "looking","feeling","wanting","helping","moving","working","seeing","talking","walking",
  "starting","stopping","changing","following","playing","using","giving","bringing","holding",
  "leaving","growing","learning","reading","writing","watching","keeping","putting","running",
  "turning","calling","asking","showing","finding","telling","knowing","meaning","happening",
  "something","anything","everything","nothing","someone","anyone","everyone",
]);

export interface WordFrequency {
  word: string;
  count: number;
}

// Contraction suffixes to strip before stopword filtering.
// e.g. "i'm" → "i", "don't" → "don" → filtered, "they've" → "they" → filtered
const CONTRACTION_RE = /'(m|re|ll|ve|d|s|nt)$/;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, "")) // strip leading/trailing punctuation
    .map((w) => w.replace(CONTRACTION_RE, ""))    // strip contraction suffix
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function computeWordFrequencies(
  entries: JournalEntry[],
  sinceDate: Date,
  maxWords = 20
): WordFrequency[] {
  const freq = new Map<string, number>();

  for (const entry of entries) {
    if (new Date(entry.createdAt) < sinceDate) continue;
    for (const word of tokenize(entry.transcript)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);
}

export function sinceDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
