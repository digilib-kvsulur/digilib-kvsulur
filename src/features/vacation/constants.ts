export const VACATION_BANNER_DISMISS_KEY = "vacation_banner_dismissed";
export const VACATION_ERROR_MESSAGES: Record<string, string> = {
  outside_submission_window: "Submissions are closed for this activity right now.",
  already_submitted: "You already submitted today's activity.",
  already_awarded: "This submission was already reviewed by another staff member.",
  already_reviewed: "This submission was already reviewed by another staff member.",
  forbidden: "You do not have permission to do that.",
  students_only: "Only students can submit vacation activities.",
  activity_not_available: "This activity is not available.",
  campaign_not_active: "The vacation campaign is not active.",
  empty_submission: "Add a short write-up or a link before submitting.",
  invalid_link: "Links must start with http:// or https://.",
  rejection_reason_required: "A rejection reason is required.",
  invalid_points: "Points must be between 0 and the campaign maximum.",
  invalid_decision: "Choose approve or reject.",
  date_outside_campaign: "Activity dates must fall inside the campaign dates.",
  date_required_to_activate: "Set a date before activating an activity.",
  instructions_required_to_activate: "Add instructions before activating an activity.",
  cannot_move_activity_with_submissions: "This activity already has submissions, so its date cannot change.",
  not_authenticated: "Sign in again to continue.",
  submission_not_found: "That submission could not be found.",
  "schema cache": "The vacation tables have not been created in Supabase yet. Run migration 20261010150000_vacation_campaign.sql in your Supabase SQL Editor.",
  vacation_campaigns: "The vacation tables have not been created in Supabase yet. Run migration 20261010150000_vacation_campaign.sql in your Supabase SQL Editor.",
  vacation_submissions_content_check: "Your submission content is too long. Please shorten your response before submitting.",
  invalid_marks: "Marks must be between 0 and 1000.",
};

import type { VacationSubmissionType } from "./types";

export interface EventRubricItem {
  criterion: string;
  points: number;
}

export interface PosterActivityTemplate {
  order: number;
  title: string;
  subtitle?: string;
  tagline?: string;
  submissionType: VacationSubmissionType;
  submissionPrompt: string;
  description: string;
  learningOutcomes: string[];
  instructions: string;
  mode: "individual" | "team" | "both";
  recommendedTeamSize?: string;
  maxScore: number;
  rubric: EventRubricItem[];
  badgeName: string;
  badgeIcon: string;
  themeOrChallenge?: string;
}

export const XP_PER_VACATION_POINT = 5;
export const pointsToXp = (pts: number) => Math.round(pts * XP_PER_VACATION_POINT);
export const xpToPoints = (xp: number) => Math.round(xp / XP_PER_VACATION_POINT);

