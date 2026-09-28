// Comprehensive English IPA Phonetic Dictionary & Rule-based G2P Engine

export const COMMON_IPA_DICTIONARY: Record<string, string> = {
  // Test & ETS Specific Words
  suburban: "/səˈbɜːrbən/",
  suburb: "/ˈsʌbɜːrb/",
  urban: "/ˈɜːrbən/",
  urbanization: "/ˌɜːrbənɪˈzeɪʃn/",
  rural: "/ˈrʊrəl/",
  metropolitan: "/ˌmetrəˈpɑːlɪtən/",
  commute: "/kəˈmjuːt/",
  commuter: "/kəˈmjuːtər/",
  process: "/ˈprɑːses/",
  procedure: "/prəˈsiːdʒər/",
  proceed: "/proʊˈsiːd/",
  proceedings: "/proʊˈsiːdɪŋz/",
  applicant: "/ˈæplɪkənt/",
  application: "/ˌæplɪˈkeɪʃn/",
  apply: "/əˈplaɪ/",
  appliance: "/əˈplaɪəns/",
  applicable: "/ˈæplɪkəbl/",
  requirement: "/rɪˈkwaɪərmənt/",
  require: "/rɪˈkwaɪər/",
  prerequisite: "/ˌpriːˈrekwəzɪt/",
  meet: "/miːt/",
  satisfy: "/ˈsætɪsfaɪ/",
  fulfill: "/fʊlˈfɪl/",
  qualified: "/ˈkwɑːlɪfaɪd/",
  qualify: "/ˈkwɑːlɪfaɪ/",
  qualification: "/ˌkwɑːlɪfɪˈkeɪʃn/",
  certified: "/ˈsɜːrtɪfaɪd/",
  certificate: "/sərˈtɪfɪkət/",
  candidate: "/ˈkændɪdət/",
  confidence: "/ˈkɑːnfɪdəns/",
  confident: "/ˈkɑːnfɪdənt/",
  confidential: "/ˌkɑːnfɪˈdenʃl/",
  highly: "/ˈhaɪli/",
  professional: "/prəˈfeʃənl/",
  profession: "/prəˈfeʃn/",
  interview: "/ˈɪntərvjuː/",
  interviewer: "/ˈɪntərvjuːər/",
  interviewee: "/ˌɪntərvjuːˈiː/",
  hire: "/ˈhaɪər/",
  training: "/ˈtreɪnɪŋ/",
  trainer: "/ˈtreɪnər/",
  trainee: "/ˌtreɪˈniː/",
  reference: "/ˈrefərəns/",
  refer: "/rɪˈfɜːr/",
  referral: "/rɪˈfɜːrəl/",
  position: "/pəˈzɪʃn/",
  achievement: "/əˈtʃiːvmənt/",
  achieve: "/əˈtʃiːv/",
  impressed: "/ɪmˈprest/",
  impress: "/ɪmˈpres/",
  impression: "/ɪmˈpreʃn/",
  impressive: "/ɪmˈpresɪv/",
  excellent: "/ˈeksələnt/",
  excellence: "/ˈeksələns/",
  eligible: "/ˈelɪdʒəbl/",
  eligibility: "/ˌelɪdʒəˈbɪləti/",
  identify: "/aɪˈdentɪfaɪ/",
  identification: "/aɪˌdentɪfɪˈkeɪʃn/",
  identity: "/aɪˈdentəti/",
  condition: "/kənˈdɪʃn/",
  conditional: "/kənˈdɪʃənl/",
  associate: "/əˈsoʊʃieɪt/",
  association: "/əˌsoʊʃiˈeɪʃn/",
  employment: "/ɪmˈplɔɪmənt/",
  employ: "/ɪmˈplɔɪ/",
  employer: "/ɪmˈplɔɪər/",
  employee: "/ɪmˈplɔɪiː/",
  lack: "/læk/",
  managerial: "/ˌmænəˈdʒɪriəl/",
  manage: "/ˈmænɪdʒ/",
  manager: "/ˈmænɪdʒər/",
  management: "/ˈmænɪdʒmənt/",
  diligent: "/ˈdɪlɪdʒənt/",
  diligence: "/ˈdɪlɪdʒəns/",
  familiar: "/fəˈmɪliər/",
  familiarity: "/fəˌmɪliˈærəti/",
  proficiency: "/prəˈfɪʃnsi/",
  proficient: "/prəˈfɪʃnt/",
  prospective: "/prəˈspektɪv/",
  prospect: "/ˈprɑːspekt/",
  appeal: "/əˈpiːl/",
  appealing: "/əˈpiːlɪŋ/",
  specialize: "/ˈspeʃəlaɪz/",
  specialist: "/ˈspeʃəlɪst/",
  specialty: "/ˈspeʃəlti/",
  apprehensive: "/ˌæprɪˈhensɪv/",
  apprehension: "/ˌæprɪˈhenʃn/",
  consultant: "/kənˈsʌltənt/",
  consult: "/kənˈsʌlt/",
  consultation: "/ˌkɑːnslˈteɪʃn/",
  entitle: "/ɪnˈtaɪtl/",
  entitlement: "/ɪnˈtaɪtlmənt/",
  degree: "/dɪˈɡriː/",
  payroll: "/ˈpeɪroʊl/",
  recruit: "/rɪˈkruːt/",
  recruitment: "/rɪˈkruːtmənt/",
  recruiter: "/rɪˈkruːtər/",
  certification: "/ˌsɜːrtɪfɪˈkeɪʃn/",
  occupation: "/ˌɑːkjuˈpeɪʃn/",
  occupy: "/ˈɑːkjupaɪ/",
  occupant: "/ˈɑːkjupənt/",
  wage: "/weɪdʒ/",
  salary: "/ˈsæləri/",
  attire: "/əˈtaɪər/",
  code: "/koʊd/",
  concern: "/kənˈsɜːrn/",
  concerning: "/kənˈsɜːrnɪŋ/",
  policy: "/ˈpɑːləsi/",
  comply: "/kəmˈplaɪ/",
  compliance: "/kəmˈplaɪəns/",
  compliant: "/kəmˈplaɪənt/",
  regulation: "/ˌreɡjuˈleɪʃn/",
  regulate: "/ˈreɡjuleɪt/",
  regulatory: "/ˈreɡjələtɔːri/",
  exception: "/ɪkˈsepʃn/",
  exceptional: "/ɪkˈsepʃənl/",
  adhere: "/ədˈhɪr/",
  adherence: "/ədˈhɪrəns/",
  severely: "/səˈvɪrli/",
  severe: "/səˈvɪr/",
  refrain: "/rɪˈfreɪn/",
  permission: "/pərˈmɪʃn/",
  permit: "/pərˈmɪt/",
  access: "/ˈækses/",
  accessible: "/əkˈsesəbl/",
  accessibility: "/əkˌsesəˈbɪləti/",
  thoroughly: "/ˈθɜːroʊli/",
  thorough: "/ˈθɜːroʊ/",
  revise: "/rɪˈvaɪz/",
  revision: "/rɪˈvɪʒn/",
  approach: "/əˈproʊtʃ/",
  approval: "/əˈpruːvl/",
  approve: "/əˈpruːv/",
  form: "/fɔːrm/ ",
  immediately: "/ɪˈmiːdiətli/",
  immediate: "/ɪˈmiːdiət/",
  inspection: "/ɪnˈspekʃn/",
  inspect: "/ɪnˈspekt/",
  inspector: "/ɪnˈspektər/",
  arrangement: "/əˈreɪndʒmənt/",
  arrange: "/əˈreɪndʒ/",
  mandate: "/ˈmændeɪt/",
  mandatory: "/ˈmændətɔːri/",
  enable: "/ɪˈneɪbl/",
  standard: "/ˈstændərd/",
  standardize: "/ˈstændərdaɪz/",
  constant: "/ˈkɑːnstənt/",
  constantly: "/ˈkɑːnstəntli/",
  act: "/ækt/",
  action: "/ˈækʃn/",
  compensation: "/ˌkɑːmpenˈseɪʃn/",
  compensate: "/ˈkɑːmpenseɪt/",
  ban: "/bæn/",
  obligation: "/ˌɑːblɪˈɡeɪʃn/",
  obligatory: "/əˈblɪɡətɔːri/",
  authorize: "/ˈɔːθəraɪz/",
  authorization: "/ˌɔːθərəˈzeɪʃn/",
  authority: "/əˈθɔːrəti/",
  prohibit: "/prəˈhɪbɪt/",
  prohibition: "/ˌproʊhɪˈbɪʃn/",
  abolish: "/əˈbɑːlɪʃ/",
  abolition: "/ˌæbəˈlɪʃn/",
  enforce: "/ɪnˈfɔːrs/",
  enforcement: "/ɪnˈfɔːrsmənt/",
  habit: "/ˈhæbɪt/",
  habitual: "/həˈbɪtʃuəl/",
  legislation: "/ˌledʒɪsˈleɪʃn/",
  legislative: "/ˈledʒɪsleɪtɪv/",
  restrict: "/rɪˈstrɪkt/",
  restriction: "/rɪˈstrɪkʃn/",
  restrictive: "/rɪˈstrɪktɪv/",
  revenue: "/ˈrevənjuː/",
  invoice: "/ˈɪnvɔɪs/",
  budget: "/ˈbʌdʒɪt/",
  fiscal: "/ˈfɪskəl/",
  expenditure: "/ɪkˈspendɪtʃər/",
  profit: "/ˈprɑːfɪt/",
  profitable: "/ˈprɑːfɪtəbl/",
  deficit: "/ˈdefɪsɪt/",
  dividend: "/ˈdɪvɪdend/",
  campaign: "/kæmˈpeɪn/",
  demographic: "/ˌdeməˈɡræfɪk/",
  promotion: "/prəˈmoʊʃn/",
  promote: "/prəˈmoʊt/",
  brand: "/brænd/",
  endorse: "/ɪnˈdɔːrs/",
  slogan: "/ˈsloʊɡən/",
  itinerary: "/aɪˈtɪnəreri/",
  terminal: "/ˈtɜːrmɪnl/",
  depart: "/dɪˈpɑːrt/",
  departure: "/dɪˈpɑːrtʃər/",
  baggage: "/ˈbæɡɪdʒ/",
  luggage: "/ˈlʌɡɪdʒ/",
  spreadsheet: "/ˈspredʃiːt/",
  database: "/ˈdeɪtəbeɪs/",
  correspondence: "/ˌkɔːrəˈspɑːndəns/",
  agenda: "/əˈdʒendə/",
  inventory: "/ˈɪnvəntɔːri/",
  exposition: "/ˌekspəˈzɪʃn/",
  exhibit: "/ɪɡˈzɪbɪt/",
  exhibition: "/ˌeksɪˈbɪʃn/",
  renovation: "/ˌrenəˈveɪʃn/",
  renovate: "/ˈrenəveɪt/",
  remodeling: "/ˌriːˈmɑːdlɪŋ/",
  handout: "/ˈhændaʊt/",
  distribute: "/dɪˈstrɪbjuːt/",
  distribution: "/ˌdɪstrɪˈbjuːʃn/",
  edge: "/edʒ/",
  border: "/ˈbɔːrdər/",
  stitch: "/stɪtʃ/",
  sew: "/soʊ/",
  manuscript: "/ˈmænjuskrɪpt/",
  editor: "/ˈedɪtər/",
  editorial: "/ˌedɪˈtɔːriəl/",
  supplies: "/səˈplaɪz/",
  supply: "/səˈplaɪ/",
  election: "/ɪˈlekʃn/",
  elect: "/ɪˈlekt/",
  résumé: "/ˈrezəmeɪ/",
  resume: "/ˈrezəmeɪ/",
  vacancy: "/ˈveɪkənsi/",
  vacant: "/ˈveɪkənt/",
  opening: "/ˈoʊpnɪŋ/",
  open: "/ˈoʊpn/",
  tenant: "/ˈtenənt/",
  landlord: "/ˈlændlɔːrd/",
  lease: "/liːs/",
  property: "/ˈprɑːpərti/",
  estate: "/ɪˈsteɪt/",
  premises: "/ˈpremɪsɪz/",
  facility: "/fəˈsɪləti/",
  amenity: "/əˈmenəti/",
  utility: "/juːˈtɪləti/",
  district: "/ˈdɪstrɪkt/",
  neighborhood: "/ˈneɪbərhʊd/",
  resident: "/ˈrezɪdənt/",
  residential: "/ˌrezɪˈdenʃl/",
  maintenance: "/ˈmeɪntənəns/",
  maintain: "/meɪnˈteɪn/",
  warranty: "/ˈwɔːrənti/",
  guarantee: "/ˌɡærənˈtiː/",
  refund: "/ˈriːfʌnd/",
  reimburse: "/ˌriːɪmˈbɜːrs/",
  receipt: "/rɪˈsiːt/",
  transaction: "/trænˈzækʃn/",
  contract: "/ˈkɑːntrækt/",
  agreement: "/əˈɡriːmənt/",
  negotiate: "/nɪˈɡoʊʃieɪt/",
  negotiation: "/nɪˌɡoʊʃiˈeɪʃn/",
  partner: "/ˈpɑːrtnər/",
  partnership: "/ˈpɑːrtnərʃɪp/",
  client: "/ˈklaɪənt/",
  customer: "/ˈkʌstəmər/",
  consumer: "/kənˈsuːmər/",
  strategy: "/ˈstrætədʒi/",
  strategic: "/strəˈtiːdʒɪk/",
  objective: "/əbˈdʒektɪv/",
  target: "/ˈtɑːrɡɪt/",
  schedule: "/ˈskedʒuːl/",
  deadline: "/ˈdedlaɪn/",
  confirm: "/kənˈfɜːrm/",
  confirmation: "/ˌkɑːnfərˈmeɪʃn/",
  cancel: "/ˈkænsl/",
  cancellation: "/ˌkænsəˈleɪʃn/",
  postpone: "/poʊstˈpoʊn/",
  delay: "/dɪˈleɪ/",
  urgent: "/ˈɜːrdʒənt/",
  priority: "/praɪˈɔːrəti/",
  prioritize: "/praɪˈɔːrətaɪz/",
  efficient: "/ɪˈfɪʃnt/",
  efficiency: "/ɪˈfɪʃnsi/",
  effective: "/ɪˈfektɪv/",
  productivity: "/ˌproʊdʌkˈtɪvəti/",
  productive: "/prəˈdʌktɪv/",
  produce: "/prəˈduːs/",
  product: "/ˈprɑːdʌkt/",
  production: "/prəˈdʌkʃn/",
  annual: "/ˈænjuəl/",
  quarterly: "/ˈkwɔːrtərli/",
  monthly: "/ˈmʌnθli/",
  weekly: "/ˈwiːkli/",
  daily: "/ˈdeɪli/",
  survey: "/ˈsɜːrveɪ/",
  feedback: "/ˈfiːdbæk/",
  evaluate: "/ɪˈvæljueɪt/",
  evaluation: "/ɪˌvæljuˈeɪʃn/",
  assess: "/əˈses/",
  assessment: "/əˈsesmənt/",
  conference: "/ˈkɑːnfərəns/",
  convention: "/kənˈvenʃn/",
  seminar: "/ˈsemɪnɑːr/",
  workshop: "/ˈwɜːrkʃɑːp/",
  attend: "/əˈtend/",
  attendance: "/əˈtendəns/",
  attendee: "/əˌtenˈdiː/",
  participate: "/pɑːrˈtɪsɪpeɪt/",
  participant: "/pɑːrˈtɪsɪpənt/",
  collaboration: "/kəˌlæbəˈreɪʃn/",
  collaborate: "/kəˈlæbəreɪt/",
  cooperate: "/koʊˈɑːpəreɪt/",
  colleague: "/ˈkɑːliːɡ/",
  coworker: "/ˈkoʊwɜːrkər/",
  supervisor: "/ˈsuːpərvaɪzər/",
  supervise: "/ˈsuːpərvaɪz/",
  supervision: "/ˌsuːpərˈvɪʒn/",
  executive: "/ɪɡˈzekjətɪv/",
  director: "/dəˈrektər/",
  department: "/dɪˈpɑːrtmənt/",
  division: "/dɪˈvɪʒn/",
  branch: "/bræntʃ/",
  headquarters: "/ˈhedkwɔːrtərz/",
  subsidiary: "/səbˈsɪdieri/",
  representative: "/ˌreprɪˈzentətɪv/",
  represent: "/ˌreprɪˈzent/",
  invest: "/ɪnˈvest/",
  investment: "/ɪnˈvestmənt/",
  investor: "/ɪnˈvestər/",
  stock: "/stɑːk/",
  shareholder: "/ˈʃerhoʊldər/",
  stakeholder: "/ˈsteɪkhoʊldər/",
};

