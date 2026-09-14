export interface CurriculumGuide {
  summary: string;
  keyTopics: string[];
  importantConcepts: string[];
  formulasOrFacts: string[];
  studyTips: string[];
  mcqs: { q: string; options: string[]; answer: number }[];
}

export const CURRICULUM_GUIDES: Record<string, CurriculumGuide> = {
  // Class 10 Science - Chemical Reactions
  "10_Science_Chemical Reactions": {
    summary: "Chemical reactions involve the breaking and making of bonds between atoms to produce new substances. Chemical equations represent these reactions using chemical formulas and are balanced according to the Law of Conservation of Mass.",
    keyTopics: ["Balancing Chemical Equations", "Combination Reactions", "Decomposition Reactions", "Displacement & Double Displacement", "Oxidation and Reduction (Redox)", "Corrosion & Rancidity"],
    importantConcepts: [
      "Law of Conservation of Mass: Matter cannot be created nor destroyed in a chemical reaction.",
      "Exothermic reactions release heat (e.g. respiration), while endothermic reactions absorb heat.",
      "Redox reactions involve simultaneous loss (oxidation) and gain (reduction) of electrons or hydrogen/oxygen.",
      "Rusting of iron (corrosion) requires both moisture and oxygen."
    ],
    formulasOrFacts: [
      "Photosynthesis: 6CO2 + 6H2O -> C6H12O6 + 6O2",
      "Respiration: C6H12O6 + 6O2 -> 6CO2 + 6H2O + Energy (Exothermic)",
      "Rust formula: Fe2O3.xH2O (Hydrated ferric oxide)",
      "Quicklime reaction: CaO(s) + H2O(l) -> Ca(OH)2(aq) + Heat"
    ],
    studyTips: [
      "Practice balancing equations using the step-by-step element tally method.",
      "Memorize the common color changes: Copper sulphate (blue) turns light green with iron nails.",
      "Always state the physical states (s, l, g, aq) when writing final balanced equations."
    ],
    mcqs: [
      {
        q: "What type of reaction occurs when Quicklime (CaO) is added to water?",
        options: ["Decomposition reaction", "Combination and exothermic reaction", "Endothermic reaction", "Displacement reaction"],
        answer: 1
      },
      {
        q: "Which gas is evolved when dilute hydrochloric acid is added to zinc granules?",
        options: ["Oxygen gas", "Carbon dioxide gas", "Hydrogen gas", "Chlorine gas"],
        answer: 2
      },
      {
        q: "In the reaction: CuO + H2 -> Cu + H2O, which substance undergoes reduction?",
        options: ["CuO", "H2", "Cu", "H2O"],
        answer: 0
      },
      {
        q: "Fatty foods become rancid due to which process?",
        options: ["Corrosion", "Oxidation", "Reduction", "Hydrogenation"],
        answer: 1
      },
      {
        q: "What color is lead iodide precipitate formed during potassium iodide and lead nitrate reaction?",
        options: ["White", "Yellow", "Blue", "Brown"],
        answer: 1
      }
    ]
  },

  // Class 10 Mathematics - Real Numbers
  "10_Mathematics_Real Numbers": {
    summary: "Real numbers encompass both rational and irrational numbers. The Fundamental Theorem of Arithmetic asserts that every composite number can be factored into a unique product of primes, which forms the basis for finding HCF and LCM.",
    keyTopics: ["Fundamental Theorem of Arithmetic", "Prime Factorization", "HCF and LCM relationships", "Revisiting Irrational Numbers (√2, √3, √5 proofs)"],
    importantConcepts: [
      "HCF(a, b) × LCM(a, b) = a × b for any two positive integers a and b.",
      "If p is a prime and p divides a², then p divides a (where a is a positive integer).",
      "A number is irrational if it cannot be expressed as p/q where p, q are integers and q ≠ 0."
    ],
    formulasOrFacts: [
      "Product of two numbers = HCF × LCM",
      "√p is irrational for any prime p",
      "Terminating decimals have denominators of the form 2^n × 5^m"
    ],
    studyTips: [
      "Master the proof by contradiction technique for proving irrationality.",
      "Remember that HCF × LCM = a × b applies ONLY to 2 numbers, never 3."
    ],
    mcqs: [
      {
        q: "If HCF(306, 657) = 9, what is LCM(306, 657)?",
        options: ["22338", "22388", "22838", "22038"],
        answer: 0
      },
      {
        q: "Which of the following is an irrational number?",
        options: ["√4", "3.141414...", "√7", "22/7"],
        answer: 2
      },
      {
        q: "The exponent of 2 in prime factorization of 144 is:",
        options: ["2", "3", "4", "5"],
        answer: 2
      },
      {
        q: "What is the HCF of the smallest composite number and smallest prime number?",
        options: ["1", "2", "4", "6"],
        answer: 1
      },
      {
        q: "Every positive even integer is of the form:",
        options: ["2q", "2q + 1", "q + 1", "4q + 1"],
        answer: 0
      }
    ]
  },

  // Class 10 Science - Life Processes
  "10_Science_Life Processes": {
    summary: "Life processes are basic metabolic activities essential for maintaining organism vitality: nutrition, respiration, transportation, and excretion. Autotrophic organisms synthesize food, while heterotrophs consume organic matter.",
    keyTopics: ["Autotrophic vs Heterotrophic Nutrition", "Aerobic vs Anaerobic Respiration", "Human Circulatory System (Double Circulation)", "Human Excretory System (Nephrons)", "Translocation in Plants"],
    importantConcepts: [
      "Double circulation ensures efficient oxygen delivery without mixing deoxygenated and oxygenated blood.",
      "Nephrons are the structural and functional filtration units of human kidneys.",
      "Xylem transports water and minerals unidirectionally; Phloem transports sugars bidirectionally."
    ],
    formulasOrFacts: [
      "Cellular Respiration in mitochondria produces 38 ATP molecules per glucose molecule.",
      "Anaerobic respiration in muscle produces lactic acid causing muscle fatigue.",
      "Normal blood pressure in adults: 120/80 mm of Hg."
    ],
    studyTips: [
      "Practice drawing labelled diagrams of the human heart, nephron, and digestive tract.",
      "Remember the path of blood flow: Vena cava -> Right atrium -> Right ventricle -> Lungs -> Left atrium -> Left ventricle -> Aorta."
    ],
    mcqs: [
      {
        q: "Which digestive enzyme breaks down emulsified fats in the small intestine?",
        options: ["Pepsin", "Lipase", "Trypsin", "Salivary amylase"],
        answer: 1
      },
      {
        q: "What causes muscle cramps during intense exercise?",
        options: ["Excess of ethanol", "Accumulation of lactic acid", "Lack of carbon dioxide", "Excess water"],
        answer: 1
      },
      {
        q: "Which valve prevents backflow of blood between left atrium and left ventricle?",
        options: ["Tricuspid valve", "Bicuspid (mitral) valve", "Semilunar valve", "Aortic valve"],
        answer: 1
      },
      {
        q: "The functional filtration unit of kidneys is called:",
        options: ["Neuron", "Nephron", "Alveolus", "Villi"],
        answer: 1
      },
      {
        q: "In plants, translocation of synthesized sugars occurs through:",
        options: ["Xylem vessels", "Phloem sieve tubes", "Stomata", "Cortex"],
        answer: 1
      }
    ]
  },

  // Class 12 Physics - Electric Charges and Fields
  "12_Physics_Electric Charges": {
    summary: "Electrostatics deals with stationary charges, their electric fields, and Coulomb forces. Gauss's Law relates electric flux through a closed surface to the net charge enclosed, offering an elegant approach to high-symmetry field calculations.",
    keyTopics: ["Coulomb's Inverse Square Law", "Principle of Superposition", "Electric Field Lines & Flux", "Electric Dipole & Torque", "Gauss's Law & Applications"],
    importantConcepts: [
      "Quantization of charge: Q = ±ne where e = 1.6 × 10^-19 C.",
      "Electric field inside a uniformly charged conducting spherical shell is identically zero.",
      "Electric dipole in a uniform electric field experiences zero net force, but a torque τ = p × E."
    ],
    formulasOrFacts: [
      "Coulomb's Law: F = (1 / 4πε0) · (|q1 q2| / r²)",
      "Electric field of infinite line charge: E = λ / (2πε0 r)",
      "Gauss's Law: ∮ E · dA = q_enclosed / ε0",
      "Permittivity of free space: ε0 = 8.854 × 10^-12 C² / (N·m²)"
    ],
    studyTips: [
      "Memorize Gauss Law derivations for infinite line, infinite plane sheet, and spherical shell.",
      "Be careful with vector signs and dipole moment direction (from -q to +q)."
    ],
    mcqs: [
      {
        q: "What is the SI unit of electric flux?",
        options: ["N / C", "N·m² / C", "C / m²", "V / m²"],
        answer: 1
      },
      {
        q: "What is the electric field inside a charged hollow spherical conductor of radius R?",
        options: ["q / (4πε0 R)", "Zero", "q / (4πε0 R²)", "Infinite"],
        answer: 1
      },
      {
        q: "An electric dipole placed in a uniform electric field experiences:",
        options: ["Only a net force", "Only a torque", "Both net force and torque", "Neither force nor torque"],
        answer: 1
      },
      {
        q: "Two point charges separated by distance r repel with force F. If distance is doubled, force becomes:",
        options: ["2F", "F / 2", "F / 4", "4F"],
        answer: 2
      },
      {
        q: "Total electric flux through a closed surface containing dipole of charges +q and -q is:",
        options: ["q / ε0", "2q / ε0", "Zero", "-q / ε0"],
        answer: 2
      }
  // Class 10 Science - Metals and Non-metals
  "10_Science_Metals and Non-metals": {
    summary: "Metals and non-metals differ significantly in physical and chemical properties. Metals are electropositive, form basic oxides, and react with acids and water based on the reactivity series, while non-metals form covalent or acidic oxides.",
    keyTopics: ["Physical & Chemical Properties of Metals", "Reactivity Series", "Ionic Bonds & Properties of Ionic Compounds", "Metallurgy: Roasting & Calcination", "Corrosion and Prevention"],
    importantConcepts: [
      "Reactivity series arranges metals in order of decreasing chemical reactivity: K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au.",
      "Ionic compounds have high melting/boiling points and conduct electricity in molten or aqueous state due to free ions.",
      "Roasting is heating ores in excess air (sulphides), whereas Calcination is heating in limited air (carbonates).",
      "Galvanization protects iron by coating it with a thin layer of zinc."
    ],
    formulasOrFacts: [
      "Amphoteric oxides: Al2O3 and ZnO react with both acids and bases to produce salt and water.",
      "Thermite reaction: Fe2O3 + 2Al -> 2Fe(l) + Al2O3 + Heat",
      "Aqua Regia: 3:1 mixture of concentrated HCl and concentrated HNO3 (dissolves gold and platinum)."
    ],
    studyTips: [
      "Memorize the reactivity series with a mnemonic (e.g., 'Please Stop Calling Me A Careless Zebra Instead Try Learning How Copper Saves Gold').",
      "Practice drawing electron dot structures for NaCl, MgCl2, and CaO."
    ],
    mcqs: [
      {
        q: "Which metal is liquid at room temperature?",
        options: ["Sodium", "Mercury", "Bromine", "Gallium"],
        answer: 1
      },
      {
        q: "Aluminium oxide (Al2O3) is classified as:",
        options: ["Acidic oxide", "Basic oxide", "Amphoteric oxide", "Neutral oxide"],
        answer: 2
      },
      {
        q: "Which method is commonly used to prevent rusting of iron?",
        options: ["Galvanisation", "Applying grease or paint", "Electroplating with chromium", "All of the above"],
        answer: 3
      }
    ]
  },

  // Class 10 Science - Acids, Bases and Salts
  "10_Science_Acids, Bases and Salts": {
    summary: "Acids produce H+ (aq) ions in solution, have a sour taste, and turn blue litmus red. Bases produce OH- (aq) ions, are bitter/soapy, and turn red litmus blue. Neutralisation produces salt and water, and pH scale measures hydrogen ion concentration.",
    keyTopics: ["Indicators (Litmus, Phenolphthalein, Olfactory)", "Chemical Properties of Acids & Bases", "pH Scale & Importance in Everyday Life", "Salts: Bleaching Powder, Baking Soda, Washing Soda, Plaster of Paris"],
    importantConcepts: [
      "pH is inversely related to H+ ion concentration: pH = -log[H+]. pH < 7 is acidic, pH = 7 is neutral, pH > 7 is basic.",
      "Tooth decay begins when mouth pH falls below 5.5 (acid corrodes calcium hydroxyapatite enamel).",
      "Plaster of Paris (CaSO4.1/2H2O) hardens on adding water to form Gypsum (CaSO4.2H2O)."
    ],
    formulasOrFacts: [
      "Bleaching Powder: CaOCl2 (formed by Cl2 + dry Ca(OH)2)",
      "Baking Soda: NaHCO3 (Sodium hydrogen carbonate)",
      "Washing Soda: Na2CO3.10H2O (Sodium carbonate decahydrate)",
      "Plaster of Paris: CaSO4 · 1/2 H2O"
    ],
    studyTips: [
      "Remember the colors of indicators: Methyl orange turns pink in acid, yellow in base; Phenolphthalein is colorless in acid, pink in base.",
      "Know the common acid sources: Vinegar (acetic acid), Tamarind (tartaric acid), Tomato (oxalic acid), Ant sting (methanoic acid)."
    ],
    mcqs: [
      {
        q: "What is the pH range of human blood under normal conditions?",
        options: ["6.0 - 6.5", "7.35 - 7.45", "8.0 - 8.5", "5.0 - 5.5"],
        answer: 1
      },
      {
        q: "Which salt is used in soda-acid fire extinguishers?",
        options: ["Washing soda", "Baking soda (NaHCO3)", "Bleaching powder", "Gypsum"],
        answer: 1
      },
      {
        q: "The chemical formula of Plaster of Paris is:",
        options: ["CaSO4 · 2H2O", "CaSO4 · 1/2H2O", "CaSO4 · H2O", "CaSO4"],
        answer: 1
      }
    ]
  }
};

export function getCurriculumFallback(classNum: string, subject: string, chapter: string): CurriculumGuide {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normClass = norm(classNum);
  const normSubject = norm(subject);
  const normChapter = norm(chapter);

  // 1. Direct key match
  const exactKey = `${classNum}_${subject}_${chapter}`;
  if (CURRICULUM_GUIDES[exactKey]) return CURRICULUM_GUIDES[exactKey];

  // 2. Exact normalized match
  for (const [key, guide] of Object.entries(CURRICULUM_GUIDES)) {
    const [kClass, kSubject, kChapter] = key.split("_");
    if (norm(kClass || "") === normClass && norm(kSubject || "") === normSubject && norm(kChapter || "") === normChapter) {
      return guide;
    }
  }

  // 3. Keyword match inside chapter title for that class and subject
  for (const [key, guide] of Object.entries(CURRICULUM_GUIDES)) {
    const [kClass, kSubject, kChapter] = key.split("_");
    if (norm(kClass || "") === normClass && norm(kSubject || "") === normSubject) {
      const kWords = (kChapter || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (kWords.some(w => normChapter.includes(norm(w)))) {
        return guide;
      }
    }
  }

  // 4. Dynamic subject-accurate fallback with the actual chapter title
  return {
    summary: `This study guide covers the core NCERT and CBSE syllabus standards for Class ${classNum} ${subject} on "${chapter}". Focus on understanding core definitions, step-by-step principles, and practical problem-solving.`,
    keyTopics: [
      `${chapter} — Fundamental Definitions and Core Concepts`,
      "Key Scientific/Mathematical Principles & Formulas",
      "Standard Formulae and Equation Derivations",
      "Typical CBSE Board Exam Questions",
      "Real-world and Laboratory Applications"
    ],
    importantConcepts: [
      `Review NCERT Class ${classNum} ${subject} textbook chapter on ${chapter} thoroughly.`,
      "Highlight important definitions, key units, and standard laws in your study notes.",
      "Practice step-by-step diagrams, equations, and derivations to maximize exam marks."
    ],
    formulasOrFacts: [
      `Units and dimensions must always be specified for numerical answers in ${subject}.`,
      "Re-check calculations using inverse operations or boundary checks."
    ],
    studyTips: [
      `Solve all NCERT In-text and Chapter-end exercises for ${chapter}.`,
      "Summarize formulas and key concepts on a single cheat sheet for quick revision.",
      "Practice previous 5 years of CBSE question papers under timed conditions."
    ],
    mcqs: [
      {
        q: `What is the primary focus of ${chapter} in Class ${classNum} ${subject}?`,
        options: [
          "Understanding core conceptual principles and applications",
          "Rote memorization without understanding",
          "Ignoring SI units and standard notation",
          "Only skipping to exam questions"
        ],
        answer: 0
      },
      {
        q: "When solving multi-step questions in CBSE exams, the recommended practice is to:",
        options: [
          "Skip intermediate working steps",
          "State formula, substitute values with units, and simplify clearly",
          "Write only the final numerical answer without explanation",
          "Ignore given conditions"
        ],
        answer: 1
      },
      {
        q: "NCERT textbook exercises are important because:",
        options: [
          "They directly reflect CBSE examination question patterns and concepts",
          "They are optional for school examinations",
          "They have only historical value",
          "They contain no practical problems"
        ],
        answer: 0
      }
    ]
  };
}