export const POSTER_ACTIVITIES: PosterActivityTemplate[] = [
  {
    order: 1,
    title: "STEAM Challenge",
    subtitle: "Science + Technology + Engineering + Art + Maths",
    tagline: "Build • Solve • Innovate",
    themeOrChallenge: "Build a bridge that can hold the maximum weight using limited materials.",
    mode: "team",
    recommendedTeamSize: "2–4 students",
    maxScore: 100,
    badgeName: "STEAM Master",
    badgeIcon: "⚙️",
    submissionType: "media_upload",
    submissionPrompt: "Describe your bridge model, materials used, load weight held, and provide a photo/video (up to 90s) with explanation.",
    description: "Teams get a real-world problem (e.g. build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.",
    learningOutcomes: ["Creative thinking", "Problem solving", "Science & technology concepts", "Teamwork & communication"],
    rubric: [
      { criterion: "Strength and performance", points: 30 },
      { criterion: "Scientific explanation", points: 25 },
      { criterion: "Creativity and design", points: 20 },
      { criterion: "Efficient use of materials", points: 15 },
      { criterion: "Presentation", points: 10 },
    ],
    instructions: `[TYPE:media_upload]\n**Theme:** Build a bridge that can hold the maximum weight using limited materials.\n\n**Rules:**\n• Maximum 4 students per team.\n• Suggested materials: 20 ice-cream sticks, paper, tape and string (span at least 20 cm).\n• Demonstrate the load test safely.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Strength & performance: 30 pts\n• Scientific explanation: 25 pts\n• Creativity & design: 20 pts\n• Efficient use of materials: 15 pts\n• Presentation: 10 pts\n\n**Submission:** Submit a photo or up to 90-second video with a short explanation.`,
  },
  {
    order: 2,
    title: "Digital Quest",
    subtitle: "Online Treasure Hunt",
    tagline: "Scan • Solve • Move Forward",
    themeOrChallenge: "The Lost Knowledge Vault",
    mode: "both",
    recommendedTeamSize: "Individual or 2–4 students",
    maxScore: 100,
    badgeName: "Digital Explorer",
    badgeIcon: "🧭",
    submissionType: "project_link",
    submissionPrompt: "Paste your completion secret phrase, answers to the sequential clues, and verification link.",
    description: "Teams solve clues, answer questions and complete tasks across science, mathematics, history, English, geography and general knowledge to unlock the secret phrase.",
    learningOutcomes: ["Research & information skills", "Digital literacy", "General knowledge", "Team coordination"],
    rubric: [
      { criterion: "Correct answers", points: 60 },
      { criterion: "Logic and clue-solving", points: 20 },
      { criterion: "Research accuracy", points: 10 },
      { criterion: "Completion time", points: 10 },
    ],
    instructions: `[TYPE:project_link]\n**Theme:** The Lost Knowledge Vault\n\n**Rules:**\n• Solve sequential clues across science, math, history and GK.\n• Each correct answer unlocks the next stage.\n• Break ties using correct answers, then completion time.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Correct answers: 60 pts\n• Logic & clue-solving: 20 pts\n• Research accuracy: 10 pts\n• Completion time: 10 pts\n\n**Submission:** Submit your decrypted final secret phrase and answers.`,
  },
  {
    order: 3,
    title: "Eco-Innovation Challenge",
    subtitle: "Environment & Sustainability",
    tagline: "Reduce • Reuse • Reimagine",
    themeOrChallenge: "Waste to Worth — Small Ideas, Big Impact",
    mode: "team",
    recommendedTeamSize: "2–4 students",
    maxScore: 100,
    badgeName: "Eco Warrior",
    badgeIcon: "🌿",
    submissionType: "media_upload",
    submissionPrompt: "Describe the environmental problem, reused materials used, solution, and attach 2–4 photos or up to 2-minute video.",
    description: "Students create useful products from waste materials or design solutions for environmental problems (e.g. water saving, clean energy, plastic reduction). They present their idea and its impact.",
    learningOutcomes: ["Environmental awareness", "Innovation & creativity", "Hands-on skills", "Presentation skills"],
    rubric: [
      { criterion: "Environmental impact", points: 30 },
      { criterion: "Innovation", points: 25 },
      { criterion: "Practical usefulness", points: 20 },
      { criterion: "Reuse of materials", points: 15 },
      { criterion: "Explanation and presentation", points: 10 },
    ],
    instructions: `[TYPE:media_upload]\n**Theme:** Waste to Worth — Small Ideas, Big Impact\n\n**Rules:**\n• Clean, safe, reused materials only (no hazardous waste or exposed wiring).\n• Realistic environmental benefit explanation.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Environmental impact: 30 pts\n• Innovation: 25 pts\n• Practical usefulness: 20 pts\n• Reuse of materials: 15 pts\n• Explanation & presentation: 10 pts\n\n**Submission:** Submit 2–4 photos and a short project report or up to 2-minute video.`,
  },
  {
    order: 4,
    title: "Cyber Safety & Digital Literacy Quiz",
    subtitle: "Think Before You Click",
    tagline: "Think • Click • Stay Safe",
    themeOrChallenge: "Think Before You Click",
    mode: "individual",
    recommendedTeamSize: "Individual",
    maxScore: 100,
    badgeName: "Cyber Guardian",
    badgeIcon: "🛡️",
    submissionType: "quiz",
    submissionPrompt: "Complete the 30-question cyber safety scenario quiz and write your personal digital safety reflection.",
    description: "A fun scenario-based assessment covering passwords, phishing, privacy, cyberbullying, misinformation, digital footprints and responsible AI use.",
    learningOutcomes: ["Online safety rules", "Critical thinking", "Media literacy", "Responsible digital behaviour"],
    rubric: [
      { criterion: "30 correct scenario answers (3 pts each)", points: 90 },
      { criterion: "Safety reflection statement", points: 10 },
    ],
    instructions: `[TYPE:quiz]\n**Theme:** Think Before You Click\n\n**Rules:**\n• One scored attempt per student (20 minutes).\n• Covers phishing, passwords, digital footprints, fake news and cyberbullying.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• 30 Scenario MCQs (3 pts each): 90 pts\n• Safety reflection statement: 10 pts\n\n**Submission:** Complete the quiz module and write your safety commitment.`,
  },
  {
    order: 5,
    title: "Functional English & Communication Show",
    subtitle: "Real-Life Expression",
    tagline: "Speak • Express • Inspire",
    themeOrChallenge: "Speak. Express. Inspire.",
    mode: "both",
    recommendedTeamSize: "Individual or 2–4 students",
    maxScore: 100,
    badgeName: "Young Orator",
    badgeIcon: "🎙️",
    submissionType: "media_upload",
    submissionPrompt: "Submit your 1–3 minute video or audio recording and speech script.",
    description: "Develop confidence and spoken English across 3 class tracks: Junior (I–V: storytelling/show-and-tell), Middle (VI–VIII: role-play/news reading/2-min talk), Senior (IX–XII: product pitch/persuasive speech).",
    learningOutcomes: ["Communication skills", "Creativity & imagination", "Confidence", "Public speaking"],
    rubric: [
      { criterion: "Clarity and pronunciation", points: 25 },
      { criterion: "Confidence and delivery", points: 25 },
      { criterion: "Content and organisation", points: 20 },
      { criterion: "Creativity and expression", points: 15 },
      { criterion: "Audience engagement", points: 15 },
    ],
    instructions: `[TYPE:media_upload]\n**Theme:** Speak. Express. Inspire.\n\n**Tracks:**\n• Junior (Classes I–V): Storytelling, poem recitation or show-and-tell.\n• Middle (Classes VI–VIII): Role-play, news reading or 2-minute talk.\n• Senior (Classes IX–XII): Product pitch, persuasive speech or mock interview.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Clarity & pronunciation: 25 pts\n• Confidence & delivery: 25 pts\n• Content & organisation: 20 pts\n• Creativity & expression: 15 pts\n• Audience engagement: 15 pts\n\n**Submission:** Submit a 1–3 minute video/audio recording or attend approved live session.`,
  },
  {
    order: 6,
    title: "History Detective",
    subtitle: "History & Social Science Game",
    tagline: "Discover • Decide • Defend",
    themeOrChallenge: "The Missing Monument Record",
    mode: "both",
    recommendedTeamSize: "Individual or 2–4 students",
    maxScore: 100,
    badgeName: "History Detective",
    badgeIcon: "🏛️",
    submissionType: "project_link",
    submissionPrompt: "Identify the monument, ruler and period, and provide your reasoning supported by at least two evidence clues.",
    description: "Solve historical evidence clues (timelines, maps, descriptions, artefacts) to deduce a historical mystery and defend your conclusion with verifiable historical facts.",
    learningOutcomes: ["History & geography", "Critical thinking", "Decision making", "Teamwork"],
    rubric: [
      { criterion: "Correct identification", points: 40 },
      { criterion: "Use of historical evidence", points: 25 },
      { criterion: "Timeline and map interpretation", points: 15 },
      { criterion: "Reasoning and explanation", points: 20 },
    ],
    instructions: `[TYPE:project_link]\n**Theme:** Discover. Decide. Defend.\n\n**Rules:**\n• Analyze evidence cards (monument dynasty, ruler, map region, era).\n• Final answer must be supported by at least 2 specific clues.\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Correct identification: 40 pts\n• Use of historical evidence: 25 pts\n• Timeline & map interpretation: 15 pts\n• Reasoning & explanation: 20 pts\n\n**Submission:** Submit your identified monument/person/period and detailed deduction.`,
  },
  {
    order: 7,
    title: "Math Marathon",
    subtitle: "Real Life Maths",
    tagline: "Think • Calculate • Win",
    themeOrChallenge: "Think. Calculate. Win.",
    mode: "individual",
    recommendedTeamSize: "Individual",
    maxScore: 100,
    badgeName: "Math Wizard",
    badgeIcon: "🧮",
    submissionType: "text_response",
    submissionPrompt: "Complete all 4 rounds and submit your calculation steps, logic explanations, and real-life budget solution.",
    description: "4 Exciting rounds: Round 1 Quick Calculation (25 pts), Round 2 Logic Arena (25 pts), Round 3 Real-Life Maths (25 pts), Round 4 Final Challenge (25 pts).",
    learningOutcomes: ["Logical reasoning", "Quick calculation", "Financial awareness", "Confidence with numbers"],
    rubric: [
      { criterion: "Round 1 — Quick Calculation", points: 25 },
      { criterion: "Round 2 — Logic Arena", points: 25 },
      { criterion: "Round 3 — Real-Life Maths", points: 25 },
      { criterion: "Round 4 — Final Challenge", points: 25 },
    ],
    instructions: `[TYPE:text_response]\n**Theme:** Think. Calculate. Win.\n\n**4 Rounds (25 Pts Each = 100 Pts / 500 XP):**\n• Round 1: Quick Calculation (arithmetic, fractions, percentages)\n• Round 2: Logic Arena (patterns, sequences, logic riddles)\n• Round 3: Real-Life Maths (budgets, shopping discounts, practical problems)\n• Round 4: Final Challenge (complex multi-step puzzle)\n\n**Submission:** Submit your calculations and explanations for all 4 rounds.`,
  },
  {
    order: 8,
    title: "Creative Arts & Innovation Expo",
    subtitle: "Visual & Digital Creation",
    tagline: "Imagine • Create • Make a Difference",
    themeOrChallenge: "A Better Planet, A Better Future",
    mode: "both",
    recommendedTeamSize: "Individual or 2–4 students",
    maxScore: 100,
    badgeName: "Creative Visionary",
    badgeIcon: "🎨",
    submissionType: "media_upload",
    submissionPrompt: "Select category (Digital Art, Poster, Short Film, or DIY Innovation), submit image/video, title, and 50-word description.",
    description: "Students create original work under the theme 'A Better Planet, A Better Future'. Categories: Digital Art, Poster Design, Short Film (30–90s), or DIY Innovation.",
    learningOutcomes: ["Creativity & design thinking", "Digital skills", "Self-expression", "Awareness of real-world issues"],
    rubric: [
      { criterion: "Creativity and originality", points: 30 },
      { criterion: "Relevance to the theme", points: 20 },
      { criterion: "Visual quality or execution", points: 20 },
      { criterion: "Innovation and thought", points: 20 },
      { criterion: "Description and presentation", points: 10 },
    ],
    instructions: `[TYPE:media_upload]\n**Theme:** A Better Planet, A Better Future\n\n**Categories:**\n• Digital Art / Poster: 1 image + 50-word description\n• Short Film: 30–90 second video + brief explanation\n• DIY Innovation: 2–4 photos + short description\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Creativity & originality: 30 pts\n• Relevance to theme: 20 pts\n• Visual quality / execution: 20 pts\n• Innovation & thought: 20 pts\n• Description & presentation: 10 pts\n\n**Submission:** Submit your artwork / media with category and description.`,
  },
  {
    order: 9,
    title: "Mystery Code Breakers",
    subtitle: "Logic & Secret Codes",
    tagline: "Crack the Code • Unlock the Mystery",
    themeOrChallenge: "Crack the Code. Unlock the Mystery.",
    mode: "both",
    recommendedTeamSize: "Individual or 2–4 students",
    maxScore: 100,
    badgeName: "Code Master",
    badgeIcon: "🕵️",
    submissionType: "text_response",
    submissionPrompt: "Submit answers for all 5 stages: Number Lock, Letter Cipher, Logic Grid, Hidden Message, and Final Vault.",
    description: "5 Sequential Stages: Stage 1 The Number Lock, Stage 2 The Letter Cipher, Stage 3 The Logic Grid, Stage 4 The Hidden Message, Stage 5 The Final Vault.",
    learningOutcomes: ["Logical thinking", "Pattern recognition", "Problem-solving", "Teamwork"],
    rubric: [
      { criterion: "Correct solutions across 5 stages", points: 60 },
      { criterion: "Logical reasoning", points: 20 },
      { criterion: "Final mystery solved", points: 10 },
      { criterion: "Efficient completion", points: 10 },
    ],
    instructions: `[TYPE:text_response]\n**Theme:** Crack the Code. Unlock the Mystery.\n\n**5 Stages:**\n• Stage 1: Number Lock (number sequences)\n• Stage 2: Letter Cipher (shifting rule)\n• Stage 3: Logic Grid (matching clues)\n• Stage 4: Hidden Message (combined reveal)\n• Stage 5: The Final Vault (master puzzle)\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Correct solutions: 60 pts\n• Logical reasoning: 20 pts\n• Final mystery solved: 10 pts\n• Efficient completion: 10 pts\n\n**Submission:** Submit your stage-by-stage decryptions and final vault passphrase.`,
  },
  {
    order: 10,
    title: "Future Makers Pitch",
    subtitle: "Invent & Inspire",
    tagline: "Small Ideas • Big Impact",
    themeOrChallenge: "Small Ideas. Big Impact.",
    mode: "team",
    recommendedTeamSize: "2–4 students",
    maxScore: 100,
    badgeName: "Future Maker",
    badgeIcon: "🚀",
    submissionType: "project_link",
    submissionPrompt: "Submit your problem statement, solution prototype drawing/photo, and 60-second pitch video or presentation script.",
    description: "Invent a simple solution to a real-world problem (reduce food waste, save electricity, school transport, accessible learning), build a mini model or drawing, and deliver a 60-second pitch.",
    learningOutcomes: ["Innovation", "Design thinking", "Confidence", "Persuasive speaking"],
    rubric: [
      { criterion: "Originality and innovation", points: 25 },
      { criterion: "Problem-solving value", points: 25 },
      { criterion: "Practical feasibility", points: 20 },
      { criterion: "Prototype or design", points: 15 },
      { criterion: "Pitch and communication", points: 15 },
    ],
    instructions: `[TYPE:project_link]\n**Theme:** Small Ideas. Big Impact.\n\n**Pitch Structure (60 Seconds):**\n• 0–10s: The Problem\n• 10–30s: Your Invention / Solution\n• 30–45s: Expected Impact\n• 45–60s: Why It Matters & Call to Action\n\n**Scoring Rubric (100 Pts / 500 XP):**\n• Originality & innovation: 25 pts\n• Problem-solving value: 25 pts\n• Practical feasibility: 20 pts\n• Prototype or design: 15 pts\n• Pitch & communication: 15 pts\n\n**Submission:** Submit prototype photos/drawings and 60-second pitch video or script.`,
  },
];