// Smart Grapheme-to-Phoneme (G2P) rule-based algorithm for any English word
export function generatePhoneticIPA(rawWord: string): string {
  const word = rawWord.toLowerCase().trim().replace(/[^a-z'-]/g, "");
  if (!word) return "";

  // 1. Direct dictionary match
  if (COMMON_IPA_DICTIONARY[word]) {
    return COMMON_IPA_DICTIONARY[word];
  }

  // 2. Check stem / singular / base form
  if (word.endsWith("s") && COMMON_IPA_DICTIONARY[word.slice(0, -1)]) {
    const base = COMMON_IPA_DICTIONARY[word.slice(0, -1)];
    return base.replace(/\/$/, "z/");
  }
  if (word.endsWith("ed") && COMMON_IPA_DICTIONARY[word.slice(0, -2)]) {
    const base = COMMON_IPA_DICTIONARY[word.slice(0, -2)];
    return base.replace(/\/$/, "d/");
  }
  if (word.endsWith("ing") && COMMON_IPA_DICTIONARY[word.slice(0, -3)]) {
    const base = COMMON_IPA_DICTIONARY[word.slice(0, -3)];
    return base.replace(/\/$/, "ɪŋ/");
  }

  // 3. Rule-based IPA generator (phonetic mapping)
  let phonetic = word;

  // Prefixes
  phonetic = phonetic
    .replace(/^sub/, "səb")
    .replace(/^trans/, "trænz")
    .replace(/^inter/, "ɪntər")
    .replace(/^over/, "oʊvər")
    .replace(/^under/, "ʌndər")
    .replace(/^pre/, "priː")
    .replace(/^pro/, "proʊ")
    .replace(/^re/, "rɪ")
    .replace(/^de/, "dɪ")
    .replace(/^dis/, "dɪs")
    .replace(/^mis/, "mɪs")
    .replace(/^un/, "ʌn")
    .replace(/^in/, "ɪn")
    .replace(/^im/, "ɪm");

  // Suffixes
  phonetic = phonetic
    .replace(/tion$/, "ʃn")
    .replace(/sion$/, "ʒn")
    .replace(/cian$/, "ʃn")
    .replace(/ture$/, "tʃər")
    .replace(/sure$/, "ʒər")
    .replace(/able$/, "əbl")
    .replace(/ible$/, "əbl")
    .replace(/ment$/, "mənt")
    .replace(/ness$/, "nəs")
    .replace(/less$/, "ləs")
    .replace(/ful$/, "fl")
    .replace(/ly$/, "li")
    .replace(/ity$/, "əti")
    .replace(/ous$/, "əs")
    .replace(/ize$/, "aɪz")
    .replace(/ise$/, "aɪz")
    .replace(/ify$/, "ɪfaɪ")
    .replace(/ate$/, "eɪt")
    .replace(/ing$/, "ɪŋ")
    .replace(/ed$/, "d");

  // Vowel Digraphs
  phonetic = phonetic
    .replace(/igh/g, "aɪ")
    .replace(/eau/g, "oʊ")
    .replace(/ee/g, "iː")
    .replace(/ea/g, "iː")
    .replace(/oa/g, "oʊ")
    .replace(/ai/g, "eɪ")
    .replace(/ay/g, "eɪ")
    .replace(/oi/g, "ɔɪ")
    .replace(/oy/g, "ɔɪ")
    .replace(/oo/g, "uː")
    .replace(/ou/g, "aʊ")
    .replace(/ow/g, "oʊ")
    .replace(/au/g, "ɔː")
    .replace(/aw/g, "ɔː")
    .replace(/ew/g, "juː")
    .replace(/ur/g, "ɜːr")
    .replace(/er/g, "ər")
    .replace(/ir/g, "ɜːr")
    .replace(/or/g, "ɔːr")
    .replace(/ar/g, "ɑːr");

  // Consonant Digraphs
  phonetic = phonetic
    .replace(/ph/g, "f")
    .replace(/sh/g, "ʃ")
    .replace(/ch/g, "tʃ")
    .replace(/th/g, "θ")
    .replace(/wh/g, "w")
    .replace(/ck/g, "k")
    .replace(/ng/g, "ŋ")
    .replace(/qu/g, "kw");

  // Individual Vowels
  phonetic = phonetic
    .replace(/a(?=[bcdfghjklmnpqrstvwxyz]e\b)/g, "eɪ")
    .replace(/i(?=[bcdfghjklmnpqrstvwxyz]e\b)/g, "aɪ")
    .replace(/o(?=[bcdfghjklmnpqrstvwxyz]e\b)/g, "oʊ")
    .replace(/u(?=[bcdfghjklmnpqrstvwxyz]e\b)/g, "juː");

  // Remove silent e at word end
  phonetic = phonetic.replace(/([bcdfghjklmnpqrstvwxyz])e\b/g, "$1");

  // Add primary stress mark at the beginning of the word if none
  if (!phonetic.includes("ˈ") && !phonetic.includes("ˌ")) {
    phonetic = `ˈ${phonetic}`;
  }

  return `/${phonetic}/`;
}

// Master function to extract or lookup phonetic transcription
export function getWordPhonetic(rawWord: string): string {
  if (!rawWord) return "";

  // 1. Check if rawWord contains a phonetic in slashes or brackets
  const slashMatch = rawWord.match(/\/[^/]+\//);
  if (slashMatch) return slashMatch[0];

  const bracketMatch = rawWord.match(/\[[^\]]+\]/);
  if (bracketMatch) return `/${bracketMatch[0].replace(/[\[\]]/g, "")}/`;

  // 2. Clean word: strip leading/trailing symbols (=, ~, -, +, *, •, >)
  let cleanWord = rawWord
    .replace(/\([^)]*\)/g, "")
    .replace(/^[=~:;\-+•*>\s]+/, "")
    .trim()
    .toLowerCase();

  // If string contains "=>" or "=", take first part if both exist
  if (cleanWord.includes("=>")) {
    cleanWord = cleanWord.split("=>")[0].trim();
  }
  if (cleanWord.includes("=")) {
    cleanWord = cleanWord.split("=")[0].trim();
  }

  // Remove trailing punctuation
  cleanWord = cleanWord.replace(/[=~:;\-+•*<>,.]+$/, "").trim();

  // Keep English letters, spaces, hyphens and apostrophes
  cleanWord = cleanWord.replace(/[^a-z\s\-']/g, "").trim();

  if (!cleanWord) return "";

  // 3. Return from dictionary or generate rule-based
  if (COMMON_IPA_DICTIONARY[cleanWord]) {
    return COMMON_IPA_DICTIONARY[cleanWord];
  }

  // Handle multi-word phrase like "turn down", "in advance"
  if (cleanWord.includes(" ")) {
    const parts = cleanWord.split(/\s+/).map((w) => COMMON_IPA_DICTIONARY[w] || generatePhoneticIPA(w));
    const combined = parts.map((p) => p.replace(/^\/|\/$/g, "")).join(" ");
    return `/${combined}/`;
  }

  return generatePhoneticIPA(cleanWord);
}

