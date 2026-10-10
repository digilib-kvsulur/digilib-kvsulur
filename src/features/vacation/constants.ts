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
};

import type { VacationSubmissionType } from "./types";

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
}

export const POSTER_ACTIVITIES: PosterActivityTemplate[] = [
  {
    order: 1,
    title: "STEAM Challenge",
    subtitle: "Science + Technology + Engineering + Art + Maths",
    tagline: "Build • Solve • Innovate",
    submissionType: "media_upload",
    submissionPrompt: "Describe your STEAM model or solution, how you built it, and provide a photo/video or Drive link.",
    description: "Teams get a real-world problem (e.g. build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.",
    learningOutcomes: ["Creative thinking", "Problem solving", "Science & technology concepts", "Teamwork & communication"],
    instructions: `[TYPE:media_upload]\n**Tagline:** Build • Solve • Innovate\n\n**Challenge:**\nTeams get a real-world problem (e.g., build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.\n\n**What students learn:**\n• Creative thinking\n• Problem solving\n• Science & technology concepts\n• Teamwork & communication\n\n**Submission:** Write a summary of your model/solution and attach photos or a video drive link.`,
  },
  {
    order: 2,
    title: "Digital Quest",
    subtitle: "Online Treasure Hunt",
    tagline: "Scan • Solve • Move Forward",
    submissionType: "project_link",
    submissionPrompt: "Paste your completion code, clue answers, or Drive/screenshot link.",
    description: "Teams solve clues, answer questions and complete tasks using QR codes, Google Forms and online resources. The clues are based on different subjects like science, history, general knowledge and current affairs.",
    learningOutcomes: ["Research & information skills", "Digital literacy", "General knowledge", "Team coordination"],
    instructions: `[TYPE:project_link]\n**Tagline:** Scan • Solve • Move Forward\n\n**Challenge:**\nTeams solve clues, answer questions and complete tasks using QR codes, Google Forms and online resources. The clues are based on different subjects like science, history, general knowledge and current affairs.\n\n**What students learn:**\n• Research & information skills\n• Digital literacy\n• General knowledge\n• Team coordination\n\n**Submission:** Submit your completion code, clue answers, or proof screenshot link.`,
  },
  {
    order: 3,
    title: "Eco-Innovation Challenge",
    subtitle: "Environment & Sustainability",
    tagline: "Reduce • Reuse • Reimagine",
    submissionType: "media_upload",
    submissionPrompt: "Describe your eco-innovation, waste materials used, and share a photo or link to your prototype.",
    description: "Students create useful products from waste materials or design solutions for environmental problems (e.g., water saving, clean energy, plastic reduction). They present their idea and its impact.",
    learningOutcomes: ["Environmental awareness", "Innovation & creativity", "Hands-on skills", "Presentation skills"],
    instructions: `[TYPE:media_upload]\n**Tagline:** Reduce • Reuse • Reimagine\n\n**Challenge:**\nStudents create useful products from waste materials or design solutions for environmental problems (e.g., water saving, clean energy, plastic reduction). They present their idea and its impact.\n\n**What students learn:**\n• Environmental awareness\n• Innovation & creativity\n• Hands-on skills\n• Presentation skills\n\n**Submission:** Describe your eco-innovation, materials used, and share a photo or link to your prototype.`,
  },
  {
    order: 4,
    title: "Cyber Safety & Digital Literacy Quiz",
    subtitle: "Daily Live Quiz Championship",
    tagline: "Think • Click • Stay Safe",
    submissionType: "quiz",
    submissionPrompt: "Participate in today's Quiz Championship on DLMS, test your skills, and record your score!",
    description: "A fun quiz with real-life scenarios about online safety, digital footprints, cyber bullying, fake news and responsible internet use. Includes short videos, MCQs and group challenges.",
    learningOutcomes: ["Online safety rules", "Critical thinking", "Media literacy", "Responsible digital behaviour"],
    instructions: `[TYPE:quiz]\n**Tagline:** Think • Click • Stay Safe\n\n**Challenge:**\nA fun quiz with real-life scenarios about online safety, digital footprints, cyber bullying, fake news and responsible internet use. Includes short videos, MCQs and group challenges.\n\n**What students learn:**\n• Online safety rules\n• Critical thinking\n• Media literacy\n• Responsible digital behaviour\n\n**Submission:** Complete the live quiz or submit your quiz score and reflections on digital footprint.`,
  },
  {
    order: 5,
    title: "Functional English & Communication Show",
    subtitle: "Real-Life Expression",
    tagline: "Speak • Express • Inspire",
    submissionType: "media_upload",
    submissionPrompt: "Write your speech script or summary, and attach a recording link (Drive, YouTube, or audio).",
    description: "Students take part in fun activities like role plays, debates, storytelling, news reading, or 'shark tank' style presentations (product pitch). Focus on real-life communication and confidence.",
    learningOutcomes: ["Communication skills", "Creativity & imagination", "Confidence", "Public speaking"],
    instructions: `[TYPE:media_upload]\n**Tagline:** Speak • Express • Inspire\n\n**Challenge:**\nStudents take part in fun activities like role plays, debates, storytelling, news reading, or "shark tank" style presentations (product pitch). Focus on real-life communication and confidence.\n\n**What students learn:**\n• Communication skills\n• Creativity & imagination\n• Confidence\n• Public speaking\n\n**Submission:** Provide your speech/script write-up, role-play topic, or link to your recorded presentation.`,
  },
  {
    order: 6,
    title: "History Detective",
    subtitle: "History & Social Science Game",
    tagline: "Discover • Decide • Defend",
    submissionType: "project_link",
    submissionPrompt: "Submit your case file, clues solved, timeline matches, and reference link.",
    description: "Teams solve clues, match timelines, identify historical figures, and complete challenges about India and the world. Includes map puzzles, 'guess the leader', and 'what happened next?' rounds.",
    learningOutcomes: ["History & geography", "Critical thinking", "Decision making", "Teamwork"],
    instructions: `[TYPE:project_link]\n**Tagline:** Discover • Decide • Defend\n\n**Challenge:**\nTeams solve clues, match timelines, identify historical figures, and complete challenges about India and the world. Includes map puzzles, "guess the leader", and "what happened next?" rounds.\n\n**What students learn:**\n• History & geography\n• Critical thinking\n• Decision making\n• Teamwork\n\n**Submission:** Write down your investigative conclusions, identified historical figures, and timeline matches.`,
  },
  {
    order: 7,
    title: "Math Marathon",
    subtitle: "Real Life Maths",
    tagline: "Think • Calculate • Win",
    submissionType: "text_response",
    submissionPrompt: "Provide your step-by-step calculations, puzzle solutions, and trip budget breakdown.",
    description: "Fun rounds with logic puzzles, mental maths, budgeting games, pattern challenges and real-life problem solving (e.g., planning a trip within a budget).",
    learningOutcomes: ["Logical reasoning", "Quick calculation", "Financial awareness", "Confidence with numbers"],
    instructions: `[TYPE:text_response]\n**Tagline:** Think • Calculate • Win\n\n**Challenge:**\nFun rounds with logic puzzles, mental maths, budgeting games, pattern challenges and real-life problem solving (e.g., planning a trip within a budget).\n\n**What students learn:**\n• Logical reasoning\n• Quick calculation\n• Financial awareness\n• Confidence with numbers\n\n**Submission:** Provide your calculations, budget breakdown, and puzzle solutions.`,
  },
  {
    order: 8,
    title: "Creative Arts & Innovation Expo",
    subtitle: "Visual & Digital Creation",
    tagline: "Imagine • Create • Make a Difference",
    submissionType: "media_upload",
    submissionPrompt: "Explain your artwork concept and provide an image/artwork upload link or digital file link.",
    description: "Students create digital art, short films, posters, or DIY projects using simple materials. The theme could be 'Future of Education', 'My Dream India' or 'A Better Planet'.",
    learningOutcomes: ["Creativity & design thinking", "Digital skills", "Self-expression", "Awareness of real-world issues"],
    instructions: `[TYPE:media_upload]\n**Tagline:** Imagine • Create • Make a Difference\n\n**Challenge:**\nStudents create digital art, short films, posters, or DIY projects using simple materials. The theme could be "Future of Education", "My Dream India" or "A Better Planet".\n\n**What students learn:**\n• Creativity & design thinking\n• Digital skills\n• Self-expression\n• Awareness of real-world issues\n\n**Submission:** Explain your artwork concept and provide an image upload link or digital file link.`,
  },
  {
    order: 9,
    title: "Mystery Code Breakers",
    subtitle: "Logic & Secret Codes",
    tagline: "Crack • Decode • Unlock",
    submissionType: "text_response",
    submissionPrompt: "Submit the decoded secret message along with the logic/ciphers used to solve it.",
    description: "Students crack riddles, decode secret messages, solve pattern puzzles, and follow clues to unlock a final mystery as a team.",
    learningOutcomes: ["Logical thinking", "Pattern recognition", "Problem-solving", "Teamwork"],
    instructions: `[TYPE:text_response]\n**Tagline:** Crack • Decode • Unlock\n\n**Challenge:**\nStudents crack riddles, decode secret messages, solve pattern puzzles, and follow clues to unlock a final mystery as a team.\n\n**What students learn:**\n• Logical thinking\n• Pattern recognition\n• Problem-solving\n• Teamwork\n\n**Submission:** Submit the decoded secret message along with the logic/ciphers used to solve it.`,
  },
  {
    order: 10,
    title: "Future Makers Pitch",
    subtitle: "Invent & Inspire",
    tagline: "Small Ideas • Big Impact",
    submissionType: "project_link",
    submissionPrompt: "Share your 60-second pitch script, prototype photo/video link, and problem-solution summary.",
    description: "Students invent a simple solution to a real-life problem, build a mini model or draw a prototype, then pitch their idea in 60 seconds to a friendly judging panel.",
    learningOutcomes: ["Innovation", "Design thinking", "Confidence", "Persuasive speaking"],
    instructions: `[TYPE:project_link]\n**Tagline:** Small Ideas • Big Impact\n\n**Challenge:**\nStudents invent a simple solution to a real-life problem, build a mini model or draw a prototype, then pitch their idea in 60 seconds to a friendly judging panel.\n\n**What students learn:**\n• Innovation\n• Design thinking\n• Confidence\n• Persuasive speaking\n\n**Submission:** Share your 60-second pitch script, prototype photo/video link, and problem-solution summary.`,
  },
  {
    order: 11,
    title: "Reading Sprint & Book Review Challenge",
    subtitle: "Library & Literary Journey",
    tagline: "Read • Reflect • Review",
    submissionType: "text_response",
    submissionPrompt: "Write a short creative review of a book or chapter you read, highlighting key characters and what inspired you.",
    description: "Students read any book from the library catalog or e-shelf, reflect on its themes, and write an engaging 150-word review or alternate ending.",
    learningOutcomes: ["Reading comprehension", "Critical evaluation", "Creative writing", "Vocabulary building"],
    instructions: `[TYPE:text_response]\n**Tagline:** Read • Reflect • Review\n\n**Challenge:**\nRead any book or article from the digital library, summarize its core message, and write an honest review or propose an alternative ending.\n\n**What students learn:**\n• Reading comprehension\n• Critical evaluation\n• Creative writing\n• Vocabulary building\n\n**Submission:** Submit your book title, author, and your 150-word review with your favorite quote.`,
  },
  {
    order: 12,
    title: "Typing Speed & Keyboard Championship",
    subtitle: "Digital Agility & Fluency",
    tagline: "Speed • Precision • Flow",
    submissionType: "project_link",
    submissionPrompt: "Complete a 3-minute typing challenge, record your Words Per Minute (WPM) & accuracy, and share proof screenshot link.",
    description: "Test and improve your typing accuracy and speed in an interactive typing sprint. Compete for the school's top keyboard maestro badge!",
    learningOutcomes: ["Touch typing proficiency", "Digital fluency", "Focus & endurance", "Accuracy under time"],
    instructions: `[TYPE:project_link]\n**Tagline:** Speed • Precision • Flow\n\n**Challenge:**\nComplete a 3-minute typing test online (e.g. typing.com or monkeytype) or in the library portal. Target at least 30+ WPM with 95%+ accuracy.\n\n**What students learn:**\n• Touch typing proficiency\n• Digital fluency\n• Focus & endurance\n\n**Submission:** Submit your final WPM, accuracy percentage, and a screenshot or verification link.`,
  },
  {
    order: 13,
    title: "Science Wonder Lab & Kitchen Experiments",
    subtitle: "Home Science Discovery",
    tagline: "Observe • Hypothesize • Discover",
    submissionType: "media_upload",
    submissionPrompt: "Describe your home science experiment, explain the reaction or phenomenon, and attach a photo or video link.",
    description: "Perform a safe, exciting home experiment using simple household items (like baking soda volcano, rainbow in a glass, capillary action flowers, or surface tension coin).",
    learningOutcomes: ["Scientific method", "Hypothesis testing", "Safety awareness", "Curiosity & observation"],
    instructions: `[TYPE:media_upload]\n**Tagline:** Observe • Hypothesize • Discover\n\n**Challenge:**\nConduct a safe hands-on science experiment using everyday items at home. Record what you observed and the scientific law explaining it.\n\n**What students learn:**\n• Scientific method\n• Hypothesis testing\n• Curiosity & observation\n\n**Submission:** Write your hypothesis and conclusions, and attach a photo or short video link demonstrating your experiment.`,
  },
  {
    order: 14,
    title: "Daily Live Quiz Championship: GK & Trivia",
    subtitle: "Live Multi-Player Battle",
    tagline: "Quick Buzzer • Big Brain • High Rank",
    submissionType: "quiz",
    submissionPrompt: "Join the Daily Live Quiz Championship lobby at the scheduled hour or complete today's feature quiz!",
    description: "Battle live against peers in general knowledge, science breakthroughs, world geography, and literature. Fastest fingers earn multiplier streak bonuses!",
    learningOutcomes: ["General knowledge", "Speed thinking", "Sportsmanship", "Trivia mastery"],
    instructions: `[TYPE:quiz]\n**Tagline:** Quick Buzzer • Big Brain • High Rank\n\n**Challenge:**\nJoin the live multiplayer quiz championship lobby. Score in the top tier to win bonus vacation streak multipliers!\n\n**What students learn:**\n• General knowledge\n• Speed thinking\n• Sportsmanship\n\n**Submission:** Join the live lobby through DLMS Quizzes or submit your quiz completion confirmation.`,
  },
  {
    order: 15,
    title: "Grand Finale Showcase: Project Exhibition",
    subtitle: "Vacation Capstone Presentation",
    tagline: "Synthesize • Showcase • Celebrate",
    submissionType: "project_link",
    submissionPrompt: "Submit your final portfolio link, capstone presentation slides, or summary video celebrating what you learned over the vacation.",
    description: "Bring together the best things you created or learned during the entire vacation campaign into a single capstone portfolio showcase.",
    learningOutcomes: ["Portfolio curation", "Self-reflection", "Presentation design", "Pride in accomplishment"],
    instructions: `[TYPE:project_link]\n**Tagline:** Synthesize • Showcase • Celebrate\n\n**Challenge:**\nAssemble your vacation highlights—favorite projects, top quiz scores, books finished—into a single presentation or portfolio link.\n\n**What students learn:**\n• Portfolio curation\n• Self-reflection\n• Presentation design\n\n**Submission:** Provide a link to your Google Slides, Canva, video, or drive folder presenting your vacation learning journey.`,
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