export function parseActivityMeta(instructions?: string | null): {
  submissionType: VacationSubmissionType;
  quizId?: string;
  cleanInstructions: string;
} {
  if (!instructions) {
    return { submissionType: "mixed", cleanInstructions: "" };
  }
  let submissionType: VacationSubmissionType = "mixed";
  let quizId: string | undefined;

  const typeMatch = instructions.match(/\[TYPE:([a-z_]+)(?::([a-f0-9-]+))?\]/i);
  if (typeMatch) {
    const matchedType = typeMatch[1].toLowerCase() as VacationSubmissionType;
    if (["mixed", "quiz", "project_link", "text_response", "media_upload"].includes(matchedType)) {
      submissionType = matchedType;
    }
    if (typeMatch[2]) {
      quizId = typeMatch[2];
    }
  }

  const clean = instructions.replace(/\[TYPE:[^\]]+\]\n?/g, "").trim();
  return { submissionType, quizId, cleanInstructions: clean };
}

export function formatActivityInstructions(
  rawInstructions: string,
  submissionType: VacationSubmissionType,
  quizId?: string | null
): string {
  const clean = rawInstructions.replace(/\[TYPE:[^\]]+\]\n?/g, "").trim();
  const tag = quizId ? `[TYPE:${submissionType}:${quizId}]` : `[TYPE:${submissionType}]`;
  return `${tag}\n\n${clean}`;
}

