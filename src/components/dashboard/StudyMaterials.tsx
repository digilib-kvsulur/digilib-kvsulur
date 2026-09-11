import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, BookOpen, Search, FileText, Download, Loader2, ChevronRight, GraduationCap, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

interface NcertChapter {
  title: string;
  url: string;
}

interface NcertBookData {
  name: string;
  chapters: NcertChapter[];
}

// Comprehensive NCERT textbook directory across Classes 1 to 12
const FALLBACK_NCERT: Record<string, Record<string, NcertBookData>> = {
  "1": {
    English: { name: "Mridang – Class 1", chapters: [{ title: "Unit 1 – My Family and Me", url: "https://ncert.nic.in/textbook/pdf/aeen101.pdf" }, { title: "Unit 2 – Life Around Us", url: "https://ncert.nic.in/textbook/pdf/aeen102.pdf" }, { title: "Unit 3 – Food and Water", url: "https://ncert.nic.in/textbook/pdf/aeen103.pdf" }] },
    Hindi: { name: "Sarangi – Class 1", chapters: [{ title: "इकाई 1 – परिवार", url: "https://ncert.nic.in/textbook/pdf/ahhn101.pdf" }, { title: "इकाई 2 – जीव-जगत", url: "https://ncert.nic.in/textbook/pdf/ahhn102.pdf" }] },
    Mathematics: { name: "Joyful Mathematics – Class 1", chapters: [{ title: "Chapter 1 – Finding the Furry Cat (Shapes)", url: "https://ncert.nic.in/textbook/pdf/aemh101.pdf" }, { title: "Chapter 2 – What is Long? What is Round?", url: "https://ncert.nic.in/textbook/pdf/aemh102.pdf" }] }
  },
  "2": {
    English: { name: "Mridang – Class 2", chapters: [{ title: "Unit 1 – Welcome to School", url: "https://ncert.nic.in/textbook/pdf/been101.pdf" }, { title: "Unit 2 – Picture Reading", url: "https://ncert.nic.in/textbook/pdf/been102.pdf" }] },
    Mathematics: { name: "Joyful Mathematics – Class 2", chapters: [{ title: "Chapter 1 – Day at the Beach", url: "https://ncert.nic.in/textbook/pdf/bemh101.pdf" }, { title: "Chapter 2 – Shapes and Sizes", url: "https://ncert.nic.in/textbook/pdf/bemh102.pdf" }] }
  },
  "3": {
    English: { name: "Santoor – Class 3", chapters: [{ title: "Unit 1 – Colours", url: "https://ncert.nic.in/textbook/pdf/ceen101.pdf" }, { title: "Unit 2 – Fun and Play", url: "https://ncert.nic.in/textbook/pdf/ceen102.pdf" }] },
    Mathematics: { name: "Math-Magic – Class 3", chapters: [{ title: "Chapter 1 – Where to Look From", url: "https://ncert.nic.in/textbook/pdf/cemh101.pdf" }, { title: "Chapter 2 – Fun with Numbers", url: "https://ncert.nic.in/textbook/pdf/cemh102.pdf" }] },
    EVS: { name: "Looking Around (EVS) – Class 3", chapters: [{ title: "Chapter 1 – Poonam's Day Out", url: "https://ncert.nic.in/textbook/pdf/ceev101.pdf" }, { title: "Chapter 2 – The Plant Fairy", url: "https://ncert.nic.in/textbook/pdf/ceev102.pdf" }] }
  },
  "4": {
    English: { name: "Marigold – Class 4", chapters: [{ title: "Unit 1 – Wake Up! & Neha's Alarm Clock", url: "https://ncert.nic.in/textbook/pdf/deen101.pdf" }, { title: "Unit 2 – Noses & The Little Fir Tree", url: "https://ncert.nic.in/textbook/pdf/deen102.pdf" }] },
    Mathematics: { name: "Math-Magic – Class 4", chapters: [{ title: "Chapter 1 – Building with Bricks", url: "https://ncert.nic.in/textbook/pdf/demh101.pdf" }, { title: "Chapter 2 – Long and Short", url: "https://ncert.nic.in/textbook/pdf/demh102.pdf" }] },
    EVS: { name: "Looking Around – Class 4", chapters: [{ title: "Chapter 1 – Going to School", url: "https://ncert.nic.in/textbook/pdf/deev101.pdf" }, { title: "Chapter 2 – Ear to Ear", url: "https://ncert.nic.in/textbook/pdf/deev102.pdf" }] }
  },
  "5": {
    English: { name: "Marigold – Class 5", chapters: [{ title: "Unit 1 – Ice-cream Man", url: "https://ncert.nic.in/textbook/pdf/eeen101.pdf" }, { title: "Unit 2 – Wonderful Waste!", url: "https://ncert.nic.in/textbook/pdf/eeen102.pdf" }] },
    Mathematics: { name: "Math-Magic – Class 5", chapters: [{ title: "Chapter 1 – The Fish Tale", url: "https://ncert.nic.in/textbook/pdf/eemh101.pdf" }, { title: "Chapter 2 – Shapes and Angles", url: "https://ncert.nic.in/textbook/pdf/eemh102.pdf" }] },
    EVS: { name: "Looking Around – Class 5", chapters: [{ title: "Chapter 1 – Super Senses", url: "https://ncert.nic.in/textbook/pdf/eeev101.pdf" }, { title: "Chapter 2 – A Snake Charmer's Story", url: "https://ncert.nic.in/textbook/pdf/eeev102.pdf" }] }
  },
  "6": {
    Mathematics: {
      name: "Mathematics – Class 6",
      chapters: [
        { title: "Chapter 1 – Knowing Our Numbers", url: "https://ncert.nic.in/textbook/pdf/femh101.pdf" },
        { title: "Chapter 2 – Whole Numbers", url: "https://ncert.nic.in/textbook/pdf/femh102.pdf" },
        { title: "Chapter 3 – Playing with Numbers", url: "https://ncert.nic.in/textbook/pdf/femh103.pdf" },
        { title: "Chapter 4 – Basic Geometrical Ideas", url: "https://ncert.nic.in/textbook/pdf/femh104.pdf" },
        { title: "Chapter 5 – Fractions & Decimals", url: "https://ncert.nic.in/textbook/pdf/femh105.pdf" },
      ],
    },
    Science: {
      name: "Curiosity (Science) – Class 6",
      chapters: [
        { title: "Chapter 1 – The Wonderful World of Science", url: "https://ncert.nic.in/textbook/pdf/fesc101.pdf" },
        { title: "Chapter 2 – Diversity in the Living World", url: "https://ncert.nic.in/textbook/pdf/fesc102.pdf" },
        { title: "Chapter 3 – Mindful Eating: A Path to a Healthy Body", url: "https://ncert.nic.in/textbook/pdf/fesc103.pdf" },
        { title: "Chapter 4 – Exploring Magnets", url: "https://ncert.nic.in/textbook/pdf/fesc104.pdf" },
      ],
    },
    "Social Science": {
      name: "Exploring Society: India and Beyond – Class 6",
      chapters: [
        { title: "Chapter 1 – Locating Places on the Earth", url: "https://ncert.nic.in/textbook/pdf/fess101.pdf" },
        { title: "Chapter 2 – Oceans and Continents", url: "https://ncert.nic.in/textbook/pdf/fess102.pdf" },
        { title: "Chapter 3 – Landforms and Life", url: "https://ncert.nic.in/textbook/pdf/fess103.pdf" },
      ]
    },
    English: {
      name: "Poorvi – Class 6",
      chapters: [
        { title: "Unit 1 – Fables and Folk Tales", url: "https://ncert.nic.in/textbook/pdf/feen101.pdf" },
        { title: "Unit 2 – Friendship", url: "https://ncert.nic.in/textbook/pdf/feen102.pdf" },
      ]
    }
  },
  "7": {
    Mathematics: {
      name: "Mathematics – Class 7",
      chapters: [
        { title: "Chapter 1 – Integers", url: "https://ncert.nic.in/textbook/pdf/gemh101.pdf" },
        { title: "Chapter 2 – Fractions and Decimals", url: "https://ncert.nic.in/textbook/pdf/gemh102.pdf" },
        { title: "Chapter 3 – Data Handling", url: "https://ncert.nic.in/textbook/pdf/gemh103.pdf" },
        { title: "Chapter 4 – Simple Equations", url: "https://ncert.nic.in/textbook/pdf/gemh104.pdf" },
      ]
    },
    Science: {
      name: "Science – Class 7",
      chapters: [
        { title: "Chapter 1 – Nutrition in Plants", url: "https://ncert.nic.in/textbook/pdf/gesc101.pdf" },
        { title: "Chapter 2 – Nutrition in Animals", url: "https://ncert.nic.in/textbook/pdf/gesc102.pdf" },
        { title: "Chapter 3 – Heat", url: "https://ncert.nic.in/textbook/pdf/gesc103.pdf" },
        { title: "Chapter 4 – Acids, Bases and Salts", url: "https://ncert.nic.in/textbook/pdf/gesc104.pdf" },
      ]
    }
  },
  "8": {
    Mathematics: {
      name: "Mathematics – Class 8",
      chapters: [
        { title: "Chapter 1 – Rational Numbers", url: "https://ncert.nic.in/textbook/pdf/hemh101.pdf" },
        { title: "Chapter 2 – Linear Equations in One Variable", url: "https://ncert.nic.in/textbook/pdf/hemh102.pdf" },
        { title: "Chapter 3 – Understanding Quadrilaterals", url: "https://ncert.nic.in/textbook/pdf/hemh103.pdf" },
        { title: "Chapter 4 – Data Handling", url: "https://ncert.nic.in/textbook/pdf/hemh104.pdf" },
        { title: "Chapter 5 – Squares and Square Roots", url: "https://ncert.nic.in/textbook/pdf/hemh105.pdf" },
      ]
    },
    Science: {
      name: "Science – Class 8",
      chapters: [
        { title: "Chapter 1 – Crop Production and Management", url: "https://ncert.nic.in/textbook/pdf/hesc101.pdf" },
        { title: "Chapter 2 – Microorganisms: Friend and Foe", url: "https://ncert.nic.in/textbook/pdf/hesc102.pdf" },
        { title: "Chapter 3 – Coal and Petroleum", url: "https://ncert.nic.in/textbook/pdf/hesc103.pdf" },
        { title: "Chapter 4 – Combustion and Flame", url: "https://ncert.nic.in/textbook/pdf/hesc104.pdf" },
        { title: "Chapter 5 – Cell Structure and Functions", url: "https://ncert.nic.in/textbook/pdf/hesc105.pdf" },
      ]
    }
  },
  "9": {
    Mathematics: {
      name: "Mathematics – Class 9",
      chapters: [
        { title: "Chapter 1 – Number Systems", url: "https://ncert.nic.in/textbook/pdf/iemh101.pdf" },
        { title: "Chapter 2 – Polynomials", url: "https://ncert.nic.in/textbook/pdf/iemh102.pdf" },
        { title: "Chapter 3 – Coordinate Geometry", url: "https://ncert.nic.in/textbook/pdf/iemh103.pdf" },
        { title: "Chapter 4 – Linear Equations in Two Variables", url: "https://ncert.nic.in/textbook/pdf/iemh104.pdf" },
        { title: "Chapter 6 – Lines and Angles", url: "https://ncert.nic.in/textbook/pdf/iemh106.pdf" },
        { title: "Chapter 7 – Triangles", url: "https://ncert.nic.in/textbook/pdf/iemh107.pdf" },
      ]
    },
    Science: {
      name: "Science – Class 9",
      chapters: [
        { title: "Chapter 1 – Matter in Our Surroundings", url: "https://ncert.nic.in/textbook/pdf/iesc101.pdf" },
        { title: "Chapter 2 – Is Matter Around Us Pure?", url: "https://ncert.nic.in/textbook/pdf/iesc102.pdf" },
        { title: "Chapter 5 – The Fundamental Unit of Life", url: "https://ncert.nic.in/textbook/pdf/iesc105.pdf" },
        { title: "Chapter 6 – Tissues", url: "https://ncert.nic.in/textbook/pdf/iesc106.pdf" },
        { title: "Chapter 7 – Motion", url: "https://ncert.nic.in/textbook/pdf/iesc107.pdf" },
        { title: "Chapter 8 – Force and Laws of Motion", url: "https://ncert.nic.in/textbook/pdf/iesc108.pdf" },
        { title: "Chapter 9 – Gravitation", url: "https://ncert.nic.in/textbook/pdf/iesc109.pdf" },
      ]
    }
  },
  "10": {
    Mathematics: {
      name: "Mathematics – Class 10",
      chapters: [
        { title: "Chapter 1 – Real Numbers", url: "https://ncert.nic.in/textbook/pdf/jemh101.pdf" },
        { title: "Chapter 2 – Polynomials", url: "https://ncert.nic.in/textbook/pdf/jemh102.pdf" },
        { title: "Chapter 3 – Pair of Linear Equations in Two Variables", url: "https://ncert.nic.in/textbook/pdf/jemh103.pdf" },
        { title: "Chapter 4 – Quadratic Equations", url: "https://ncert.nic.in/textbook/pdf/jemh104.pdf" },
        { title: "Chapter 5 – Arithmetic Progressions", url: "https://ncert.nic.in/textbook/pdf/jemh105.pdf" },
        { title: "Chapter 6 – Triangles", url: "https://ncert.nic.in/textbook/pdf/jemh106.pdf" },
        { title: "Chapter 7 – Coordinate Geometry", url: "https://ncert.nic.in/textbook/pdf/jemh107.pdf" },
        { title: "Chapter 8 – Introduction to Trigonometry", url: "https://ncert.nic.in/textbook/pdf/jemh108.pdf" },
        { title: "Chapter 9 – Some Applications of Trigonometry", url: "https://ncert.nic.in/textbook/pdf/jemh109.pdf" },
        { title: "Chapter 10 – Circles", url: "https://ncert.nic.in/textbook/pdf/jemh110.pdf" },
        { title: "Chapter 12 – Surface Areas and Volumes", url: "https://ncert.nic.in/textbook/pdf/jemh112.pdf" },
        { title: "Chapter 13 – Statistics", url: "https://ncert.nic.in/textbook/pdf/jemh113.pdf" },
        { title: "Chapter 14 – Probability", url: "https://ncert.nic.in/textbook/pdf/jemh114.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 10",
      chapters: [
        { title: "Chapter 1 – Chemical Reactions and Equations", url: "https://ncert.nic.in/textbook/pdf/jesc101.pdf" },
        { title: "Chapter 2 – Acids, Bases and Salts", url: "https://ncert.nic.in/textbook/pdf/jesc102.pdf" },
        { title: "Chapter 3 – Metals and Non-metals", url: "https://ncert.nic.in/textbook/pdf/jesc103.pdf" },
        { title: "Chapter 4 – Carbon and its Compounds", url: "https://ncert.nic.in/textbook/pdf/jesc104.pdf" },
        { title: "Chapter 5 – Life Processes", url: "https://ncert.nic.in/textbook/pdf/jesc105.pdf" },
        { title: "Chapter 6 – Control and Coordination", url: "https://ncert.nic.in/textbook/pdf/jesc106.pdf" },
        { title: "Chapter 7 – How do Organisms Reproduce?", url: "https://ncert.nic.in/textbook/pdf/jesc107.pdf" },
        { title: "Chapter 8 – Heredity", url: "https://ncert.nic.in/textbook/pdf/jesc108.pdf" },
        { title: "Chapter 9 – Light – Reflection and Refraction", url: "https://ncert.nic.in/textbook/pdf/jesc109.pdf" },
        { title: "Chapter 10 – The Human Eye and Colourful World", url: "https://ncert.nic.in/textbook/pdf/jesc110.pdf" },
        { title: "Chapter 11 – Electricity", url: "https://ncert.nic.in/textbook/pdf/jesc111.pdf" },
        { title: "Chapter 12 – Magnetic Effects of Electric Current", url: "https://ncert.nic.in/textbook/pdf/jesc112.pdf" },
        { title: "Chapter 13 – Our Environment", url: "https://ncert.nic.in/textbook/pdf/jesc113.pdf" },
      ],
    },
    "Social Science": {
      name: "Social Science – Class 10",
      chapters: [
        { title: "History: The Rise of Nationalism in Europe", url: "https://ncert.nic.in/textbook/pdf/jess301.pdf" },
        { title: "History: Nationalism in India", url: "https://ncert.nic.in/textbook/pdf/jess302.pdf" },
        { title: "Geography: Resources and Development", url: "https://ncert.nic.in/textbook/pdf/jess101.pdf" },
        { title: "Geography: Water Resources", url: "https://ncert.nic.in/textbook/pdf/jess103.pdf" },
        { title: "Economics: Development", url: "https://ncert.nic.in/textbook/pdf/jess201.pdf" },
        { title: "Economics: Sectors of the Indian Economy", url: "https://ncert.nic.in/textbook/pdf/jess202.pdf" },
      ]
    }
  },
  "11": {
    Physics: {
      name: "Physics (Part 1 & 2) – Class 11",
      chapters: [
        { title: "Chapter 1 – Units and Measurements", url: "https://ncert.nic.in/textbook/pdf/keph101.pdf" },
        { title: "Chapter 2 – Motion in a Straight Line", url: "https://ncert.nic.in/textbook/pdf/keph102.pdf" },
        { title: "Chapter 3 – Motion in a Plane", url: "https://ncert.nic.in/textbook/pdf/keph103.pdf" },
        { title: "Chapter 4 – Laws of Motion", url: "https://ncert.nic.in/textbook/pdf/keph104.pdf" },
        { title: "Chapter 5 – Work, Energy and Power", url: "https://ncert.nic.in/textbook/pdf/keph105.pdf" },
        { title: "Chapter 7 – Gravitation", url: "https://ncert.nic.in/textbook/pdf/keph107.pdf" },
        { title: "Chapter 8 – Mechanical Properties of Solids", url: "https://ncert.nic.in/textbook/pdf/keph201.pdf" },
        { title: "Chapter 11 – Thermodynamics", url: "https://ncert.nic.in/textbook/pdf/keph204.pdf" },
      ]
    },
    Chemistry: {
      name: "Chemistry (Part 1 & 2) – Class 11",
      chapters: [
        { title: "Chapter 1 – Some Basic Concepts of Chemistry", url: "https://ncert.nic.in/textbook/pdf/kech101.pdf" },
        { title: "Chapter 2 – Structure of Atom", url: "https://ncert.nic.in/textbook/pdf/kech102.pdf" },
        { title: "Chapter 3 – Classification of Elements & Periodicity", url: "https://ncert.nic.in/textbook/pdf/kech103.pdf" },
        { title: "Chapter 4 – Chemical Bonding and Molecular Structure", url: "https://ncert.nic.in/textbook/pdf/kech104.pdf" },
        { title: "Chapter 5 – Chemical Thermodynamics", url: "https://ncert.nic.in/textbook/pdf/kech105.pdf" },
        { title: "Chapter 6 – Equilibrium", url: "https://ncert.nic.in/textbook/pdf/kech106.pdf" },
        { title: "Chapter 8 – Organic Chemistry: Some Basic Principles", url: "https://ncert.nic.in/textbook/pdf/kech202.pdf" },
        { title: "Chapter 9 – Hydrocarbons", url: "https://ncert.nic.in/textbook/pdf/kech203.pdf" },
      ]
    },
    Mathematics: {
      name: "Mathematics – Class 11",
      chapters: [
        { title: "Chapter 1 – Sets", url: "https://ncert.nic.in/textbook/pdf/kemh101.pdf" },
        { title: "Chapter 2 – Relations and Functions", url: "https://ncert.nic.in/textbook/pdf/kemh102.pdf" },
        { title: "Chapter 3 – Trigonometric Functions", url: "https://ncert.nic.in/textbook/pdf/kemh103.pdf" },
        { title: "Chapter 5 – Linear Inequalities", url: "https://ncert.nic.in/textbook/pdf/kemh105.pdf" },
        { title: "Chapter 6 – Permutations and Combinations", url: "https://ncert.nic.in/textbook/pdf/kemh106.pdf" },
        { title: "Chapter 9 – Straight Lines", url: "https://ncert.nic.in/textbook/pdf/kemh109.pdf" },
        { title: "Chapter 11 – Introduction to Three Dimensional Geometry", url: "https://ncert.nic.in/textbook/pdf/kemh111.pdf" },
        { title: "Chapter 12 – Limits and Derivatives", url: "https://ncert.nic.in/textbook/pdf/kemh112.pdf" },
      ]
    }
  },
  "12": {
    Physics: {
      name: "Physics (Part 1 & 2) – Class 12",
      chapters: [
        { title: "Chapter 1 – Electric Charges and Fields", url: "https://ncert.nic.in/textbook/pdf/leph101.pdf" },
        { title: "Chapter 2 – Electrostatic Potential and Capacitance", url: "https://ncert.nic.in/textbook/pdf/leph102.pdf" },
        { title: "Chapter 3 – Current Electricity", url: "https://ncert.nic.in/textbook/pdf/leph103.pdf" },
        { title: "Chapter 4 – Moving Charges and Magnetism", url: "https://ncert.nic.in/textbook/pdf/leph104.pdf" },
        { title: "Chapter 5 – Magnetism and Matter", url: "https://ncert.nic.in/textbook/pdf/leph105.pdf" },
        { title: "Chapter 6 – Electromagnetic Induction", url: "https://ncert.nic.in/textbook/pdf/leph106.pdf" },
        { title: "Chapter 7 – Alternating Current", url: "https://ncert.nic.in/textbook/pdf/leph107.pdf" },
        { title: "Chapter 8 – Electromagnetic Waves", url: "https://ncert.nic.in/textbook/pdf/leph108.pdf" },
        { title: "Chapter 9 – Ray Optics and Optical Instruments", url: "https://ncert.nic.in/textbook/pdf/leph201.pdf" },
        { title: "Chapter 10 – Wave Optics", url: "https://ncert.nic.in/textbook/pdf/leph202.pdf" },
        { title: "Chapter 11 – Dual Nature of Radiation and Matter", url: "https://ncert.nic.in/textbook/pdf/leph203.pdf" },
        { title: "Chapter 12 – Atoms", url: "https://ncert.nic.in/textbook/pdf/leph204.pdf" },
        { title: "Chapter 13 – Nuclei", url: "https://ncert.nic.in/textbook/pdf/leph205.pdf" },
        { title: "Chapter 14 – Semiconductor Electronics", url: "https://ncert.nic.in/textbook/pdf/leph206.pdf" },
      ]
    },
    Chemistry: {
      name: "Chemistry (Part 1 & 2) – Class 12",
      chapters: [
        { title: "Chapter 1 – Solutions", url: "https://ncert.nic.in/textbook/pdf/lech101.pdf" },
        { title: "Chapter 2 – Electrochemistry", url: "https://ncert.nic.in/textbook/pdf/lech102.pdf" },
        { title: "Chapter 3 – Chemical Kinetics", url: "https://ncert.nic.in/textbook/pdf/lech103.pdf" },
        { title: "Chapter 4 – The d- and f-Block Elements", url: "https://ncert.nic.in/textbook/pdf/lech104.pdf" },
        { title: "Chapter 5 – Coordination Compounds", url: "https://ncert.nic.in/textbook/pdf/lech105.pdf" },
        { title: "Chapter 6 – Haloalkanes and Haloarenes", url: "https://ncert.nic.in/textbook/pdf/lech201.pdf" },
        { title: "Chapter 7 – Alcohols, Phenols and Ethers", url: "https://ncert.nic.in/textbook/pdf/lech202.pdf" },
        { title: "Chapter 8 – Aldehydes, Ketones and Carboxylic Acids", url: "https://ncert.nic.in/textbook/pdf/lech203.pdf" },
        { title: "Chapter 9 – Amines", url: "https://ncert.nic.in/textbook/pdf/lech204.pdf" },
        { title: "Chapter 10 – Biomolecules", url: "https://ncert.nic.in/textbook/pdf/lech205.pdf" },
      ]
    },
    Mathematics: {
      name: "Mathematics (Part 1 & 2) – Class 12",
      chapters: [
        { title: "Chapter 1 – Relations and Functions", url: "https://ncert.nic.in/textbook/pdf/lemh101.pdf" },
        { title: "Chapter 2 – Inverse Trigonometric Functions", url: "https://ncert.nic.in/textbook/pdf/lemh102.pdf" },
        { title: "Chapter 3 – Matrices", url: "https://ncert.nic.in/textbook/pdf/lemh103.pdf" },
        { title: "Chapter 4 – Determinants", url: "https://ncert.nic.in/textbook/pdf/lemh104.pdf" },
        { title: "Chapter 5 – Continuity and Differentiability", url: "https://ncert.nic.in/textbook/pdf/lemh105.pdf" },
        { title: "Chapter 6 – Application of Derivatives", url: "https://ncert.nic.in/textbook/pdf/lemh106.pdf" },
        { title: "Chapter 7 – Integrals", url: "https://ncert.nic.in/textbook/pdf/lemh201.pdf" },
        { title: "Chapter 8 – Application of Integrals", url: "https://ncert.nic.in/textbook/pdf/lemh202.pdf" },
        { title: "Chapter 9 – Differential Equations", url: "https://ncert.nic.in/textbook/pdf/lemh203.pdf" },
        { title: "Chapter 10 – Vector Algebra", url: "https://ncert.nic.in/textbook/pdf/lemh204.pdf" },
        { title: "Chapter 11 – Three Dimensional Geometry", url: "https://ncert.nic.in/textbook/pdf/lemh205.pdf" },
        { title: "Chapter 12 – Linear Programming", url: "https://ncert.nic.in/textbook/pdf/lemh206.pdf" },
        { title: "Chapter 13 – Probability", url: "https://ncert.nic.in/textbook/pdf/lemh207.pdf" },
      ]
    },
    Biology: {
      name: "Biology – Class 12",
      chapters: [
        { title: "Chapter 1 – Sexual Reproduction in Flowering Plants", url: "https://ncert.nic.in/textbook/pdf/lebo101.pdf" },
        { title: "Chapter 2 – Human Reproduction", url: "https://ncert.nic.in/textbook/pdf/lebo102.pdf" },
        { title: "Chapter 4 – Principles of Inheritance and Variation", url: "https://ncert.nic.in/textbook/pdf/lebo104.pdf" },
        { title: "Chapter 5 – Molecular Basis of Inheritance", url: "https://ncert.nic.in/textbook/pdf/lebo105.pdf" },
        { title: "Chapter 8 – Biotechnology: Principles and Processes", url: "https://ncert.nic.in/textbook/pdf/lebo108.pdf" },
      ]
    }
  }
};

// Curated CBSE Board Sample Papers & Question Banks
const CBSE_BOARD_RESOURCES = [
  { class: "10", subject: "Mathematics Standard", title: "Class 10 Math Standard Official SQP & Marking Scheme", url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/MathsStandard-SQP.pdf" },
  { class: "10", subject: "Science", title: "Class 10 Science Official SQP & Marking Scheme", url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/Science-SQP.pdf" },
  { class: "10", subject: "Social Science", title: "Class 10 Social Science Official Sample Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/SocialScience-SQP.pdf" },
  { class: "10", subject: "English Language & Literature", title: "Class 10 English Language & Literature SQP", url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/EnglishLanguage-SQP.pdf" },
  { class: "12", subject: "Physics", title: "Class 12 Physics Official Sample Question Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/Physics-SQP.pdf" },
  { class: "12", subject: "Chemistry", title: "Class 12 Chemistry Official Sample Question Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/Chemistry-SQP.pdf" },
  { class: "12", subject: "Mathematics", title: "Class 12 Mathematics Official Sample Question Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/Maths-SQP.pdf" },
  { class: "12", subject: "Biology", title: "Class 12 Biology Official Sample Question Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/Biology-SQP.pdf" },
  { class: "12", subject: "Computer Science", title: "Class 12 Computer Science (Python) SQP", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/ComputerScience-SQP.pdf" },
  { class: "12", subject: "Accountancy", title: "Class 12 Accountancy Official Sample Question Paper", url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2023_24/Accountancy-SQP.pdf" },
];

// Curated Competitive Exam & Olympiad Resources
const COMPETITIVE_RESOURCES = [
  { exam: "JEE Main", title: "JEE Main Syllabus, Information Bulletin & PYQ Portal", provider: "NTA", url: "https://jeemain.nta.nic.in/" },
  { exam: "NEET UG", title: "NEET (UG) Official Syllabus & Candidate Information Portal", provider: "NTA", url: "https://neet.nta.nic.in/" },
  { exam: "CUET UG", title: "CUET (UG) Common University Entrance Test Portal", provider: "NTA", url: "https://cuetug.ntaonline.in/" },
  { exam: "Science Olympiad", title: "Homi Bhabha Centre for Science Education (HBCSE) Olympiads", provider: "TIFR / HBCSE", url: "https://olympiads.hbcse.tifr.res.in/" },
  { exam: "Math Olympiad", title: "Indian Olympiad Qualifier in Mathematics (IOQM)", provider: "MTA(I)", url: "https://www.mtai.org.in/" },
  { exam: "KVS Regional", title: "PM SHRI KVS Coimbatore / Chennai Region Student Corner", provider: "KVS", url: "https://kvsangathan.nic.in/" },
];

const getBaseClass = (cls?: string) => {
  if (!cls) return "";
  const num = cls.replace(/[^0-9]/g, "");
  return num;
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700",
  Science: "bg-green-100 text-green-700",
  Physics: "bg-purple-100 text-purple-700",
  Chemistry: "bg-orange-100 text-orange-700",
  Biology: "bg-emerald-100 text-emerald-700",
  English: "bg-pink-100 text-pink-700",
  "Social Science": "bg-yellow-100 text-yellow-700",
  "CBSE Curriculum": "bg-indigo-100 text-indigo-700",
  General: "bg-slate-100 text-slate-700",
};

const formatGoogleDriveUrl = (url: string) => {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;
  try {
    let fileId = "";
    if (url.includes("/file/d/")) {
      const parts = url.split("/file/d/");
      if (parts[1]) {
        fileId = parts[1].split("/")[0].split("?")[0];
      }
    } else if (url.includes("open?id=")) {
      const parts = url.split("open?id=");
      if (parts[1]) {
        fileId = parts[1].split("&")[0];
      }
    }
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  } catch (e) {
    console.error("Error formatting Google Drive URL:", e);
  }
  return url;
};

const StudyMaterials = ({ studentClass }: { studentClass?: string }) => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dbNcert, setDbNcert] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterSubject, setFilterSubject] = useState("all");
  const [ncertBook, setNcertBook] = useState<{ name: string; chapters: { title: string; url: string }[] } | null>(null);
  const [cbseBook, setCbseBook] = useState<{ name: string; chapters: { title: string; url: string }[] } | null>(null);
  const [viewMaterial, setViewMaterial] = useState<{title: string, url: string, id?: string | null} | null>(null);
  const [readSeconds, setReadSeconds] = useState(0);
  const [readAward, setReadAward] = useState<number | null>(null);
  const [dbCbse, setDbCbse] = useState<any[]>([]);

  // Reading timer — awards XP for time spent studying a material
  useEffect(() => {
    if (!viewMaterial) return;
    setReadSeconds(0);
    setReadAward(null);
    const t = window.setInterval(() => setReadSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [viewMaterial]);

  const closeViewer = async () => {
    const secs = readSeconds;
    const mat = viewMaterial;
    setViewMaterial(null);
    if (!mat || secs < 60) return;
    const { data, error } = await supabase.rpc("award_material_reading", {
      p_material_id: mat.id ?? null,
      p_material_title: mat.title,
      p_seconds: secs,
    });
    if (error) return;
    const pts = Number(data) || 0;
    toast({
      title: pts > 0 ? `+${pts} XP for reading!` : "Reading time logged",
      description: `You studied "${mat.title}" for ${Math.floor(secs / 60)} min.`,
    });
  };


  const baseClass = getBaseClass(studentClass);

  useEffect(() => {
    (async () => {
      // 1. Fetch teacher materials
      const { data: mats } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      const allMats = (mats as Material[]) || [];
      const filteredMats = studentClass
        ? allMats.filter(m => !m.student_class || m.student_class === "All" || m.student_class === studentClass || m.student_class === baseClass)
        : allMats;
      setMaterials(filteredMats);

      // 2. Fetch NCERT books from Database
      try {
        const { data: ncert } = await supabase.from("ncert_books").select("*").eq("class_number", baseClass).order("chapter_number", { ascending: true });
        setDbNcert(ncert || []);
      } catch (e) {
        console.error("Error fetching ncert books:", e);
      }

      // 3. Fetch CBSE Curriculum from Database
      try {
        const { data: cbse } = await supabase.from("cbse_curriculum").select("*").order("chapter_number", { ascending: true });
        setDbCbse(cbse || []);
      } catch (e) {
        console.error("Error fetching cbse curriculum:", e);
      }

      setLoading(false);
    })();
  }, [studentClass, baseClass]);

  // Group NCERT books by subject (merge static fallback and database rows)
  const ncertForClass: Record<string, NcertBookData> = {};

  // Add DB items
  dbNcert.forEach((row) => {
    const sub = row.subject.replace(/(_Part\d| Part \d)/gi, "").trim();
    if (!ncertForClass[sub]) {
      ncertForClass[sub] = { name: `${sub} (Complete)`, chapters: [] };
    }
    const title = row.chapter_title?.trim() || `Chapter ${row.chapter_number || ncertForClass[sub].chapters.length + 1}`;
    if (!ncertForClass[sub].chapters.some(chapter => chapter.url === row.file_url || chapter.title.trim().toLowerCase() === title.toLowerCase())) {
      ncertForClass[sub].chapters.push({ title, url: row.file_url });
    }
  });

  // If no DB entries found, fall back to hardcoded data
  if (Object.keys(ncertForClass).length === 0 && FALLBACK_NCERT[baseClass]) {
    Object.entries(FALLBACK_NCERT[baseClass]).forEach(([sub, data]) => {
      ncertForClass[sub] = data;
    });
  }

  const hasNcert = Object.keys(ncertForClass).length > 0;

  // Separate regular Reference Materials vs CBSE Curriculum uploads
  const referenceMaterials = materials.filter(m => m.subject !== "CBSE Curriculum");
  const cbseUploads = materials.filter(m => m.subject === "CBSE Curriculum" && (!m.student_class || m.student_class === "All" || m.student_class === baseClass));

  const subjects = ["all", ...Array.from(new Set(referenceMaterials.map(m => m.subject || "General").filter(Boolean)))];

  let visibleReference = referenceMaterials.filter(m =>
    (!search.trim() || m.title.toLowerCase().includes(search.toLowerCase()) || (m.subject || "").toLowerCase().includes(search.toLowerCase())) &&
    (filterSubject === "all" || (m.subject || "General") === filterSubject)
  );

  if (sortBy === "newest") visibleReference = [...visibleReference].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === "oldest") visibleReference = [...visibleReference].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  else if (sortBy === "az") visibleReference = [...visibleReference].sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === "subject") visibleReference = [...visibleReference].sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Study Materials
        </h2>
        <p className="text-sm text-muted-foreground">Reference materials, CBSE curriculums, and NCERT textbooks.</p>
      </div>

      <Tabs defaultValue="materials">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="materials">Reference Materials</TabsTrigger>
          {hasNcert && <TabsTrigger value="ncert">NCERT Books (Class {baseClass})</TabsTrigger>}
          <TabsTrigger value="cbse">CBSE Curriculum</TabsTrigger>
          <TabsTrigger value="sqp">CBSE Sample Papers &amp; QB</TabsTrigger>
          <TabsTrigger value="competitive">Competitive &amp; Olympiads</TabsTrigger>
        </TabsList>

        {/* Reference Materials Tab */}
        <TabsContent value="materials" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject..." className="pl-9" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Subjects" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="subject">By Subject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : visibleReference.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              {search || filterSubject !== "all" ? "No matches. Try adjusting filters." : "No reference materials available yet."}
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleReference.map(m => (
                <Card key={m.id} className="hover-lift border-border/60 group">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{m.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {m.subject && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SUBJECT_COLORS[m.subject] || SUBJECT_COLORS.General}`}>
                            {m.subject}
                          </span>
                        )}
                        {m.student_class && m.student_class !== "All" && (
                          <span className="text-[10px] font-medium text-muted-foreground">Class {m.student_class}</span>
                        )}
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.description}</p>}
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" onClick={() => setViewMaterial({ title: m.title, url: m.file_url, id: m.id })}>
                          <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Open
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* NCERT Books Tab */}
        {hasNcert && (
          <TabsContent value="ncert" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Tap any subject to choose and download a specific chapter.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ncertForClass).map(([subject, bookData]) => (
                <Card
                  key={subject}
                  className="hover-lift cursor-pointer group border-border/60 hover:border-primary/40 hover:shadow-md transition-all"
                  onClick={() => setNcertBook(bookData)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg ${SUBJECT_COLORS[subject] || SUBJECT_COLORS.General}`}>
                      {subject[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{subject}</p>
                      <p className="text-xs text-muted-foreground">{bookData.chapters.length} chapters</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* CBSE Curriculum Tab */}
        <TabsContent value="cbse" className="mt-4 space-y-6">
          {/* DB + Official Card Grid */}
          {(() => {
            // Build CBSE curriculum cards from DB rows (grouped by subject) + static official links
            const cbseGroups: Record<string, { name: string; chapters: { title: string; url: string }[] }> = {};

            // Filter DB rows by class
            const filteredCbse = dbCbse.filter(row => !row.class_number || row.class_number === "All" || row.class_number === baseClass);

            filteredCbse.forEach((row) => {
              const sub = row.subject || row.category || "CBSE Resource";
              if (!cbseGroups[sub]) cbseGroups[sub] = { name: sub, chapters: [] };
              cbseGroups[sub].chapters.push({ title: row.chapter_title || row.title, url: row.file_url });
            });

            // Merge cbseUploads (teacher uploads subject=CBSE Curriculum, class is already filtered above)
            cbseUploads.forEach((m) => {
              const sub = m.title || "Teacher Upload";
              if (!cbseGroups[sub]) cbseGroups[sub] = { name: sub, chapters: [] };
              cbseGroups[sub].chapters.push({ title: m.description || m.title, url: m.file_url });
            });

            // Always include static official links as cards
            const allCards = [...Object.values(cbseGroups)];

            return (
              <>
                <p className="text-sm text-muted-foreground">Tap any resource to view or open a specific link or chapter.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCards.map((card, idx) => (
                    <Card
                      key={idx}
                      className="hover-lift cursor-pointer group border-border/60 hover:border-indigo-400/60 hover:shadow-md transition-all"
                      onClick={() => setCbseBook(card)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-black text-lg">
                          {card.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors line-clamp-1">{card.name}</p>
                          <p className="text-xs text-muted-foreground">{card.chapters.length} {card.chapters.length === 1 ? "link" : "items"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* CBSE Sample Papers & Question Banks Tab */}
        <TabsContent value="sqp" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Official CBSE Board Examination Sample Papers &amp; Marking Schemes.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {CBSE_BOARD_RESOURCES.map((res, i) => (
              <Card key={i} className="hover-lift border-border/60 group">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                        Class {res.class}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">{res.subject}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {res.title}
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 text-xs font-semibold"
                    onClick={() => window.open(res.url, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Competitive Exams & Olympiads Tab */}
        <TabsContent value="competitive" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Curated national entrance portals, syllabus bulletins, and Olympiad study resources for KV Sulur students.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {COMPETITIVE_RESOURCES.map((comp, i) => (
              <Card key={i} className="hover-lift border-border/60 group">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                        {comp.exam}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{comp.provider}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {comp.title}
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs font-semibold gradient-primary border-0"
                    onClick={() => window.open(comp.url, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Official Portal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Chapter picker popup for NCERT */}
      <Dialog open={!!ncertBook} onOpenChange={() => setNcertBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              {ncertBook?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {ncertBook?.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => {
                  if (ch.url.includes("ncert.nic.in")) window.open(ch.url, "_blank");
                  else setViewMaterial({ title: `${ncertBook.name} - ${ch.title}`, url: ch.url });
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group border border-transparent hover:border-border/60 text-left w-full"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">{ch.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter/Link picker popup for CBSE */}
      <Dialog open={!!cbseBook} onOpenChange={() => setCbseBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              {cbseBook?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {cbseBook?.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => {
                  if (ch.url.includes("ncert.nic.in") || ch.url.includes("cbseacademic.nic.in")) window.open(ch.url, "_blank");
                  else setViewMaterial({ title: `${cbseBook.name} - ${ch.title}`, url: ch.url });
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50/60 transition-colors group border border-transparent hover:border-indigo-200 text-left w-full"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground group-hover:text-indigo-600 transition-colors">{ch.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Material Viewer Popup */}
      <Dialog open={!!viewMaterial} onOpenChange={(o) => { if (!o) void closeViewer(); }}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-start gap-2 text-base font-bold text-foreground">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug text-left">{viewMaterial?.title}</span>
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="h-8 px-2.5 gap-1.5 font-mono text-xs">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  {String(Math.floor(readSeconds / 60)).padStart(2, "0")}:{String(readSeconds % 60).padStart(2, "0")}
                </Badge>
                {viewMaterial?.url?.toLowerCase().includes('.pdf') && (
                  <Button asChild variant="outline" size="sm" className="h-8">
                    <a href={viewMaterial.url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                )}
                {viewMaterial?.url && (
                  <Button asChild size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    <a href={viewMaterial.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span>Open Directly</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {viewMaterial?.url?.includes("drive.google.com") && (
              <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-2 rounded-lg mt-2 text-left font-medium leading-normal">
                ⚠️ If you see a &quot;You need access&quot; message from Google Drive below, please click the <strong>Open Directly</strong> button above to request access or sign in to your authorized student Google account.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground pt-1 text-left">
              Keep reading — you earn XP for every full minute you spend on this material.
            </p>

          </DialogHeader>
          <div className="flex-1 bg-muted/10 w-full h-full relative">
            {viewMaterial && (
              <iframe
                src={formatGoogleDriveUrl(viewMaterial.url)}
                className="w-full h-full border-0 absolute inset-0"
                title={viewMaterial.title}
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterials;
