export interface VacationProblemStatement {
  id: string;
  day: number;
  problemNumber: number;
  title: string;
  subtitle?: string;
  description: string;
  requirements?: string[];
  deliverable: string;
  hintsOrNotes?: string;
}

export interface DayProblemSet {
  day: number;
  eventTitle: string;
  dateStr: string;
  overview: string;
  problems: VacationProblemStatement[];
}

export const AUTUMN_BREAK_PROBLEM_STATEMENTS: Record<number, DayProblemSet> = {
  1: {
    day: 1,
    eventTitle: "STEAM Challenge",
    dateStr: "2026-10-15",
    overview: "Teams of up to four build a bridge from limited materials, test it safely and explain the science. Every bridge must span the stated gap and be tested with a safe, light load.",
    problems: [
      {
        id: "d1-p1",
        day: 1,
        problemNumber: 1,
        title: "Problem 1: The Twenty-Stick Span",
        description: "A small stream has washed away the footpath behind the school garden, and the gardeners need a crossing. Your team has a budget of 20 ice-cream sticks, one sheet of paper, tape and string. Design and build a bridge that spans a 20 cm gap and holds as much weight as possible at its centre. Explain which shape (triangle, arch or beam) you chose and why it spreads load better.",
        deliverable: "Submit a photo or a 90-second video of the load test, a labelled sketch and a short note on what you would change in a second version.",
      },
      {
        id: "d1-p2",
        day: 1,
        problemNumber: 2,
        title: "Problem 2: The Flood-Gap Rescue Crossing",
        description: "Heavy rain has flooded the road between a village and its nearest clinic, leaving a 25 cm gap that a rescue toy truck must cross. Build a bridge from cardboard, paper and tape that carries the truck (or a 200 g load) across without bending more than 1 cm. Your team must show how the deck, supports and edges work together, and explain how you reduced sagging.",
        deliverable: "Record the crossing in one continuous clip and describe one real-life situation where a quick temporary bridge saves lives.",
      },
      {
        id: "d1-p3",
        day: 1,
        problemNumber: 3,
        title: "Problem 3: The Paper-Only Challenge",
        description: "A bridge engineer has no wood or metal on site, only paper, tape and string. Build a bridge using only these materials that spans 20 cm and carries a 500 g load for at least ten seconds. Experiment with folding, rolling and layering paper to make it stronger, and record at least two failed trials with what you learned from each. Your explanation should cover why rolled paper tubes are stronger than flat sheets and how shape, not material, can decide strength.",
        deliverable: "Submit photos/video demonstrating the 500g load test for 10 seconds, plus notes on 2 failed attempts and physics explanation.",
      },
      {
        id: "d1-p4",
        day: 1,
        problemNumber: 4,
        title: "Problem 4: The Accessible Footbridge",
        description: "A school pathway has a 20 cm drain that wheelchair users and students with heavy bags cannot cross easily. Design a footbridge with a gentle ramp on both sides that is stable, wide enough for a toy wheelchair or small cart, and safe at the edges. Use sticks, cardboard and tape within the budget. Show your measurements for width and slope, test it with a small wheeled object, and explain how inclusive design changes engineering choices.",
        deliverable: "Submit measurements sketch, video of wheeled object crossing both ramps, and an explanation of inclusive accessibility choices.",
      },
      {
        id: "d1-p5",
        day: 1,
        problemNumber: 5,
        title: "Problem 5: The Strength-to-Weight Bridge",
        description: "The best bridges are not the heaviest but the smartest. Build the lightest possible bridge that spans 20 cm and still supports a fixed 300 g load. Weigh your bridge on a kitchen or letter scale and calculate its strength-to-weight ratio (load held divided by bridge weight). Submit your calculation, a photo of the test and a short explanation of where you removed material without weakening the structure. Teams are ranked on ratio, not on how much the bridge carries.",
        deliverable: "Submit bridge weight, strength-to-weight ratio calculation, load test photograph, and optimization notes.",
      },
    ],
  },
  2: {
    day: 2,
    eventTitle: "Digital Quest",
    dateStr: "2026-10-16",
    overview: "Individuals or teams solve a chain of clues across subjects. Story-based quest of 10 to 15 clues; every correct answer unlocks the next stage and the final clue reveals a secret phrase.",
    problems: [
      {
        id: "d2-p1",
        day: 2,
        problemNumber: 1,
        title: "Problem 1: The Lost Knowledge Vault",
        description: "An old school library has sealed a vault containing the Book of All Subjects, and only someone who has mastered science, maths, history, English and geography can open it. Move through five stages: solve a science question to get the first code, decode a number pattern for the second, identify a historical landmark from a photo for the third, solve a word puzzle for the fourth and combine all four answers to reveal the secret word.",
        deliverable: "Submit your reasoning and proof at each stage along with the final vault secret phrase.",
      },
      {
        id: "d2-p2",
        day: 2,
        problemNumber: 2,
        title: "Problem 2: The Scientist's Missing Diary",
        description: "A famous scientist's diary has been torn into twelve pages and scattered across the internet. Each page is hidden behind a question about a different branch of science, such as the laws of motion, the water cycle, human body systems or chemical changes. Solve the question to recover a page, use the page number as part of a final code, and piece the diary together to find where the scientist hid the last discovery.",
        deliverable: "Submit the final secret coordinates/code and record the sources used for every scientific answer.",
      },
      {
        id: "d2-p3",
        day: 2,
        problemNumber: 3,
        title: "Problem 3: The Case of the Missing Trophy",
        description: "The school's Annual Day trophy has vanished and five suspects each have an alibi that can be checked. Use maths to work out timings, English passages to find contradictions in statements and a simple map of India to match each suspect's travel story. Eliminate suspects one by one, and name the culprit with at least two supporting clues. Wrong guesses cost points, so check your logic before you submit.",
        deliverable: "Name the culprit, provide step-by-step elimination proofs, and cite at least two concrete supporting clues.",
      },
      {
        id: "d2-p4",
        day: 2,
        problemNumber: 4,
        title: "Problem 4: The Time Capsule Message",
        description: "Students from 1990 buried a time capsule with a coded message for today's class. The message is split into ten QR-style clues, each with a text version for those who cannot scan, covering pattern puzzles, historical dates, geography facts and word riddles. Decode the clues in order, each answer giving a letter or digit of the final message, and write a two-line reply to those students about how school has changed.",
        deliverable: "Submit the decoded 10-part time capsule message plus your two-line message back to the 1990 students.",
      },
      {
        id: "d2-p5",
        day: 2,
        problemNumber: 5,
        title: "Problem 5: Journey Across India",
        description: "Travel across a virtual map of India, collecting one riddle from each of ten states. Each riddle blends a fact about the state's geography, history, language, food or festival with a small puzzle, and the answer gives the name of the next state to visit. Complete the full route to reach the final destination and unlock the secret phrase. Plan your route, note each state's key fact and finish within the time limit.",
        deliverable: "Submit the 10-state route map, the key cultural/geographical fact for each state, and the destination secret phrase.",
      },
    ],
  },
  3: {
    day: 3,
    eventTitle: "Eco-Innovation Challenge",
    dateStr: "2026-10-17",
    overview: "Teams pick a real local environmental problem and answer it with reused or recyclable materials. Every statement asks for a prototype or labelled design, an honest estimate of impact and a short report.",
    problems: [
      {
        id: "d3-p1",
        day: 3,
        problemNumber: 1,
        title: "Problem 1: Plastic-Free Canteen",
        description: "The school canteen produces a pile of plastic wrappers, cups and spoons every day. Observe the canteen for two days, count the waste by type and choose the biggest source. Design a reusable or reused-material solution, such as a bottle-cap token system, a paper-based serving item or a collection corner. Present the numbers you collected, your design and a realistic estimate of how much waste it could cut in a month.",
        deliverable: "Submit waste count data, design prototype photos/diagram, and 1-month waste reduction projection report.",
      },
      {
        id: "d3-p2",
        day: 3,
        problemNumber: 2,
        title: "Problem 2: Rain Catcher for the School Roof",
        description: "Most rainwater from the school roof flows into the drain and is wasted, while the garden is watered with tap water in the dry weeks. Build a small-scale model of a rainwater collection system using bottles, pipes or cardboard channels. Show how water travels from roof to storage, how debris is filtered out and how the stored water would be used. Calculate roughly how much water a 10 square metre roof gathers from 10 mm of rain.",
        deliverable: "Submit model photos/video showing filter mechanism and the mathematical calculation for a 10 sq.m roof under 10 mm rain.",
      },
      {
        id: "d3-p3",
        day: 3,
        problemNumber: 3,
        title: "Problem 3: Second Life for Paper",
        description: "Schools use thousands of notebook pages each term, and much of it ends up as waste. Design a way to reuse or recycle paper from your class, such as handmade recycled paper, seed paper, pencil holders from rolled pages or a rough-paper notepad system. Make a working sample, document each step with photos and explain the environmental benefit. Be honest about what the process cannot do, for example the energy or water it uses.",
        deliverable: "Submit step-by-step photos of your handmade sample, the finished product, and an honest lifecycle analysis.",
      },
      {
        id: "d3-p4",
        day: 3,
        problemNumber: 4,
        title: "Problem 4: Every Drop Counts",
        description: "Taps left running in washrooms and hoses left on in the garden waste water every day. Create a low-cost water-saving idea such as a tap reminder sign, a drip irrigation bottle for plants, a greywater reuse concept for the garden or a simple flow-reduction device. Test it for a day, measure the water saved (even roughly, using a bucket) and describe how you would get students to adopt it.",
        deliverable: "Submit device photo or setup, measured water savings data, and school adoption plan.",
      },
      {
        id: "d3-p5",
        day: 3,
        problemNumber: 5,
        title: "Problem 5: The Waste-Material Green Corner",
        description: "A bare, dusty corner of the campus can become a calm green space. Using only waste materials, such as tyres, crates, bottles, cans and old wood, design and build a model of a green corner that includes planters, seating and a small information board. Draw a labelled plan, list every reused item and its source, and explain how the space would improve air quality, shade or student wellbeing.",
        deliverable: "Submit labelled plan sketch, physical prototype model photo, and itemized recycled materials inventory.",
      },
    ],
  },
  4: {
    day: 4,
    eventTitle: "Cyber Safety & Digital Literacy Quiz",
    dateStr: "2026-10-18",
    overview: "Scenario-based evaluation where students think through realistic cyber dilemmas and submit a clear decision with reasoning.",
    problems: [
      {
        id: "d4-p1",
        day: 4,
        problemNumber: 1,
        title: "Scenario 1: The Stranger in the Game",
        description: "You are playing an online game with classmates when a friendly player you have never met offers free in-game coins. He asks for your full name, school and home address so he can send you a gift card, and says not to tell your parents because it is a surprise. Decide what to do in the next ten seconds and who to tell afterwards. Explain why a kind offer can still be a warning sign, and which settings (chat limits, friend requests, blocking, reporting) could have protected you.",
        deliverable: "Submit your immediate response plan, reporting steps, and an analysis of preventive game privacy settings.",
      },
      {
        id: "d4-p2",
        day: 4,
        problemNumber: 2,
        title: "Scenario 2: The Prize Message",
        description: "A message on your phone says you have won a smartphone in a school contest and must click a link and enter your password within 30 minutes to claim it. The sender looks like a real school account but one letter of the name is wrong. List at least three signs that the message is a phishing attempt, explain what could happen if you clicked, and say what you should do with the message afterwards.",
        deliverable: "Submit 3 phishing indicators spotted, technical risk explanation (credential harvesting/malware), and safe reporting action.",
      },
      {
        id: "d4-p3",
        day: 4,
        problemNumber: 3,
        title: "Scenario 3: The Mocking Group Chat",
        description: "A classmate has made an embarrassing photo of another student into a joke and shared it in the class group chat. People are laughing, and some are adding more jokes. You are neither the one who made it nor the target. Choose from several responses, such as joining in, staying silent, replying to defend the student or reporting it, and justify which is safest and kindest. Explain how screenshots, blocking and talking to a trusted adult help, and why the harm can last long after the chat is deleted.",
        deliverable: "Submit your ethical stance write-up, escalation protocol, and explanation of digital footprint permanence.",
      },
      {
        id: "d4-p4",
        day: 4,
        problemNumber: 4,
        title: "Scenario 4: The Viral Closure Notice",
        description: "A post spreading fast on social media claims the school will be closed all of next week because of a new emergency. It has an official-looking logo but no date, no signature and no link to a school notice. Explain the steps you would take to check whether it is true before sharing, such as checking the source, looking for the same news elsewhere, reading the original school channel and examining the image. Describe the harm a false message like this can cause.",
        deliverable: "Submit a 4-step fact-checking checklist and an impact statement on the consequences of viral misinformation.",
      },
      {
        id: "d4-p5",
        day: 4,
        problemNumber: 5,
        title: "Scenario 5: The AI Homework Answer",
        description: "You ask an AI tool for help with a social science project and it gives you a polished answer with a statistic and a quote you have never heard of. Decide how to use it responsibly: how to verify the facts, why you must not copy it as your own work, when to disclose that you used AI and how to keep your personal information out of the prompt. Finish by writing one safe-use rule you would follow from now on.",
        deliverable: "Submit your verification method, academic integrity policy, and your personal #1 AI safety rule.",
      },
    ],
  },
  5: {
    day: 5,
    eventTitle: "Functional English & Communication Show",
    dateStr: "2026-10-19",
    overview: "Entries are 1 to 3 minute videos, audio recordings or approved live sessions. Choose your track according to your class category.",
    problems: [
      {
        id: "d5-p1",
        day: 5,
        problemNumber: 1,
        title: "Track 1 (Junior I–V): A Day Without the Internet",
        description: "Imagine you wake up and the internet has stopped working everywhere for one whole day. Tell a story, with a beginning, a middle and an end, about what happens to you, your family and your friends. Include at least one problem that appears, one funny moment and one new thing you discover you enjoy doing. Speak clearly, use expressions and gestures, and end by saying what you learned.",
        deliverable: "Submit a 1–3 minute video or audio recording and your written speech outline.",
      },
      {
        id: "d5-p2",
        day: 5,
        problemNumber: 2,
        title: "Track 2 (Junior I–V): My Favourite Thing",
        description: "Choose one object that is special to you, such as a toy, a book, a pencil box or a photo. In one to two minutes, show it to the audience and tell them what it is, where it came from, why it matters to you and one interesting thing about it. Look at the camera, speak in full sentences and finish with a question for your audience, such as 'Do you have something special like this too?'",
        deliverable: "Submit a 1–2 minute show-and-tell video presenting your object with clear pronunciation.",
      },
      {
        id: "d5-p3",
        day: 5,
        problemNumber: 3,
        title: "Track 3 (Middle VI–VIII): The Reading Hour Role-Play",
        description: "Two or three students role-play a meeting in which a student representative must persuade the principal to add a daily reading hour to the timetable. The principal raises at least three objections (less time for studies, no space, not everyone enjoys reading) and the student answers each politely with facts and examples. Show respectful language, active listening and a calm, confident close. Each member must speak.",
        deliverable: "Submit a 2–3 minute video role-play recording and the dialogue script addressing all 3 objections.",
      },
      {
        id: "d5-p4",
        day: 5,
        problemNumber: 4,
        title: "Track 4 (Senior IX–XII): The Study-Calm Pitch",
        description: "Board exam pressure leaves many students stressed and tired. Present a two-minute pitch for a product, app or service that helps students manage study stress. Describe the problem, who it helps, how it works, what makes it different from existing options and why a student would use it. Use a persuasive structure, support your claim with at least one fact or example and close with a clear call to action.",
        deliverable: "Submit a 2-minute video pitch and a 1-page executive pitch summary with problem, USP, and call to action.",
      },
      {
        id: "d5-p5",
        day: 5,
        problemNumber: 5,
        title: "Track 5 (Senior IX–XII): Mock Interview — Why Me?",
        description: "You are interviewing for the role of School Captain, and the panel asks, 'Why should we choose you?' Record a three-minute interview in which you answer three questions: your strengths and a weakness, a time you led others through a difficulty and one change you would bring to school. Be honest, specific and respectful, and avoid memorised lines. Assessment is on clarity, confidence and substance.",
        deliverable: "Submit a 3-minute video recording answering the three leadership questions candidly.",
      },
    ],
  },
  6: {
    day: 6,
    eventTitle: "History Detective",
    dateStr: "2026-10-20",
    overview: "Historical mysteries built on verifiable facts. Participants analyze evidence cards and support their final deduction with at least two specific clues.",
    problems: [
      {
        id: "d6-p1",
        day: 6,
        problemNumber: 1,
        title: "Mystery 1: The Missing Monument Record",
        description: "The record book of a great monument has been lost, and the museum needs to know who built it and when. Evidence cards give you the architectural style of the dome and pillars, a line about the ruler's hidden birth name, a regional map marking where it stands and a note that it was finished a few decades after a famous battle. Identify the monument, the dynasty and ruler and the approximate construction period.",
        deliverable: "Submit identified monument, dynasty, builder, period, and cite the architectural and timeline evidence clues.",
      },
      {
        id: "d6-p2",
        day: 6,
        problemNumber: 2,
        title: "Mystery 2: The Coin in the Field",
        description: "A farmer ploughing his field finds a worn copper coin. Its evidence card shows the image on each side, the script and language of the inscription, its weight and the metal used, and a note on where it was found. Use these details to place the coin in an era, name the likely ruler or kingdom and explain what the coin tells us about trade, religion and language at the time. State which parts of your answer are certain and which are informed guesses.",
        deliverable: "Submit kingdom/ruler deduction, analysis of script/metal, and trade/religious implications.",
      },
      {
        id: "d6-p3",
        day: 6,
        problemNumber: 3,
        title: "Mystery 3: Three Maps, Three Eras",
        description: "Three old maps of the subcontinent have been mixed up in the archive. Each shows different kingdoms, trade routes, capital cities and boundaries, and each is accompanied by a short traveller's account. Match each map to its period, give two pieces of evidence for every match and explain how borders and political power changed between the three. Use the timeline card to check that your order is consistent.",
        deliverable: "Submit chronological arrangement of the 3 maps with 2 pieces of evidence per map and border transition analysis.",
      },
      {
        id: "d6-p4",
        day: 6,
        problemNumber: 4,
        title: "Mystery 4: The Ruler With Three Names",
        description: "A ruler known by three different names appears in three different documents: an inscription on a pillar, a foreign traveller's diary and a royal land grant. None of the documents gives all three names. Compare the documents, find the details they share and work out which names belong to the same person. Identify the ruler, explain how you decided and discuss why historians must compare multiple sources rather than trust one.",
        deliverable: "Identify the ruler and aliases, cross-reference shared details across sources, and explain source critique methodology.",
      },
      {
        id: "d6-p5",
        day: 6,
        problemNumber: 5,
        title: "Mystery 5: Order of the Freedom Struggle",
        description: "Five scrambled cards describe key events of India's freedom struggle: a protest movement, a famous march, a major legal or political act, a revolt and a final negotiation. Arrange them in correct chronological order using dates and clues in the text, and write a one-line reason for each position. Then explain how the first event influenced the one that followed, linking cause to consequence.",
        deliverable: "Submit chronological order, dating justification for each event, and cause-and-effect relationship explanation.",
      },
    ],
  },
  7: {
    day: 7,
    eventTitle: "Math Marathon",
    dateStr: "2026-10-21",
    overview: "Real-world logic, calculation and mathematical modeling. No calculators allowed; show complete step-by-step methodology.",
    problems: [
      {
        id: "d7-p1",
        day: 7,
        problemNumber: 1,
        title: "Problem 1: The Double Discount (Quick Calculation)",
        description: "A shop advertises a school bag at 20% off, and then offers a further 10% off the reduced price at the till. Ravi says the total discount is 30%. Calculate the actual final price of a bag marked at ₹1,200, work out the true overall discount percentage and explain why Ravi's idea is wrong. Then find the final price if the order of the discounts is swapped, and say whether it makes any difference.",
        deliverable: "Submit step-by-step calculations for both discount orders, exact net discount percentage, and conceptual explanation.",
      },
      {
        id: "d7-p2",
        day: 7,
        problemNumber: 2,
        title: "Problem 2: The Pattern Vault (Logic Arena)",
        description: "A vault has a code made of the next three numbers in three sequences: 3, 6, 12, 24, ...; 2, 5, 10, 17, ...; and 1, 1, 2, 3, 5, 8, .... Find the rule for each sequence in words, write the next three terms and combine the last number of each to form the code. Then create a fourth sequence of your own with a rule that is hard to guess, and show that it works.",
        deliverable: "Submit rules for all 3 sequences, next 3 terms, combined vault code, and your original sequence with mathematical proof.",
      },
      {
        id: "d7-p3",
        day: 7,
        problemNumber: 3,
        title: "Problem 3: The Class Trip Budget (Real-Life Maths)",
        description: "Your class of 36 students has ₹15,000 to plan a one-day trip. You are given a price list for a bus (₹4,500 per day), entry tickets (₹120 per student, with a 10% group discount for 30 or more), lunch (₹90 per head) and an optional boat ride (₹60 per head). Work out the total cost, decide whether the boat ride fits in the budget, and calculate the cost per student. State what you would cut if the budget were reduced by ₹2,000.",
        deliverable: "Submit itemized budget breakdown, boat ride affordability verdict, cost-per-student, and ₹2,000 contingency cut strategy.",
      },
      {
        id: "d7-p4",
        day: 7,
        problemNumber: 4,
        title: "Problem 4: The Leaking Tank (Rates & Differential Flow)",
        description: "A school water tank holds 2,400 litres. A pipe fills it at 40 litres per minute, but a leak at the bottom drains 15 litres every minute. If the tank is empty, how long until it is full? If it starts half full, how long does it take? Then find how long the tank would stay full if the pipe is shut off and the leak continues. Show each step and state your assumptions.",
        deliverable: "Submit calculations for time-to-full from empty, time-to-full from half-full, and drain-out duration with stated assumptions.",
      },
      {
        id: "d7-p5",
        day: 7,
        problemNumber: 5,
        title: "Problem 5: The Final Challenge Riddles (Logical Deduction)",
        description: "Solve five riddles that need careful logical reasoning, with one correct line of thought for each: (1) A two-digit number is a multiple of 7, one less than a perfect square and has digits that add up to 8. (2) Three friends each tell a different truth or lie and only one is lying: who owns the red bag? (3) A clock gains four minutes every hour: when does it first show the right time again? Write your reasoning clearly.",
        deliverable: "Submit solutions for all three riddles accompanied by full deductive logic proofs.",
      },
    ],
  },
  8: {
    day: 8,
    eventTitle: "Creative Arts & Innovation Expo",
    dateStr: "2026-10-22",
    overview: "Digital Art, Poster Design, Short Film or DIY Innovation. All entries must be original and accompanied by a concise concept rationale.",
    problems: [
      {
        id: "d8-p1",
        day: 8,
        problemNumber: 1,
        title: "Problem 1: A Better Planet Poster",
        description: "Design a poster for the theme 'A Better Planet, A Better Future' that makes one clear environmental message impossible to ignore from across a corridor. Choose a single issue, such as plastic, water, trees, energy or clean air, and show a bold image, a short slogan of no more than eight words and one specific action students can take this week. Submit the poster with a 50-word description of your idea, your choice of colours and who you hope will read it.",
        deliverable: "Submit high-res digital poster image, 8-word slogan, and 50-word artistic intent statement.",
      },
      {
        id: "d8-p2",
        day: 8,
        problemNumber: 2,
        title: "Problem 2: My School in 2050",
        description: "Create a piece of digital art that shows what our school could look like in the year 2050. Include at least five details that show how technology, energy, learning spaces and the environment may have changed, and at least one thing that has stayed the same. Submit one image with a 50-word explanation of the future you imagine, including why it is a better place to learn and whether it is realistic.",
        deliverable: "Submit 2050 digital artwork, callout of the 5 futuristic changes, 1 unchanged element, and 50-word concept note.",
      },
      {
        id: "d8-p3",
        day: 8,
        problemNumber: 3,
        title: "Problem 3: One Small Act (Short Film)",
        description: "Make a 30 to 90 second short film about a small act of kindness or responsibility that changes someone's day or helps the planet. Plan it with a three-shot storyboard before you film, use only people who have agreed to appear and keep the story simple. Submit the film with a short explanation of the message and how you used light, sound or camera angles to support it.",
        deliverable: "Submit 30–90 second video link/file, 3-shot storyboard sketch, and technical notes on camera/lighting.",
      },
      {
        id: "d8-p4",
        day: 8,
        problemNumber: 4,
        title: "Problem 4: The Waste-to-Desk Organiser",
        description: "Build a useful DIY organiser for a student's desk from waste materials such as cardboard tubes, bottle caps, old boxes and packaging. It should hold at least four kinds of items, such as pens, a phone, sticky notes and a water bottle, and should be stable and safe to use. Submit two to four photographs and a short description of the materials, the steps and how it solves a real clutter problem.",
        deliverable: "Submit 2–4 photos showing the 4 compartments in active use and step-by-step crafting documentation.",
      },
      {
        id: "d8-p5",
        day: 8,
        problemNumber: 5,
        title: "Problem 5: Road Safety Outside Our Gate",
        description: "Cars, buses and bikes crowd the road outside the school gate at arrival and dismissal time. Design a poster that persuades students, parents and drivers to follow safe habits, such as crossing at the zebra crossing, wearing helmets, not stopping on the road and avoiding phone use while driving. Use a strong visual, a short message and one clear instruction, and explain who your poster speaks to and why you chose that tone.",
        deliverable: "Submit road safety poster image, target demographic definition, and behavioral nudge justification.",
      },
    ],
  },
  9: {
    day: 9,
    eventTitle: "Mystery Code Breakers",
    dateStr: "2026-10-23",
    overview: "Sequential ciphers and vault stages. Each stage uncovers a component needed to unlock the final treasure vault combination.",
    problems: [
      {
        id: "d9-p1",
        day: 9,
        problemNumber: 1,
        title: "Stage 1: The Number Lock",
        description: "The first vault door is held by four number sequences, and each missing value is one digit of the lock. Find the missing term in each: (a) 2, 6, 12, 20, 30, ?; (b) 5, 10, 20, 40, ?; (c) 1, 4, 9, 16, ?; (d) 3, 8, ?, 24, 35. Write the rule for each sequence in one sentence. The door opens only when all four values are correct.",
        deliverable: "Submit the four missing terms with their respective mathematical sequence formulas.",
      },
      {
        id: "d9-p2",
        day: 9,
        problemNumber: 2,
        title: "Stage 2: The Letter Cipher",
        description: "A note slipped under the vault door is written in a secret alphabet. The rule: every letter was moved three places forward in the alphabet, so to decode you must move each letter three places back (A becomes X after shifting back, and so on, wrapping around). Decode the message FRGH EUHDNHU and explain how you found the rule, including what you would do if the shift were unknown.",
        deliverable: "Submit decrypted message, decryption table, and frequency-analysis strategy for unknown shifts.",
      },
      {
        id: "d9-p3",
        day: 9,
        problemNumber: 3,
        title: "Stage 3: The Logic Grid",
        description: "Three students, Asha, Bilal and Charu, each have a different locker (1, 2 or 3) and belong to a different club (Chess, Music or Art). Clues: (1) Asha's locker number is higher than Bilal's. (2) The Chess club member has locker 2. (3) Charu is not in the Music club and not in locker 3. (4) Bilal is not in the Chess club. (5) Asha is not in the Art club. Fill in the grid to find each student's locker and club, and show the clue you used at each step.",
        deliverable: "Submit filled logic grid, step-by-step clue deductions, and final student-locker-club pairings.",
      },
      {
        id: "d9-p4",
        day: 9,
        problemNumber: 4,
        title: "Stage 4: The Hidden Message",
        description: "The answers you already have are pieces of a bigger message. Bring together the Stage 2 phrase, the Stage 1 value from sequence (d) and the Stage 3 locker order to build the hidden message. For the event, organisers prepare a final phrase of 6 to 10 words in which each earlier answer unlocks one word or letter. Submit the completed phrase and explain how you combined the pieces.",
        deliverable: "Submit synthesized secret phrase and mapping derivation linking Stages 1, 2, and 3.",
      },
      {
        id: "d9-p5",
        day: 9,
        problemNumber: 5,
        title: "Stage 5: The Final Vault",
        description: "The treasure is locked by a three-digit combination built from your earlier answers: First digit is number of letters in second word of Stage 2 message. Second digit is locker number of Music club member in Stage 3. Third digit is sum of digits of missing number in sequence (d) of Stage 1. Work out the combination, then write one sentence about the teamwork it took to get here.",
        deliverable: "Submit 3-digit combination calculation derivation and your team collaboration reflection statement.",
      },
    ],
  },
  10: {
    day: 10,
    eventTitle: "Future Makers Pitch",
    dateStr: "2026-10-24",
    overview: "Teams pick one real-world problem, design a prototype or schematic, and deliver a concise 60-second elevator pitch.",
    problems: [
      {
        id: "d10-p1", // future makers pitch problems
        day: 10,
        problemNumber: 1,
        title: "Problem 1: Food Waste in the Canteen",
        description: "Every day, a large amount of cooked food and fruit is thrown away from the school canteen and lunch boxes. Spend a day observing what gets wasted and why, for example portions that are too big, food students dislike or no place to save leftovers. Invent a practical solution, such as a portion-choice system, a share table, a compost bin with a feedback chart or a lunchbox tip campaign. Explain who benefits, what materials are needed and how you would measure whether waste has fallen after one month.",
        deliverable: "Submit 60-second video pitch or 1-page solution blueprint with measurement metrics.",
      },
      {
        id: "d10-p2",
        day: 10,
        problemNumber: 2,
        title: "Problem 2: Switch Off, Save Power",
        description: "Fans, lights and projectors are often left on in empty classrooms, wasting electricity and money. Design a way to make sure energy is not wasted when nobody is in the room. Your idea could be a simple reminder system, a student energy monitor roster, a motion-sensing concept or a colour-coded door sign. Draw how it works, estimate the units of electricity saved in a month and say how you would get students to follow it.",
        deliverable: "Submit schematic drawing, estimated monthly kWh savings calculation, and student adoption strategy.",
      },
      {
        id: "d10-p3",
        day: 10,
        problemNumber: 3,
        title: "Problem 3: The Waste Sorting Game",
        description: "Students mix dry waste, wet waste and recyclables in the same bin because sorting is confusing and boring. Create a solution that makes waste segregation easy and even fun, such as a labelled bin station with pictures, a points game between classes or a sorting-training corner. Make a simple model or drawing, show how a student would use it in ten seconds and explain how you would check whether people really sort properly.",
        deliverable: "Submit 10-second user flow sketch, model photograph, and verification inspection protocol.",
      },
      {
        id: "d10-p4",
        day: 10,
        problemNumber: 4,
        title: "Problem 4: Faster, Safer Bus Boarding",
        description: "At dismissal time, students rush to the buses, push in queues and sometimes cross in front of moving vehicles. Study what happens at the bus bay and propose a way to make boarding faster and safer, for example numbered lines, a colour-coded route system, a monitor roster or a waiting zone and marked path. Draw the layout, describe the steps a student follows and explain how your idea protects younger children.",
        deliverable: "Submit bus bay layout schematic, sequential boarding procedure, and child safety safeguarding mechanism.",
      },
      {
        id: "d10-p5",
        day: 10,
        problemNumber: 5,
        title: "Problem 5: Learning Without Home Internet",
        description: "Some students cannot use digital learning at home because they have no device, a weak connection or limited data. Design a solution that helps them access learning, such as a school lab sharing schedule, offline content packs on a pen drive or printed summaries, a peer-learning buddy system or a low-data lesson format. Explain who it helps, what it needs to work and how it can be delivered at very low cost.",
        deliverable: "Submit low-cost operational plan, offline pack architecture, and accessibility equity breakdown.",
      },
    ],
  },
};

