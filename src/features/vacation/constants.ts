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
};

export interface PosterActivityTemplate {
  order: number;
  title: string;
  subtitle?: string;
  tagline?: string;
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
    description: "Teams get a real-world problem (e.g. build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.",
    learningOutcomes: ["Creative thinking", "Problem solving", "Science & technology concepts", "Teamwork & communication"],
    instructions: `**Tagline:** Build • Solve • Innovate\n\n**Challenge:**\nTeams get a real-world problem (e.g., build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.\n\n**What students learn:**\n• Creative thinking\n• Problem solving\n• Science & technology concepts\n• Teamwork & communication\n\n**Submission:** Write a summary of your model/solution and attach photos or a video drive link.`,
  },
  {
    order: 2,
    title: "Digital Quest",
    subtitle: "Online Treasure Hunt",
    tagline: "Scan • Solve • Move Forward",
    description: "Teams solve clues, answer questions and complete tasks using QR codes, Google Forms and online resources. The clues are based on different subjects like science, history, general knowledge and current affairs.",
    learningOutcomes: ["Research & information skills", "Digital literacy", "General knowledge", "Team coordination"],
    instructions: `**Tagline:** Scan • Solve • Move Forward\n\n**Challenge:**\nTeams solve clues, answer questions and complete tasks using QR codes, Google Forms and online resources. The clues are based on different subjects like science, history, general knowledge and current affairs.\n\n**What students learn:**\n• Research & information skills\n• Digital literacy\n• General knowledge\n• Team coordination\n\n**Submission:** Submit your completion code, clue answers, or proof screenshot link.`,
  },
  {
    order: 3,
    title: "Eco-Innovation Challenge",
    subtitle: "Environment & Sustainability",
    tagline: "Reduce • Reuse • Reimagine",
    description: "Students create useful products from waste materials or design solutions for environmental problems (e.g., water saving, clean energy, plastic reduction). They present their idea and its impact.",
    learningOutcomes: ["Environmental awareness", "Innovation & creativity", "Hands-on skills", "Presentation skills"],
    instructions: `**Tagline:** Reduce • Reuse • Reimagine\n\n**Challenge:**\nStudents create useful products from waste materials or design solutions for environmental problems (e.g., water saving, clean energy, plastic reduction). They present their idea and its impact.\n\n**What students learn:**\n• Environmental awareness\n• Innovation & creativity\n• Hands-on skills\n• Presentation skills\n\n**Submission:** Describe your eco-innovation, materials used, and share a photo or link to your prototype.`,
  },
  {
    order: 4,
    title: "Cyber Safety & Digital Literacy Quiz",
    subtitle: "Safe Online Habits",
    tagline: "Think • Click • Stay Safe",
    description: "A fun quiz with real-life scenarios about online safety, digital footprints, cyber bullying, fake news and responsible internet use. Includes short videos, MCQs and group challenges.",
    learningOutcomes: ["Online safety rules", "Critical thinking", "Media literacy", "Responsible digital behaviour"],
    instructions: `**Tagline:** Think • Click • Stay Safe\n\n**Challenge:**\nA fun quiz with real-life scenarios about online safety, digital footprints, cyber bullying, fake news and responsible internet use. Includes short videos, MCQs and group challenges.\n\n**What students learn:**\n• Online safety rules\n• Critical thinking\n• Media literacy\n• Responsible digital behaviour\n\n**Submission:** Submit your quiz score, reflections on digital footprint, and your key takeaways.`,
  },
  {
    order: 5,
    title: "Functional English & Communication Show",
    subtitle: "Real-Life Expression",
    tagline: "Speak • Express • Inspire",
    description: "Students take part in fun activities like role plays, debates, storytelling, news reading, or 'shark tank' style presentations (product pitch). Focus on real-life communication and confidence.",
    learningOutcomes: ["Communication skills", "Creativity & imagination", "Confidence", "Public speaking"],
    instructions: `**Tagline:** Speak • Express • Inspire\n\n**Challenge:**\nStudents take part in fun activities like role plays, debates, storytelling, news reading, or "shark tank" style presentations (product pitch). Focus on real-life communication and confidence.\n\n**What students learn:**\n• Communication skills\n• Creativity & imagination\n• Confidence\n• Public speaking\n\n**Submission:** Provide your speech/script write-up, role-play topic, or link to your recorded presentation.`,
  },
  {
    order: 6,
    title: "History Detective",
    subtitle: "History & Social Science Game",
    tagline: "Discover • Decide • Defend",
    description: "Teams solve clues, match timelines, identify historical figures, and complete challenges about India and the world. Includes map puzzles, 'guess the leader', and 'what happened next?' rounds.",
    learningOutcomes: ["History & geography", "Critical thinking", "Decision making", "Teamwork"],
    instructions: `**Tagline:** Discover • Decide • Defend\n\n**Challenge:**\nTeams solve clues, match timelines, identify historical figures, and complete challenges about India and the world. Includes map puzzles, "guess the leader", and "what happened next?" rounds.\n\n**What students learn:**\n• History & geography\n• Critical thinking\n• Decision making\n• Teamwork\n\n**Submission:** Write down your investigative conclusions, identified historical figures, and timeline matches.`,
  },
  {
    order: 7,
    title: "Math Marathon",
    subtitle: "Real Life Maths",
    tagline: "Think • Calculate • Win",
    description: "Fun rounds with logic puzzles, mental maths, budgeting games, pattern challenges and real-life problem solving (e.g., planning a trip within a budget).",
    learningOutcomes: ["Logical reasoning", "Quick calculation", "Financial awareness", "Confidence with numbers"],
    instructions: `**Tagline:** Think • Calculate • Win\n\n**Challenge:**\nFun rounds with logic puzzles, mental maths, budgeting games, pattern challenges and real-life problem solving (e.g., planning a trip within a budget).\n\n**What students learn:**\n• Logical reasoning\n• Quick calculation\n• Financial awareness\n• Confidence with numbers\n\n**Submission:** Provide your calculations, budget breakdown, and puzzle solutions.`,
  },
  {
    order: 8,
    title: "Creative Arts & Innovation Expo",
    subtitle: "Visual & Digital Creation",
    tagline: "Imagine • Create • Make a Difference",
    description: "Students create digital art, short films, posters, or DIY projects using simple materials. The theme could be 'Future of Education', 'My Dream India' or 'A Better Planet'.",
    learningOutcomes: ["Creativity & design thinking", "Digital skills", "Self-expression", "Awareness of real-world issues"],
    instructions: `**Tagline:** Imagine • Create • Make a Difference\n\n**Challenge:**\nStudents create digital art, short films, posters, or DIY projects using simple materials. The theme could be "Future of Education", "My Dream India" or "A Better Planet".\n\n**What students learn:**\n• Creativity & design thinking\n• Digital skills\n• Self-expression\n• Awareness of real-world issues\n\n**Submission:** Explain your artwork concept and provide an image upload link or digital file link.`,
  },
  {
    order: 9,
    title: "Mystery Code Breakers",
    subtitle: "Logic & Secret Codes",
    tagline: "Crack • Decode • Unlock",
    description: "Students crack riddles, decode secret messages, solve pattern puzzles, and follow clues to unlock a final mystery as a team.",
    learningOutcomes: ["Logical thinking", "Pattern recognition", "Problem-solving", "Teamwork"],
    instructions: `**Tagline:** Crack • Decode • Unlock\n\n**Challenge:**\nStudents crack riddles, decode secret messages, solve pattern puzzles, and follow clues to unlock a final mystery as a team.\n\n**What students learn:**\n• Logical thinking\n• Pattern recognition\n• Problem-solving\n• Teamwork\n\n**Submission:** Submit the decoded secret message along with the logic/ciphers used to solve it.`,
  },
  {
    order: 10,
    title: "Future Makers Pitch",
    subtitle: "Invent & Inspire",
    tagline: "Small Ideas • Big Impact",
    description: "Students invent a simple solution to a real-life problem, build a mini model or draw a prototype, then pitch their idea in 60 seconds to a friendly judging panel.",
    learningOutcomes: ["Innovation", "Design thinking", "Confidence", "Persuasive speaking"],
    instructions: `**Tagline:** Small Ideas • Big Impact\n\n**Challenge:**\nStudents invent a simple solution to a real-life problem, build a mini model or draw a prototype, then pitch their idea in 60 seconds to a friendly judging panel.\n\n**What students learn:**\n• Innovation\n• Design thinking\n• Confidence\n• Persuasive speaking\n\n**Submission:** Share your 60-second pitch script, prototype photo/video link, and problem-solution summary.`,
  },
];
