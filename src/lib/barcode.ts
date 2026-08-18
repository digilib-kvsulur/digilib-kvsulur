// Code 39 barcode encoding — shared by book and student barcode generators
export const CODE39_ENCODING: Record<string, string> = {
  '0': 'N N N W W N W N N', '1': 'W N N W N N N N W', '2': 'N N W W N N N N W', '3': 'W N W W N N N N N',
  '4': 'N N N W W N N N W', '5': 'W N N W W N N N N', '6': 'N N W W W N N N N', '7': 'N N N W N N W N W',
  '8': 'W N N W N N W N N', '9': 'N N W W N N W N N', 'A': 'W N N N N W N N W', 'B': 'N N W N N W N N W',
  'C': 'W N W N N W N N N', 'D': 'N N N N W W N N W', 'E': 'W N N N W W N N N', 'F': 'N N W N W W N N N',
  'G': 'N N N N N W W N W', 'H': 'W N N N N W W N N', 'I': 'N N W N N W W N N', 'J': 'N N N N W W W N N',
  'K': 'W N N N N N N W W', 'L': 'N N W N N N N W W', 'M': 'W N W N N N N W N', 'N': 'N N N N W N N W W',
  'O': 'W N N N W N N W N', 'P': 'N N W N W N N W N', 'Q': 'N N N N N N W W W', 'R': 'W N N N N N W W N',
  'S': 'N N W N N N W W N', 'T': 'N N N N W N W W N', 'U': 'W W N N N N N N W', 'V': 'N W W N N N N N W',
  'W': 'W W W N N N N N N', 'X': 'N W N N W N N N W', 'Y': 'W W N N W N N N N', 'Z': 'N W W N W N N N N',
  '-': 'N W N N N N W N W', '.': 'W W N N N N W N N', ' ': 'N W W N N N W N N', '*': 'N W N N W N W N N',
  '$': 'N W N W N W N N N', '/': 'N W N W N N N W N', '+': 'N W N N N W N W N', '%': 'N N N W N W N W N',
};

export function sanitizeBarcodeValue(value: string): string {
  return String(value).toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, "");
}

/** Default student library card barcode from admission number */
export function defaultStudentBarcode(admissionNumber?: string | null): string {
  const adm = (admissionNumber || "").trim().toUpperCase();
  if (!adm) return "";
  return adm.startsWith("KVS-") ? adm : `KVS-${adm}`;
}

export interface BarcodeBar {
  x: number;
  width: number;
  isBlack: boolean;
}

export function buildCode39Bars(value: string): { bars: BarcodeBar[]; width: number; cleanVal: string } {
  const cleanVal = sanitizeBarcodeValue(value);
  if (!cleanVal) return { bars: [], width: 0, cleanVal: "" };

  const finalString = `*${cleanVal}*`;
  const bars: BarcodeBar[] = [];
  let currentX = 0;

  for (let i = 0; i < finalString.length; i++) {
    const char = finalString[i];
    const pattern = CODE39_ENCODING[char] || CODE39_ENCODING[' '];
    const elements = pattern.split(' ');

    for (let j = 0; j < elements.length; j++) {
      const isBlack = j % 2 === 0;
      const width = elements[j] === 'W' ? 3.0 : 1.0;
      bars.push({ x: currentX, width, isBlack });
      currentX += width;
    }
    bars.push({ x: currentX, width: 1.0, isBlack: false });
    currentX += 1.0;
  }

  return { bars, width: currentX, cleanVal };
}
