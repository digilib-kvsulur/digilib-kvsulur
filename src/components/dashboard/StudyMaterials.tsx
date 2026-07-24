import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Search, BookOpen, Loader2, ExternalLink, ChevronRight } from "lucide-react";

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

// NCERT chapter data per class and subject
const NCERT_DATA: Record<string, Record<string, { name: string; chapters: { title: string; url: string }[] }>> = {
  "6": {
    Mathematics: {
      name: "Mathematics – Class 6",
      chapters: [
        { title: "Chapter 1 – Knowing Our Numbers", url: "https://ncert.nic.in/textbook/pdf/femh101.pdf" },
        { title: "Chapter 2 – Whole Numbers", url: "https://ncert.nic.in/textbook/pdf/femh102.pdf" },
        { title: "Chapter 3 – Playing with Numbers", url: "https://ncert.nic.in/textbook/pdf/femh103.pdf" },
        { title: "Chapter 4 – Basic Geometrical Ideas", url: "https://ncert.nic.in/textbook/pdf/femh104.pdf" },
        { title: "Chapter 5 – Understanding Elementary Shapes", url: "https://ncert.nic.in/textbook/pdf/femh105.pdf" },
        { title: "Chapter 6 – Integers", url: "https://ncert.nic.in/textbook/pdf/femh106.pdf" },
        { title: "Chapter 7 – Fractions", url: "https://ncert.nic.in/textbook/pdf/femh107.pdf" },
        { title: "Chapter 8 – Decimals", url: "https://ncert.nic.in/textbook/pdf/femh108.pdf" },
        { title: "Chapter 9 – Data Handling", url: "https://ncert.nic.in/textbook/pdf/femh109.pdf" },
        { title: "Chapter 10 – Mensuration", url: "https://ncert.nic.in/textbook/pdf/femh110.pdf" },
        { title: "Chapter 11 – Algebra", url: "https://ncert.nic.in/textbook/pdf/femh111.pdf" },
        { title: "Chapter 12 – Ratio and Proportion", url: "https://ncert.nic.in/textbook/pdf/femh112.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 6",
      chapters: [
        { title: "Chapter 1 – Food: Where Does It Come From?", url: "https://ncert.nic.in/textbook/pdf/fesc101.pdf" },
        { title: "Chapter 2 – Components of Food", url: "https://ncert.nic.in/textbook/pdf/fesc102.pdf" },
        { title: "Chapter 3 – Fibre to Fabric", url: "https://ncert.nic.in/textbook/pdf/fesc103.pdf" },
        { title: "Chapter 4 – Sorting Materials into Groups", url: "https://ncert.nic.in/textbook/pdf/fesc104.pdf" },
        { title: "Chapter 5 – Separation of Substances", url: "https://ncert.nic.in/textbook/pdf/fesc105.pdf" },
        { title: "Chapter 6 – Changes Around Us", url: "https://ncert.nic.in/textbook/pdf/fesc106.pdf" },
        { title: "Chapter 7 – Getting to Know Plants", url: "https://ncert.nic.in/textbook/pdf/fesc107.pdf" },
        { title: "Chapter 8 – Body Movements", url: "https://ncert.nic.in/textbook/pdf/fesc108.pdf" },
        { title: "Chapter 9 – The Living Organisms", url: "https://ncert.nic.in/textbook/pdf/fesc109.pdf" },
        { title: "Chapter 10 – Motion and Measurement", url: "https://ncert.nic.in/textbook/pdf/fesc110.pdf" },
        { title: "Chapter 11 – Light, Shadows and Reflections", url: "https://ncert.nic.in/textbook/pdf/fesc111.pdf" },
        { title: "Chapter 12 – Electricity and Circuits", url: "https://ncert.nic.in/textbook/pdf/fesc112.pdf" },
        { title: "Chapter 13 – Fun with Magnets", url: "https://ncert.nic.in/textbook/pdf/fesc113.pdf" },
        { title: "Chapter 14 – Water", url: "https://ncert.nic.in/textbook/pdf/fesc114.pdf" },
        { title: "Chapter 15 – Air Around Us", url: "https://ncert.nic.in/textbook/pdf/fesc115.pdf" },
        { title: "Chapter 16 – Garbage In, Garbage Out", url: "https://ncert.nic.in/textbook/pdf/fesc116.pdf" },
      ],
    },
    "Social Science": {
      name: "Social Science – Class 6",
      chapters: [
        { title: "Our Pasts – Chapter 1: What, Where, How and When?", url: "https://ncert.nic.in/textbook/pdf/fess101.pdf" },
        { title: "The Earth – Our Habitat Ch 1: The Earth in the Solar System", url: "https://ncert.nic.in/textbook/pdf/fess201.pdf" },
        { title: "Social and Political Life Ch 1: Understanding Diversity", url: "https://ncert.nic.in/textbook/pdf/fess301.pdf" },
      ],
    },
    English: {
      name: "English – Class 6",
      chapters: [
        { title: "Honeysuckle – Chapter 1: Who Did Patrick's Homework?", url: "https://ncert.nic.in/textbook/pdf/feeh101.pdf" },
        { title: "Honeysuckle – Chapter 2: How the Dog Found Himself a Master", url: "https://ncert.nic.in/textbook/pdf/feeh102.pdf" },
        { title: "A Pact with the Sun – Story 1: A Tale of Two Birds", url: "https://ncert.nic.in/textbook/pdf/fees101.pdf" },
      ],
    },
  },
  "7": {
    Mathematics: {
      name: "Mathematics – Class 7",
      chapters: [
        { title: "Chapter 1 – Integers", url: "https://ncert.nic.in/textbook/pdf/gemh101.pdf" },
        { title: "Chapter 2 – Fractions and Decimals", url: "https://ncert.nic.in/textbook/pdf/gemh102.pdf" },
        { title: "Chapter 3 – Data Handling", url: "https://ncert.nic.in/textbook/pdf/gemh103.pdf" },
        { title: "Chapter 4 – Simple Equations", url: "https://ncert.nic.in/textbook/pdf/gemh104.pdf" },
        { title: "Chapter 5 – Lines and Angles", url: "https://ncert.nic.in/textbook/pdf/gemh105.pdf" },
        { title: "Chapter 6 – The Triangle and its Properties", url: "https://ncert.nic.in/textbook/pdf/gemh106.pdf" },
        { title: "Chapter 7 – Congruence of Triangles", url: "https://ncert.nic.in/textbook/pdf/gemh107.pdf" },
        { title: "Chapter 8 – Comparing Quantities", url: "https://ncert.nic.in/textbook/pdf/gemh108.pdf" },
        { title: "Chapter 9 – Rational Numbers", url: "https://ncert.nic.in/textbook/pdf/gemh109.pdf" },
        { title: "Chapter 10 – Practical Geometry", url: "https://ncert.nic.in/textbook/pdf/gemh110.pdf" },
        { title: "Chapter 11 – Perimeter and Area", url: "https://ncert.nic.in/textbook/pdf/gemh111.pdf" },
        { title: "Chapter 12 – Algebraic Expressions", url: "https://ncert.nic.in/textbook/pdf/gemh112.pdf" },
        { title: "Chapter 13 – Exponents and Powers", url: "https://ncert.nic.in/textbook/pdf/gemh113.pdf" },
        { title: "Chapter 14 – Symmetry", url: "https://ncert.nic.in/textbook/pdf/gemh114.pdf" },
        { title: "Chapter 15 – Visualising Solid Shapes", url: "https://ncert.nic.in/textbook/pdf/gemh115.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 7",
      chapters: [
        { title: "Chapter 1 – Nutrition in Plants", url: "https://ncert.nic.in/textbook/pdf/gesc101.pdf" },
        { title: "Chapter 2 – Nutrition in Animals", url: "https://ncert.nic.in/textbook/pdf/gesc102.pdf" },
        { title: "Chapter 3 – Fibre to Fabric", url: "https://ncert.nic.in/textbook/pdf/gesc103.pdf" },
        { title: "Chapter 4 – Heat", url: "https://ncert.nic.in/textbook/pdf/gesc104.pdf" },
        { title: "Chapter 5 – Acids, Bases and Salts", url: "https://ncert.nic.in/textbook/pdf/gesc105.pdf" },
        { title: "Chapter 6 – Physical and Chemical Changes", url: "https://ncert.nic.in/textbook/pdf/gesc106.pdf" },
        { title: "Chapter 7 – Weather, Climate and Adaptations", url: "https://ncert.nic.in/textbook/pdf/gesc107.pdf" },
        { title: "Chapter 8 – Winds, Storms and Cyclones", url: "https://ncert.nic.in/textbook/pdf/gesc108.pdf" },
        { title: "Chapter 9 – Soil", url: "https://ncert.nic.in/textbook/pdf/gesc109.pdf" },
        { title: "Chapter 10 – Respiration in Organisms", url: "https://ncert.nic.in/textbook/pdf/gesc110.pdf" },
        { title: "Chapter 11 – Transportation in Animals and Plants", url: "https://ncert.nic.in/textbook/pdf/gesc111.pdf" },
        { title: "Chapter 12 – Reproduction in Plants", url: "https://ncert.nic.in/textbook/pdf/gesc112.pdf" },
        { title: "Chapter 13 – Motion and Time", url: "https://ncert.nic.in/textbook/pdf/gesc113.pdf" },
        { title: "Chapter 14 – Electric Current and its Effects", url: "https://ncert.nic.in/textbook/pdf/gesc114.pdf" },
        { title: "Chapter 15 – Light", url: "https://ncert.nic.in/textbook/pdf/gesc115.pdf" },
        { title: "Chapter 16 – Water: A Precious Resource", url: "https://ncert.nic.in/textbook/pdf/gesc116.pdf" },
        { title: "Chapter 17 – Forests: Our Lifeline", url: "https://ncert.nic.in/textbook/pdf/gesc117.pdf" },
        { title: "Chapter 18 – Wastewater Story", url: "https://ncert.nic.in/textbook/pdf/gesc118.pdf" },
      ],
    },
  },
  "8": {
    Mathematics: {
      name: "Mathematics – Class 8",
      chapters: [
        { title: "Chapter 1 – Rational Numbers", url: "https://ncert.nic.in/textbook/pdf/hemh101.pdf" },
        { title: "Chapter 2 – Linear Equations in One Variable", url: "https://ncert.nic.in/textbook/pdf/hemh102.pdf" },
        { title: "Chapter 3 – Understanding Quadrilaterals", url: "https://ncert.nic.in/textbook/pdf/hemh103.pdf" },
        { title: "Chapter 4 – Practical Geometry", url: "https://ncert.nic.in/textbook/pdf/hemh104.pdf" },
        { title: "Chapter 5 – Data Handling", url: "https://ncert.nic.in/textbook/pdf/hemh105.pdf" },
        { title: "Chapter 6 – Squares and Square Roots", url: "https://ncert.nic.in/textbook/pdf/hemh106.pdf" },
        { title: "Chapter 7 – Cubes and Cube Roots", url: "https://ncert.nic.in/textbook/pdf/hemh107.pdf" },
        { title: "Chapter 8 – Comparing Quantities", url: "https://ncert.nic.in/textbook/pdf/hemh108.pdf" },
        { title: "Chapter 9 – Algebraic Expressions and Identities", url: "https://ncert.nic.in/textbook/pdf/hemh109.pdf" },
        { title: "Chapter 10 – Visualising Solid Shapes", url: "https://ncert.nic.in/textbook/pdf/hemh110.pdf" },
        { title: "Chapter 11 – Mensuration", url: "https://ncert.nic.in/textbook/pdf/hemh111.pdf" },
        { title: "Chapter 12 – Exponents and Powers", url: "https://ncert.nic.in/textbook/pdf/hemh112.pdf" },
        { title: "Chapter 13 – Direct and Inverse Proportions", url: "https://ncert.nic.in/textbook/pdf/hemh113.pdf" },
        { title: "Chapter 14 – Factorisation", url: "https://ncert.nic.in/textbook/pdf/hemh114.pdf" },
        { title: "Chapter 15 – Introduction to Graphs", url: "https://ncert.nic.in/textbook/pdf/hemh115.pdf" },
        { title: "Chapter 16 – Playing with Numbers", url: "https://ncert.nic.in/textbook/pdf/hemh116.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 8",
      chapters: [
        { title: "Chapter 1 – Crop Production and Management", url: "https://ncert.nic.in/textbook/pdf/hesc101.pdf" },
        { title: "Chapter 2 – Microorganisms", url: "https://ncert.nic.in/textbook/pdf/hesc102.pdf" },
        { title: "Chapter 3 – Synthetic Fibres and Plastics", url: "https://ncert.nic.in/textbook/pdf/hesc103.pdf" },
        { title: "Chapter 4 – Materials: Metals and Non-Metals", url: "https://ncert.nic.in/textbook/pdf/hesc104.pdf" },
        { title: "Chapter 5 – Coal and Petroleum", url: "https://ncert.nic.in/textbook/pdf/hesc105.pdf" },
        { title: "Chapter 6 – Combustion and Flame", url: "https://ncert.nic.in/textbook/pdf/hesc106.pdf" },
        { title: "Chapter 7 – Conservation of Plants and Animals", url: "https://ncert.nic.in/textbook/pdf/hesc107.pdf" },
        { title: "Chapter 8 – Cell – Structure and Functions", url: "https://ncert.nic.in/textbook/pdf/hesc108.pdf" },
        { title: "Chapter 9 – Reproduction in Animals", url: "https://ncert.nic.in/textbook/pdf/hesc109.pdf" },
        { title: "Chapter 10 – Reaching the Age of Adolescence", url: "https://ncert.nic.in/textbook/pdf/hesc110.pdf" },
        { title: "Chapter 11 – Force and Pressure", url: "https://ncert.nic.in/textbook/pdf/hesc111.pdf" },
        { title: "Chapter 12 – Friction", url: "https://ncert.nic.in/textbook/pdf/hesc112.pdf" },
        { title: "Chapter 13 – Sound", url: "https://ncert.nic.in/textbook/pdf/hesc113.pdf" },
        { title: "Chapter 14 – Chemical Effects of Electric Current", url: "https://ncert.nic.in/textbook/pdf/hesc114.pdf" },
        { title: "Chapter 15 – Some Natural Phenomena", url: "https://ncert.nic.in/textbook/pdf/hesc115.pdf" },
        { title: "Chapter 16 – Light", url: "https://ncert.nic.in/textbook/pdf/hesc116.pdf" },
        { title: "Chapter 17 – Stars and the Solar System", url: "https://ncert.nic.in/textbook/pdf/hesc117.pdf" },
        { title: "Chapter 18 – Pollution of Air and Water", url: "https://ncert.nic.in/textbook/pdf/hesc118.pdf" },
      ],
    },
  },
  "9": {
    Mathematics: {
      name: "Mathematics – Class 9",
      chapters: [
        { title: "Chapter 1 – Number Systems", url: "https://ncert.nic.in/textbook/pdf/iemh101.pdf" },
        { title: "Chapter 2 – Polynomials", url: "https://ncert.nic.in/textbook/pdf/iemh102.pdf" },
        { title: "Chapter 3 – Coordinate Geometry", url: "https://ncert.nic.in/textbook/pdf/iemh103.pdf" },
        { title: "Chapter 4 – Linear Equations in Two Variables", url: "https://ncert.nic.in/textbook/pdf/iemh104.pdf" },
        { title: "Chapter 5 – Introduction to Euclid's Geometry", url: "https://ncert.nic.in/textbook/pdf/iemh105.pdf" },
        { title: "Chapter 6 – Lines and Angles", url: "https://ncert.nic.in/textbook/pdf/iemh106.pdf" },
        { title: "Chapter 7 – Triangles", url: "https://ncert.nic.in/textbook/pdf/iemh107.pdf" },
        { title: "Chapter 8 – Quadrilaterals", url: "https://ncert.nic.in/textbook/pdf/iemh108.pdf" },
        { title: "Chapter 9 – Areas of Parallelograms and Triangles", url: "https://ncert.nic.in/textbook/pdf/iemh109.pdf" },
        { title: "Chapter 10 – Circles", url: "https://ncert.nic.in/textbook/pdf/iemh110.pdf" },
        { title: "Chapter 11 – Constructions", url: "https://ncert.nic.in/textbook/pdf/iemh111.pdf" },
        { title: "Chapter 12 – Heron's Formula", url: "https://ncert.nic.in/textbook/pdf/iemh112.pdf" },
        { title: "Chapter 13 – Surface Areas and Volumes", url: "https://ncert.nic.in/textbook/pdf/iemh113.pdf" },
        { title: "Chapter 14 – Statistics", url: "https://ncert.nic.in/textbook/pdf/iemh114.pdf" },
        { title: "Chapter 15 – Probability", url: "https://ncert.nic.in/textbook/pdf/iemh115.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 9",
      chapters: [
        { title: "Chapter 1 – Matter in Our Surroundings", url: "https://ncert.nic.in/textbook/pdf/iesc101.pdf" },
        { title: "Chapter 2 – Is Matter Around Us Pure?", url: "https://ncert.nic.in/textbook/pdf/iesc102.pdf" },
        { title: "Chapter 3 – Atoms and Molecules", url: "https://ncert.nic.in/textbook/pdf/iesc103.pdf" },
        { title: "Chapter 4 – Structure of the Atom", url: "https://ncert.nic.in/textbook/pdf/iesc104.pdf" },
        { title: "Chapter 5 – The Fundamental Unit of Life", url: "https://ncert.nic.in/textbook/pdf/iesc105.pdf" },
        { title: "Chapter 6 – Tissues", url: "https://ncert.nic.in/textbook/pdf/iesc106.pdf" },
        { title: "Chapter 7 – Diversity in Living Organisms", url: "https://ncert.nic.in/textbook/pdf/iesc107.pdf" },
        { title: "Chapter 8 – Motion", url: "https://ncert.nic.in/textbook/pdf/iesc108.pdf" },
        { title: "Chapter 9 – Force and Laws of Motion", url: "https://ncert.nic.in/textbook/pdf/iesc109.pdf" },
        { title: "Chapter 10 – Gravitation", url: "https://ncert.nic.in/textbook/pdf/iesc110.pdf" },
        { title: "Chapter 11 – Work and Energy", url: "https://ncert.nic.in/textbook/pdf/iesc111.pdf" },
        { title: "Chapter 12 – Sound", url: "https://ncert.nic.in/textbook/pdf/iesc112.pdf" },
        { title: "Chapter 13 – Why Do We Fall Ill?", url: "https://ncert.nic.in/textbook/pdf/iesc113.pdf" },
        { title: "Chapter 14 – Natural Resources", url: "https://ncert.nic.in/textbook/pdf/iesc114.pdf" },
        { title: "Chapter 15 – Improvement in Food Resources", url: "https://ncert.nic.in/textbook/pdf/iesc115.pdf" },
      ],
    },
    "Social Science": {
      name: "Social Science – Class 9",
      chapters: [
        { title: "India and the Contemporary World – Chapter 1", url: "https://ncert.nic.in/textbook/pdf/jess101.pdf" },
        { title: "Contemporary India – Chapter 1: India – Size and Location", url: "https://ncert.nic.in/textbook/pdf/jess201.pdf" },
        { title: "Democratic Politics – Chapter 1: What is Democracy?", url: "https://ncert.nic.in/textbook/pdf/jess301.pdf" },
        { title: "Economics – Chapter 1: The Story of Village Palampur", url: "https://ncert.nic.in/textbook/pdf/jess401.pdf" },
      ],
    },
    English: {
      name: "English – Class 9",
      chapters: [
        { title: "Beehive – Chapter 1: The Fun They Had", url: "https://ncert.nic.in/textbook/pdf/jeeh101.pdf" },
        { title: "Moments – Chapter 1: The Lost Child", url: "https://ncert.nic.in/textbook/pdf/jeen101.pdf" },
      ],
    },
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
        { title: "Chapter 11 – Constructions", url: "https://ncert.nic.in/textbook/pdf/jemh111.pdf" },
        { title: "Chapter 12 – Areas Related to Circles", url: "https://ncert.nic.in/textbook/pdf/jemh112.pdf" },
        { title: "Chapter 13 – Surface Areas and Volumes", url: "https://ncert.nic.in/textbook/pdf/jemh113.pdf" },
        { title: "Chapter 14 – Statistics", url: "https://ncert.nic.in/textbook/pdf/jemh114.pdf" },
        { title: "Chapter 15 – Probability", url: "https://ncert.nic.in/textbook/pdf/jemh115.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 10",
      chapters: [
        { title: "Chapter 1 – Chemical Reactions and Equations", url: "https://ncert.nic.in/textbook/pdf/jesc101.pdf" },
        { title: "Chapter 2 – Acids, Bases and Salts", url: "https://ncert.nic.in/textbook/pdf/jesc102.pdf" },
        { title: "Chapter 3 – Metals and Non-metals", url: "https://ncert.nic.in/textbook/pdf/jesc103.pdf" },
        { title: "Chapter 4 – Carbon and its Compounds", url: "https://ncert.nic.in/textbook/pdf/jesc104.pdf" },
        { title: "Chapter 5 – Periodic Classification of Elements", url: "https://ncert.nic.in/textbook/pdf/jesc105.pdf" },
        { title: "Chapter 6 – Life Processes", url: "https://ncert.nic.in/textbook/pdf/jesc106.pdf" },
        { title: "Chapter 7 – Control and Coordination", url: "https://ncert.nic.in/textbook/pdf/jesc107.pdf" },
        { title: "Chapter 8 – How do Organisms Reproduce?", url: "https://ncert.nic.in/textbook/pdf/jesc108.pdf" },
        { title: "Chapter 9 – Heredity and Evolution", url: "https://ncert.nic.in/textbook/pdf/jesc109.pdf" },
        { title: "Chapter 10 – Light – Reflection and Refraction", url: "https://ncert.nic.in/textbook/pdf/jesc110.pdf" },
        { title: "Chapter 11 – Human Eye and the Colourful World", url: "https://ncert.nic.in/textbook/pdf/jesc111.pdf" },
        { title: "Chapter 12 – Electricity", url: "https://ncert.nic.in/textbook/pdf/jesc112.pdf" },
        { title: "Chapter 13 – Magnetic Effects of Electric Current", url: "https://ncert.nic.in/textbook/pdf/jesc113.pdf" },
        { title: "Chapter 14 – Sources of Energy", url: "https://ncert.nic.in/textbook/pdf/jesc114.pdf" },
        { title: "Chapter 15 – Our Environment", url: "https://ncert.nic.in/textbook/pdf/jesc115.pdf" },
        { title: "Chapter 16 – Sustainable Management of Natural Resources", url: "https://ncert.nic.in/textbook/pdf/jesc116.pdf" },
      ],
    },
  },
  "11": {
    Mathematics: {
      name: "Mathematics – Class 11",
      chapters: [
        { title: "Chapter 1 – Sets", url: "https://ncert.nic.in/textbook/pdf/kemh101.pdf" },
        { title: "Chapter 2 – Relations and Functions", url: "https://ncert.nic.in/textbook/pdf/kemh102.pdf" },
        { title: "Chapter 3 – Trigonometric Functions", url: "https://ncert.nic.in/textbook/pdf/kemh103.pdf" },
        { title: "Chapter 4 – Principle of Mathematical Induction", url: "https://ncert.nic.in/textbook/pdf/kemh104.pdf" },
        { title: "Chapter 5 – Complex Numbers and Quadratic Equations", url: "https://ncert.nic.in/textbook/pdf/kemh105.pdf" },
        { title: "Chapter 6 – Linear Inequalities", url: "https://ncert.nic.in/textbook/pdf/kemh106.pdf" },
        { title: "Chapter 7 – Permutations and Combinations", url: "https://ncert.nic.in/textbook/pdf/kemh107.pdf" },
        { title: "Chapter 8 – Binomial Theorem", url: "https://ncert.nic.in/textbook/pdf/kemh108.pdf" },
        { title: "Chapter 9 – Sequences and Series", url: "https://ncert.nic.in/textbook/pdf/kemh109.pdf" },
        { title: "Chapter 10 – Straight Lines", url: "https://ncert.nic.in/textbook/pdf/kemh110.pdf" },
        { title: "Chapter 11 – Conic Sections", url: "https://ncert.nic.in/textbook/pdf/kemh111.pdf" },
        { title: "Chapter 12 – Introduction to 3D Geometry", url: "https://ncert.nic.in/textbook/pdf/kemh112.pdf" },
        { title: "Chapter 13 – Limits and Derivatives", url: "https://ncert.nic.in/textbook/pdf/kemh113.pdf" },
        { title: "Chapter 14 – Mathematical Reasoning", url: "https://ncert.nic.in/textbook/pdf/kemh114.pdf" },
        { title: "Chapter 15 – Statistics", url: "https://ncert.nic.in/textbook/pdf/kemh115.pdf" },
        { title: "Chapter 16 – Probability", url: "https://ncert.nic.in/textbook/pdf/kemh116.pdf" },
      ],
    },
    Physics: {
      name: "Physics Part I & II – Class 11",
      chapters: [
        { title: "Chapter 1 – Physical World", url: "https://ncert.nic.in/textbook/pdf/keph101.pdf" },
        { title: "Chapter 2 – Units and Measurements", url: "https://ncert.nic.in/textbook/pdf/keph102.pdf" },
        { title: "Chapter 3 – Motion in a Straight Line", url: "https://ncert.nic.in/textbook/pdf/keph103.pdf" },
        { title: "Chapter 4 – Motion in a Plane", url: "https://ncert.nic.in/textbook/pdf/keph104.pdf" },
        { title: "Chapter 5 – Laws of Motion", url: "https://ncert.nic.in/textbook/pdf/keph105.pdf" },
        { title: "Chapter 6 – Work, Energy and Power", url: "https://ncert.nic.in/textbook/pdf/keph106.pdf" },
        { title: "Chapter 7 – System of Particles and Rotational Motion", url: "https://ncert.nic.in/textbook/pdf/keph107.pdf" },
        { title: "Chapter 8 – Gravitation", url: "https://ncert.nic.in/textbook/pdf/keph108.pdf" },
        { title: "Chapter 9 – Mechanical Properties of Solids", url: "https://ncert.nic.in/textbook/pdf/keph109.pdf" },
        { title: "Chapter 10 – Mechanical Properties of Fluids", url: "https://ncert.nic.in/textbook/pdf/keph110.pdf" },
        { title: "Chapter 11 – Thermal Properties of Matter", url: "https://ncert.nic.in/textbook/pdf/keph111.pdf" },
        { title: "Chapter 12 – Thermodynamics", url: "https://ncert.nic.in/textbook/pdf/keph112.pdf" },
        { title: "Chapter 13 – Kinetic Theory", url: "https://ncert.nic.in/textbook/pdf/keph113.pdf" },
        { title: "Chapter 14 – Oscillations", url: "https://ncert.nic.in/textbook/pdf/keph114.pdf" },
        { title: "Chapter 15 – Waves", url: "https://ncert.nic.in/textbook/pdf/keph115.pdf" },
      ],
    },
    Chemistry: {
      name: "Chemistry Part I & II – Class 11",
      chapters: [
        { title: "Chapter 1 – Some Basic Concepts of Chemistry", url: "https://ncert.nic.in/textbook/pdf/kech101.pdf" },
        { title: "Chapter 2 – Structure of Atom", url: "https://ncert.nic.in/textbook/pdf/kech102.pdf" },
        { title: "Chapter 3 – Classification of Elements", url: "https://ncert.nic.in/textbook/pdf/kech103.pdf" },
        { title: "Chapter 4 – Chemical Bonding and Molecular Structure", url: "https://ncert.nic.in/textbook/pdf/kech104.pdf" },
        { title: "Chapter 5 – States of Matter", url: "https://ncert.nic.in/textbook/pdf/kech105.pdf" },
        { title: "Chapter 6 – Thermodynamics", url: "https://ncert.nic.in/textbook/pdf/kech106.pdf" },
        { title: "Chapter 7 – Equilibrium", url: "https://ncert.nic.in/textbook/pdf/kech107.pdf" },
        { title: "Chapter 8 – Redox Reactions", url: "https://ncert.nic.in/textbook/pdf/kech108.pdf" },
        { title: "Chapter 9 – Hydrogen", url: "https://ncert.nic.in/textbook/pdf/kech109.pdf" },
        { title: "Chapter 10 – The s-Block Elements", url: "https://ncert.nic.in/textbook/pdf/kech110.pdf" },
        { title: "Chapter 11 – The p-Block Elements", url: "https://ncert.nic.in/textbook/pdf/kech111.pdf" },
        { title: "Chapter 12 – Organic Chemistry", url: "https://ncert.nic.in/textbook/pdf/kech112.pdf" },
        { title: "Chapter 13 – Hydrocarbons", url: "https://ncert.nic.in/textbook/pdf/kech113.pdf" },
        { title: "Chapter 14 – Environmental Chemistry", url: "https://ncert.nic.in/textbook/pdf/kech114.pdf" },
      ],
    },
    Biology: {
      name: "Biology – Class 11",
      chapters: [
        { title: "Chapter 1 – The Living World", url: "https://ncert.nic.in/textbook/pdf/kebo101.pdf" },
        { title: "Chapter 2 – Biological Classification", url: "https://ncert.nic.in/textbook/pdf/kebo102.pdf" },
        { title: "Chapter 3 – Plant Kingdom", url: "https://ncert.nic.in/textbook/pdf/kebo103.pdf" },
        { title: "Chapter 4 – Animal Kingdom", url: "https://ncert.nic.in/textbook/pdf/kebo104.pdf" },
        { title: "Chapter 5 – Morphology of Flowering Plants", url: "https://ncert.nic.in/textbook/pdf/kebo105.pdf" },
        { title: "Chapter 6 – Anatomy of Flowering Plants", url: "https://ncert.nic.in/textbook/pdf/kebo106.pdf" },
        { title: "Chapter 7 – Structural Organisation in Animals", url: "https://ncert.nic.in/textbook/pdf/kebo107.pdf" },
        { title: "Chapter 8 – Cell: The Unit of Life", url: "https://ncert.nic.in/textbook/pdf/kebo108.pdf" },
        { title: "Chapter 9 – Biomolecules", url: "https://ncert.nic.in/textbook/pdf/kebo109.pdf" },
        { title: "Chapter 10 – Cell Cycle and Cell Division", url: "https://ncert.nic.in/textbook/pdf/kebo110.pdf" },
        { title: "Chapter 11 – Transport in Plants", url: "https://ncert.nic.in/textbook/pdf/kebo111.pdf" },
        { title: "Chapter 12 – Mineral Nutrition", url: "https://ncert.nic.in/textbook/pdf/kebo112.pdf" },
        { title: "Chapter 13 – Photosynthesis in Higher Plants", url: "https://ncert.nic.in/textbook/pdf/kebo113.pdf" },
        { title: "Chapter 14 – Respiration in Plants", url: "https://ncert.nic.in/textbook/pdf/kebo114.pdf" },
        { title: "Chapter 15 – Plant Growth and Development", url: "https://ncert.nic.in/textbook/pdf/kebo115.pdf" },
        { title: "Chapter 16 – Digestion and Absorption", url: "https://ncert.nic.in/textbook/pdf/kebo116.pdf" },
        { title: "Chapter 17 – Breathing and Exchange of Gases", url: "https://ncert.nic.in/textbook/pdf/kebo117.pdf" },
        { title: "Chapter 18 – Body Fluids and Circulation", url: "https://ncert.nic.in/textbook/pdf/kebo118.pdf" },
        { title: "Chapter 19 – Excretory Products and Elimination", url: "https://ncert.nic.in/textbook/pdf/kebo119.pdf" },
        { title: "Chapter 20 – Locomotion and Movement", url: "https://ncert.nic.in/textbook/pdf/kebo120.pdf" },
        { title: "Chapter 21 – Neural Control and Coordination", url: "https://ncert.nic.in/textbook/pdf/kebo121.pdf" },
        { title: "Chapter 22 – Chemical Coordination and Integration", url: "https://ncert.nic.in/textbook/pdf/kebo122.pdf" },
      ],
    },
  },
  "12": {
    Mathematics: {
      name: "Mathematics Part I & II – Class 12",
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
      ],
    },
    Physics: {
      name: "Physics Part I & II – Class 12",
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
      ],
    },
    Chemistry: {
      name: "Chemistry Part I & II – Class 12",
      chapters: [
        { title: "Chapter 1 – The Solid State", url: "https://ncert.nic.in/textbook/pdf/lech101.pdf" },
        { title: "Chapter 2 – Solutions", url: "https://ncert.nic.in/textbook/pdf/lech102.pdf" },
        { title: "Chapter 3 – Electrochemistry", url: "https://ncert.nic.in/textbook/pdf/lech103.pdf" },
        { title: "Chapter 4 – Chemical Kinetics", url: "https://ncert.nic.in/textbook/pdf/lech104.pdf" },
        { title: "Chapter 5 – Surface Chemistry", url: "https://ncert.nic.in/textbook/pdf/lech105.pdf" },
        { title: "Chapter 6 – General Principles and Processes", url: "https://ncert.nic.in/textbook/pdf/lech106.pdf" },
        { title: "Chapter 7 – The p-Block Elements", url: "https://ncert.nic.in/textbook/pdf/lech107.pdf" },
        { title: "Chapter 8 – The d and f Block Elements", url: "https://ncert.nic.in/textbook/pdf/lech108.pdf" },
        { title: "Chapter 9 – Coordination Compounds", url: "https://ncert.nic.in/textbook/pdf/lech109.pdf" },
        { title: "Chapter 10 – Haloalkanes and Haloarenes", url: "https://ncert.nic.in/textbook/pdf/lech201.pdf" },
        { title: "Chapter 11 – Alcohols, Phenols and Ethers", url: "https://ncert.nic.in/textbook/pdf/lech202.pdf" },
        { title: "Chapter 12 – Aldehydes, Ketones and Carboxylic Acids", url: "https://ncert.nic.in/textbook/pdf/lech203.pdf" },
        { title: "Chapter 13 – Amines", url: "https://ncert.nic.in/textbook/pdf/lech204.pdf" },
        { title: "Chapter 14 – Biomolecules", url: "https://ncert.nic.in/textbook/pdf/lech205.pdf" },
        { title: "Chapter 15 – Polymers", url: "https://ncert.nic.in/textbook/pdf/lech206.pdf" },
        { title: "Chapter 16 – Chemistry in Everyday Life", url: "https://ncert.nic.in/textbook/pdf/lech207.pdf" },
      ],
    },
    Biology: {
      name: "Biology – Class 12",
      chapters: [
        { title: "Chapter 1 – Reproduction in Organisms", url: "https://ncert.nic.in/textbook/pdf/lebo101.pdf" },
        { title: "Chapter 2 – Sexual Reproduction in Flowering Plants", url: "https://ncert.nic.in/textbook/pdf/lebo102.pdf" },
        { title: "Chapter 3 – Human Reproduction", url: "https://ncert.nic.in/textbook/pdf/lebo103.pdf" },
        { title: "Chapter 4 – Reproductive Health", url: "https://ncert.nic.in/textbook/pdf/lebo104.pdf" },
        { title: "Chapter 5 – Principles of Inheritance and Variation", url: "https://ncert.nic.in/textbook/pdf/lebo105.pdf" },
        { title: "Chapter 6 – Molecular Basis of Inheritance", url: "https://ncert.nic.in/textbook/pdf/lebo106.pdf" },
        { title: "Chapter 7 – Evolution", url: "https://ncert.nic.in/textbook/pdf/lebo107.pdf" },
        { title: "Chapter 8 – Human Health and Disease", url: "https://ncert.nic.in/textbook/pdf/lebo108.pdf" },
        { title: "Chapter 9 – Strategies for Enhancement in Food Production", url: "https://ncert.nic.in/textbook/pdf/lebo109.pdf" },
        { title: "Chapter 10 – Microbes in Human Welfare", url: "https://ncert.nic.in/textbook/pdf/lebo110.pdf" },
        { title: "Chapter 11 – Biotechnology: Principles and Processes", url: "https://ncert.nic.in/textbook/pdf/lebo111.pdf" },
        { title: "Chapter 12 – Biotechnology and its Applications", url: "https://ncert.nic.in/textbook/pdf/lebo112.pdf" },
        { title: "Chapter 13 – Organisms and Populations", url: "https://ncert.nic.in/textbook/pdf/lebo113.pdf" },
        { title: "Chapter 14 – Ecosystem", url: "https://ncert.nic.in/textbook/pdf/lebo114.pdf" },
        { title: "Chapter 15 – Biodiversity and Conservation", url: "https://ncert.nic.in/textbook/pdf/lebo115.pdf" },
        { title: "Chapter 16 – Environmental Issues", url: "https://ncert.nic.in/textbook/pdf/lebo116.pdf" },
      ],
    },
  },
};

// Get base class (strip section letter)
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
  Hindi: "bg-red-100 text-red-700",
  General: "bg-slate-100 text-slate-700",
};

const StudyMaterials = ({ studentClass }: { studentClass?: string }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterSubject, setFilterSubject] = useState("all");
  const [ncertBook, setNcertBook] = useState<{ name: string; chapters: { title: string; url: string }[] } | null>(null);

  const baseClass = getBaseClass(studentClass);
  const ncertForClass = NCERT_DATA[baseClass] || {};
  const hasNcert = Object.keys(ncertForClass).length > 0;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      const all = (data as Material[]) || [];
      const filtered = studentClass
        ? all.filter(m => !m.student_class || m.student_class === "All" || m.student_class === studentClass || m.student_class === baseClass)
        : all;
      setMaterials(filtered);
      setLoading(false);
    })();
  }, [studentClass]);

  const subjects = ["all", ...Array.from(new Set(materials.map(m => m.subject || "General").filter(Boolean)))];

  let visible = materials.filter(m =>
    (!search.trim() || m.title.toLowerCase().includes(search.toLowerCase()) || (m.subject || "").toLowerCase().includes(search.toLowerCase())) &&
    (filterSubject === "all" || (m.subject || "General") === filterSubject)
  );

  if (sortBy === "newest") visible = [...visible].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === "oldest") visible = [...visible].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  else if (sortBy === "az") visible = [...visible].sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === "subject") visible = [...visible].sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Study Materials
        </h2>
        <p className="text-sm text-muted-foreground">Resources from your teachers {hasNcert && "and NCERT textbook chapters"}.</p>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">📄 Teacher Materials</TabsTrigger>
          {hasNcert && <TabsTrigger value="ncert">📚 NCERT Books (Class {baseClass})</TabsTrigger>}
        </TabsList>

        {/* Teacher Materials Tab */}
        <TabsContent value="materials" className="space-y-4 mt-4">
          {/* Filters */}
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
          ) : visible.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              {search || filterSubject !== "all" ? "No matches. Try adjusting filters." : "No study materials available yet."}
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map(m => (
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
                      <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3 mr-1" /> Open
                        </a>
                      </Button>
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
      </Tabs>

      {/* Chapter picker popup */}
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
              <a
                key={i}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group border border-transparent hover:border-border/60"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">{ch.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterials;