/**
 * Deterministic pseudo-random problem index generator (0 to 4)
 * Seeded by team ID (if team mode) or user ID (if individual mode) + day number
 */
export function getDeterministicProblemIndex(seed: string, day: number): number {
  const cleanSeed = (seed || "default").trim().toLowerCase();
  const input = `${cleanSeed}-dlms-day-${day}-problem-assignment-v1`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 5;
}

export interface DayAllotmentStatus {
  isModeSelected: boolean;
  participationMode: "team" | "individual" | null;
  teamId?: string | null;
  teamName?: string | null;
  isUnlocked: boolean; // unlocked if mode is selected AND time >= 8:00 AM on challenge day
  unlockedAtString?: string;
  problem: VacationProblemStatement | null;
  timeRemainingTo8Am?: string | null;
  isTeamFormationClosed: boolean; // true if after 10:00 AM on today
  todayCurrentHour: number;
  todayCurrentMinutes: number;
}

const PARTICIPATION_SELECTION_STORAGE_PREFIX = "dlms_vacation_mode_day_";

export function getStoredParticipationMode(
  userId: string,
  day: number
): { mode: "team" | "individual" | null; teamId?: string | null; teamName?: string | null; selectedAt: string } | null {
  try {
    const key = `${PARTICIPATION_SELECTION_STORAGE_PREFIX}${day}_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredParticipationMode(
  userId: string,
  day: number,
  mode: "team" | "individual",
  teamId?: string | null,
  teamName?: string | null
): void {
  try {
    const key = `${PARTICIPATION_SELECTION_STORAGE_PREFIX}${day}_${userId}`;
    const payload = {
      mode,
      teamId: teamId || null,
      teamName: teamName || null,
      selectedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function clearStoredParticipationMode(userId: string, day: number): void {
  try {
    const key = `${PARTICIPATION_SELECTION_STORAGE_PREFIX}${day}_${userId}`;
    localStorage.removeItem(key);
  } catch {}
}