export const AUTUMN_BREAK_SCHEDULE = {
  registrationDate: "2026-10-14",
  startDate: "2026-10-14",
  competitionsStartDate: "2026-10-15",
  competitionsEndDate: "2026-10-24",
  celebrationDate: "2026-10-25",
  endDate: "2026-10-25",
  dailyReleaseTime: "08:00",
  dailyCloseTime: "18:00",
};

export const MASTER_EVENT_BADGES = [
  { day: 1, name: "STEAM Master", icon: "⚙️", event: "STEAM Challenge" },
  { day: 2, name: "Digital Explorer", icon: "🧭", event: "Digital Quest" },
  { day: 3, name: "Eco Warrior", icon: "🌿", event: "Eco-Innovation Challenge" },
  { day: 4, name: "Cyber Guardian", icon: "🛡️", event: "Cyber Safety & Digital Literacy Quiz" },
  { day: 5, name: "Young Orator", icon: "🎙️", event: "Functional English & Communication Show" },
  { day: 6, name: "History Detective", icon: "🏛️", event: "History Detective" },
  { day: 7, name: "Math Wizard", icon: "🧮", event: "Math Marathon" },
  { day: 8, name: "Creative Visionary", icon: "🎨", event: "Creative Arts & Innovation Expo" },
  { day: 9, name: "Code Master", icon: "🕵️", event: "Mystery Code Breakers" },
  { day: 10, name: "Future Maker", icon: "🚀", event: "Future Makers Pitch" },
  { day: 0, name: "DLMS All-Rounder", icon: "⭐", event: "Participation in all 10 events" },
  { day: 99, name: "DLMS Autumn Champion", icon: "👑", event: "Highest combined verified score" },
];

