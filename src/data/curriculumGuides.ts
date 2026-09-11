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
    ]
  }
};

export function getCurriculumFallback(classNum: string, subject: string, chapter: string): CurriculumGuide {
  // Direct match
  const exactKey = `${classNum}_${subject}_${chapter}`;
  if (CURRICULUM_GUIDES[exactKey]) return CURRICULUM_GUIDES[exactKey];

  // Fuzzy match
  for (const [key, guide] of Object.entries(CURRICULUM_GUIDES)) {
    if (key.startsWith(`${classNum}_${subject}`)) {
      return guide;
    }
  }

  // General subject-accurate fallback
  return {
    summary: `This chapter covers key NCERT concepts and syllabus standards for Class ${classNum} ${subject}. Focus on understanding core definitions, step-by-step proofs, and practical applications.`,
    keyTopics: [
      "Fundamental Definitions and Postulates",
      "Key Properties, Rules and Axioms",
      "Standard Formulae and Equation Derivations",
      "Typical CBSE Board Exam Problems",
      "Real-world and Scientific Applications"
    ],
    importantConcepts: [
      `Review core NCERT Class ${classNum} textbook theory thoroughly.`,
      "Highlight important definitions, units, and constants in your notebook.",
      "Practice diagrams, flowcharts, and stepwise working to maximize score."
    ],
    formulasOrFacts: [
      "SI units must always be written for numerical answers.",
      "Re-check calculations using inverse operations or boundary estimates."
    ],
    studyTips: [
      "Solve all NCERT In-text and Chapter-end exercises twice.",
      "Summarize formulas and diagrams on a single A4 cheat sheet.",
      "Practice 5-year previous CBSE question papers under timed conditions."
    ],
    mcqs: [
      {
        q: `What is the primary focus of ${chapter} in Class ${classNum} ${subject}?`,
        options: [
          "Understanding core conceptual principles and applications",
          "Rote memorization without derivations",
          "Ignoring units and dimensions",
          "Only theoretical definitions"
        ],
        answer: 0
      },
      {
        q: "When solving multi-step questions, the best practice is to:",
        options: [
          "Skip intermediate steps",
          "State formula, substitute values with units, and simplify clearly",
          "Write only the final numerical answer",
          "Ignore given conditions"
        ],
        answer: 1
      },
      {
        q: "NCERT textbook exercises are important because:",
        options: [
          "They directly reflect CBSE examination question patterns",
          "They are optional for school exams",
          "They only have historical value",
          "They contain no practical problems"
        ],
        answer: 0
      }
    ]
  };
}
