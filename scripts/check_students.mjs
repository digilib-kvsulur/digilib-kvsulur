const url = 'https://oebshkijofsusugrslii.supabase.co/rest/v1/profiles?select=id,first_name,last_name,email,student_class,admission_number,roll_number,library_card_barcode,phone,points,is_approved,created_at&role=eq.student&limit=50';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYnNoa2lqb2ZzdXN1Z3JzbGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MzU0MDEsImV4cCI6MjEwNTMxMTQwMX0.ygySo3BgkYp_lIRT_81x7gayL5nR2vpuE8OBLH2A5KY';

async function main() {
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const data = await res.json();
  console.log('Total fetched:', data.length);
  console.log('Sample full record:');
  console.log(JSON.stringify(data[0], null, 2));

  // Count non-numeric admission numbers:
  let numericAdmCount = 0;
  let nonNumericAdmCount = 0;
  let nullAdmCount = 0;
  data.forEach(s => {
    if (!s.admission_number) nullAdmCount++;
    else if (/^\d+$/.test(s.admission_number.trim())) numericAdmCount++;
    else nonNumericAdmCount++;
  });
  console.log({ numericAdmCount, nonNumericAdmCount, nullAdmCount });

  // Check roll numbers
  const hasRoll = data.filter(s => s.roll_number && s.roll_number.trim());
  console.log('Has roll number count:', hasRoll.length);
}

main();