export interface DayProgram {
  day: number;
  dateOffset: number; // 0 for day 1 (15 Oct), 1 for day 2, etc.
  dateStr: string;
  event: PosterActivityTemplate;
  quizChampionship: {
    title: string;
    subtitle: string;
    tagline: string;
    description: string;
    instructions: string;
    subject: string;
    rewardPoints: number;
  };
}

export const TEN_DAYS_PROGRAM: DayProgram[] = [
  {
    day: 1,
    dateOffset: 0,
    dateStr: "2026-10-15",
    event: POSTER_ACTIVITIES[0], // STEAM Challenge
    quizChampionship: {
      title: "Day 1 Quiz Championship: Science & Technology Wonders",
      subtitle: "Daily Live Quiz Championship • Day 1",
      tagline: "Explore • Discover • Score",
      description: "Fast-paced live trivia on scientific discoveries, modern technology, and famous inventors. Test your speed and accuracy!",
      instructions: `[TYPE:quiz]\n**Tagline:** Explore • Discover • Score\n\n**Championship Brief:**\nParticipate in today's Day 1 Live Quiz Championship covering fundamental science, robotics, space exploration, and tech breakthroughs.\n\n**What you learn:**\n• Scientific curiosity & fact recall\n• Rapid decision making\n• Competition under time pressure\n\n**Submission:** Complete today's quiz in the Quizzes tab or live championship room, and record your score!`,
      subject: "Science & Tech",
      rewardPoints: 50,
    },
  },
  {
    day: 2,
    dateOffset: 1,
    dateStr: "2026-10-16",
    event: POSTER_ACTIVITIES[1], // Digital Quest
    quizChampionship: {
      title: "Day 2 Quiz Championship: Digital Agility & Cyber Smarts",
      subtitle: "Daily Live Quiz Championship • Day 2",
      tagline: "Scan • Process • Prevail",
      description: "Battle live in questions spanning web literacy, search skills, AI basics, and digital puzzles.",
      instructions: `[TYPE:quiz]\n**Tagline:** Scan • Process • Prevail\n\n**Championship Brief:**\nTest your digital navigation skills, internet facts, and computing concepts in this rapid 15-minute quiz battle.\n\n**What you learn:**\n• Digital fluency\n• Search efficiency\n• Critical digital analysis\n\n**Submission:** Complete the live quiz and submit your score to claim your multiplier points.`,
      subject: "Computer Science & IT",
      rewardPoints: 50,
    },
  },
  {
    day: 3,
    dateOffset: 2,
    dateStr: "2026-10-17",
    event: POSTER_ACTIVITIES[2], // Eco-Innovation Challenge
    quizChampionship: {
      title: "Day 3 Quiz Championship: Earth, Nature & Green Planet",
      subtitle: "Daily Live Quiz Championship • Day 3",
      tagline: "Green Brain • Clean Earth",
      description: "Trivia on ecosystems, biodiversity, renewable energy, climate heroes, and conservation champions.",
      instructions: `[TYPE:quiz]\n**Tagline:** Green Brain • Clean Earth\n\n**Championship Brief:**\nShowcase your environmental knowledge! Answer questions on wildlife, green energy, oceans, and eco-conservation.\n\n**What you learn:**\n• Environmental literacy\n• Sustainable practices awareness\n• Global ecology concepts\n\n**Submission:** Participate in the live quiz or submit your score reflection.`,
      subject: "Environmental Science",
      rewardPoints: 50,
    },
  },
  {
    day: 4,
    dateOffset: 3,
    dateStr: "2026-10-18",
    event: POSTER_ACTIVITIES[3], // Cyber Safety
    quizChampionship: {
      title: "Day 4 Quiz Championship: Cyber Shield & Online Safety",
      subtitle: "Daily Live Quiz Championship • Day 4",
      tagline: "Think • Click • Stay Safe",
      description: "Spot phishing scams, decode digital privacy rules, identify fake news, and become a certified cyber guardian.",
      instructions: `[TYPE:quiz]\n**Tagline:** Think • Click • Stay Safe\n\n**Championship Brief:**\nA scenario-based live quiz on phishing detection, password hygiene, media literacy, and safe digital behavior.\n\n**What you learn:**\n• Scam & phishing awareness\n• Data privacy principles\n• Media fact-checking\n\n**Submission:** Record your cyber safety championship score and your #1 safety takeaway.`,
      subject: "Cyber Safety",
      rewardPoints: 50,
    },
  },
  {
    day: 5,
    dateOffset: 4,
    dateStr: "2026-10-19",
    event: POSTER_ACTIVITIES[4], // Functional English
    quizChampionship: {
      title: "Day 5 Quiz Championship: Word Power & Language Master",
      subtitle: "Daily Live Quiz Championship • Day 5",
      tagline: "Vocabulary • Idioms • Eloquence",
      description: "Challenge your vocabulary, idioms, word roots, tongue twisters, and grammatical precision against time.",
      instructions: `[TYPE:quiz]\n**Tagline:** Vocabulary • Idioms • Eloquence\n\n**Championship Brief:**\nSprint through 15 high-energy language challenges: vocabulary matches, idioms in action, and smart communication traps.\n\n**What you learn:**\n• Vocabulary expansion\n• Idiomatic expressions\n• Language speed & fluency\n\n**Submission:** Take the English championship quiz and submit your score.`,
      subject: "English & Communication",
      rewardPoints: 50,
    },
  },
  {
    day: 6,
    dateOffset: 5,
    dateStr: "2026-10-20",
    event: POSTER_ACTIVITIES[5], // History Detective
    quizChampionship: {
      title: "Day 6 Quiz Championship: Incredible India & World Heritage",
      subtitle: "Daily Live Quiz Championship • Day 6",
      tagline: "Uncover • Identify • Triumph",
      description: "Historical timelines, monumental architecture, freedom fighters, world landmarks, and timeless civilizations.",
      instructions: `[TYPE:quiz]\n**Tagline:** Uncover • Identify • Triumph\n\n**Championship Brief:**\nJourney through centuries of history, map puzzles, and historical trivia in today's high-octane quiz championship.\n\n**What you learn:**\n• Indian and world history\n• Geography & map literacy\n• Historical context and legacy\n\n**Submission:** Join the history battle lobby and submit your results.`,
      subject: "History & Heritage",
      rewardPoints: 50,
    },
  },
  {
    day: 7,
    dateOffset: 6,
    dateStr: "2026-10-21",
    event: POSTER_ACTIVITIES[6], // Math Marathon
    quizChampionship: {
      title: "Day 7 Quiz Championship: Speed Mental Maths & Number Ninja",
      subtitle: "Daily Live Quiz Championship • Day 7",
      tagline: "Calculate • Accelerate • Conquer",
      description: "Lightning-fast arithmetic, pattern recognition, mental estimation tricks, and logical brain benders.",
      instructions: `[TYPE:quiz]\n**Tagline:** Calculate • Accelerate • Conquer\n\n**Championship Brief:**\nPut your calculator away! Race against the buzzer with mental calculation hacks, sequence patterns, and logic traps.\n\n**What you learn:**\n• Rapid mental arithmetic\n• Number agility and patterns\n• Focus under time constraints\n\n**Submission:** Complete the Math Marathon Quiz Championship and record your score.`,
      subject: "Mathematics & Logic",
      rewardPoints: 50,
    },
  },
  {
    day: 8,
    dateOffset: 7,
    dateStr: "2026-10-22",
    event: POSTER_ACTIVITIES[7], // Creative Arts & Innovation
    quizChampionship: {
      title: "Day 8 Quiz Championship: Arts, Culture & World Inventions",
      subtitle: "Daily Live Quiz Championship • Day 8",
      tagline: "Visuals • Masterpieces • Ingenuity",
      description: "Famous paintings, world architecture, musical breakthroughs, classical traditions, and design marvels.",
      instructions: `[TYPE:quiz]\n**Tagline:** Visuals • Masterpieces • Ingenuity\n\n**Championship Brief:**\nIdentify famous masterpieces, artistic styles, world culture trivia, and creative design innovations.\n\n**What you learn:**\n• Cultural awareness\n• Art history appreciation\n• Creative design thinking\n\n**Submission:** Record your quiz score and submit for Day 8 bonus points.`,
      subject: "Arts & World Culture",
      rewardPoints: 50,
    },
  },
  {
    day: 9,
    dateOffset: 8,
    dateStr: "2026-10-23",
    event: POSTER_ACTIVITIES[8], // Mystery Code Breakers
    quizChampionship: {
      title: "Day 9 Quiz Championship: Secret Ciphers, Riddles & Logic",
      subtitle: "Daily Live Quiz Championship • Day 9",
      tagline: "Crack • Deduce • Unlock",
      description: "Caesar ciphers, lateral thinking riddles, logical deductions, and deductive detective conundrums.",
      instructions: `[TYPE:quiz]\n**Tagline:** Crack • Deduce • Unlock\n\n**Championship Brief:**\nCan you crack the code before time expires? Decode ciphers, unravel tricky riddles, and test your deduction power.\n\n**What you learn:**\n• Cryptography & cipher logic\n• Deductive reasoning\n• Lateral thinking skills\n\n**Submission:** Submit your code-breaker quiz performance confirmation.`,
      subject: "Logic & Cryptography",
      rewardPoints: 50,
    },
  },
  {
    day: 10,
    dateOffset: 9,
    dateStr: "2026-10-24",
    event: POSTER_ACTIVITIES[9], // Future Makers Pitch / Grand Showcase
    quizChampionship: {
      title: "Day 10 Grand Finale Quiz Championship: Ultimate Mastermind",
      subtitle: "Daily Live Quiz Championship • Day 10 Grand Finale",
      tagline: "The Final Showdown • Ultimate Champion",
      description: "The grand capstone quiz combining best questions from Science, History, Math, Tech, Nature, and Arts!",
      instructions: `[TYPE:quiz]\n**Tagline:** The Final Showdown • Ultimate Champion\n\n**Championship Brief:**\nThe ultimate test of the 10-day vacation! All subjects, highest multiplier bonus, and crowning the Vacation Grand Mastermind.\n\n**What you learn:**\n• Comprehensive knowledge retention\n• Endurance and peak performance\n• Celebration of multi-disciplinary learning\n\n**Submission:** Complete the Grand Finale Championship to unlock the Day 10 Mastermind badge!`,
      subject: "All-Round Mastermind",
      rewardPoints: 100,
    },
  },
];

export function inferActivitySubmissionType(
  title?: string | null,
  instructions?: string | null
): VacationSubmissionType {
  const parsed = parseActivityMeta(instructions);
  if (parsed.submissionType !== "mixed") {
    return parsed.submissionType;
  }
  if (!title) return "mixed";
  const lower = title.toLowerCase();
  if (lower.includes("quiz") || lower.includes("trivia") || lower.includes("championship")) {
    return "quiz";
  }
  if (lower.includes("math") || lower.includes("code") || lower.includes("cipher") || lower.includes("review")) {
    return "text_response";
  }
  if (lower.includes("steam") || lower.includes("art") || lower.includes("eco") || lower.includes("experiment") || lower.includes("science")) {
    return "media_upload";
  }
  if (lower.includes("quest") || lower.includes("pitch") || lower.includes("detective") || lower.includes("typing") || lower.includes("showcase")) {
    return "project_link";
  }
  return "mixed";
}
