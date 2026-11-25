-- Evergreen Skills Lab and Career Hub content.
-- Safe to re-run: rows are matched by slug and updated in place.

INSERT INTO public.skill_tracks (slug, title, summary, description, icon, accent, min_class, max_class, sort_order, published)
VALUES
  ('digital-literacy', 'Digital Literacy & AI', 'Use the internet, AI tools, and your accounts safely and smartly.', 'A practical track for every class: how the web works, how to check what you read, how AI models behave, and how to protect your privacy.', 'ShieldCheck', '#0ea5e9', '6', '12', 1, true),
  ('coding-foundations', 'Coding Foundations', 'Learn to think in steps, then turn those steps into JavaScript.', 'Start from zero. Build the mental model behind every programming language with short lessons and runnable challenges.', 'Code2', '#6366f1', '6', '12', 2, true),
  ('web-studio', 'Web Studio', 'Build real pages with HTML, CSS, and JavaScript.', 'A project-based track for classes 8 to 12. Create an accessible personal page and publish it for the world.', 'Globe2', '#f59e0b', '8', '12', 3, true),
  ('data-and-ai', 'Data & AI Explorers', 'Turn numbers into decisions and understand what AI can and cannot do.', 'For classes 9 to 12: charts, spreadsheets, machine-learning intuition, and the ethics of automated decisions.', 'BarChart3', '#10b981', '9', '12', 4, true),
  ('career-readiness', 'Career Readiness', 'Resumes, interviews, teamwork, and money basics.', 'The professional habits schools rarely teach. Short lessons you can use for internships, college applications, and first jobs.', 'Briefcase', '#ec4899', '9', '12', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  icon = excluded.icon,
  accent = excluded.accent,
  min_class = excluded.min_class,
  max_class = excluded.max_class,
  sort_order = excluded.sort_order,
  published = true;

INSERT INTO public.skill_lessons (track_id, slug, title, summary, content_md, est_minutes, sort_order, published)
SELECT t.id, v.slug, v.title, v.summary, v.content_md, v.est_minutes, v.sort_order, true
FROM public.skill_tracks t
JOIN (VALUES
  ('digital-literacy', 'how-the-internet-works', 'How the internet actually works', 'Packets, servers, and why a page loads in seconds.', $md$When you open a website, your device does not receive the whole page in one piece. It sends a request across a network of routers, and the page comes back as many small **packets** that are reassembled in order.

Three ideas make the web understandable:

1. **Addresses.** Every server has an IP address. Domain names such as `ncert.nic.in` are human-friendly labels that the Domain Name System (DNS) translates into an address.
2. **Requests and responses.** Your browser asks a server for a resource using HTTP. The server answers with a status code: `200` means OK, `404` means not found, `500` means the server failed.
3. **Caching.** Browsers and content networks keep copies of files so the next visit is faster. That is why clearing your cache can fix a stale page.

**Why it matters:** A slow page is often a network problem, not a broken device. If one site fails but others work, the problem is probably that site or its DNS. If every site fails, check your own connection first.

**Try this:** Open your browser developer tools, go to the Network tab, and reload a page. Count how many requests it makes and find the largest file. That file is usually an image or a script.
$md$, 8, 1),
  ('digital-literacy', 'judge-information-online', 'Judge information before you share it', 'A four-step habit for separating evidence from noise.', $md$False information spreads because it is surprising and emotional. Use the **SIFT** habit before you believe or forward a claim:

- **Stop.** Notice your reaction. Strong anger or excitement is a signal to slow down.
- **Investigate the source.** Who published it? Is it a school, a newsroom, a company, or an anonymous account? Open a new tab and search for the organisation.
- **Find better coverage.** Look for at least two independent outlets. If only one site reports a major event, be suspicious.
- **Trace the original.** Screenshots and quotes are often detached from context. Find the full video, report, or data set.

Ask three questions about any statistic: *Compared to what? Over what period? Who benefits if I believe it?* A number without a source is not evidence.

**Red flags:** ALL CAPS, urgent "share before it is deleted" language, missing dates, edited images, and claims that only one website reports.

**Try this:** Pick one forward you received this week. Trace it to its original source. If you cannot find one, that is your answer.
$md$, 9, 2),
  ('digital-literacy', 'how-ai-learns', 'How AI learns — and where it fails', 'Patterns, training data, and hallucinations in plain language.', $md$A large language model is a pattern machine. During training it reads a very large amount of text and adjusts billions of numbers so that it can predict what comes next. It does not look up a stored answer, and it does not "know" a fact the way you know your school's address.

Two consequences follow:

1. **It can sound confident and still be wrong.** This is often called a *hallucination*. The model produces fluent text because fluency is what it was trained to produce, not because the sentence is true.
2. **Its answers reflect its training data.** If the data under-represents a language, region, or group, the output can be skewed.

AI is genuinely useful for brainstorming, explaining a concept in simpler words, generating practice questions, and checking your grammar. It is risky as a final authority for medical advice, legal rules, current events, or mathematical proofs.

**A good habit:** treat an AI answer as a first draft from a helpful but overconfident classmate. Verify names, numbers, dates, and formulas against a textbook or a trusted website.

**Try this:** Ask an AI tool for three facts about your district. Check each one against an official government or school source. Note which ones survive.
$md$, 9, 3),
  ('digital-literacy', 'prompting-that-works', 'Prompts that get useful answers', 'Give context, a task, a format, and a check.', $md$A vague prompt produces a vague answer. A strong prompt usually contains four parts:

1. **Context** — who you are and what you already know. *"I am a Class 9 student studying linear equations."*
2. **Task** — the exact job. *"Explain why we do the same operation on both sides."*
3. **Format** — how the answer should look. *"Give one analogy, one worked example, and three practice questions."*
4. **Constraint** — what to avoid. *"Do not use calculus. Keep it under 250 words."*

Then add a **verification step**: *"End with two questions I should ask my teacher to check this."*

Follow-ups matter more than the first prompt. If an explanation is too hard, say *"Explain that again for a Class 6 student, using a daily-life example."* If it is too shallow, ask for a counterexample.

**Do not** paste private information such as your full address, phone number, passwords, or another person's data into a public AI tool.

**Try this:** Rewrite this weak prompt — *"Explain photosynthesis"* — using all four parts. Compare the two answers.
$md$, 8, 4),
  ('digital-literacy', 'privacy-and-digital-footprint', 'Your digital footprint', 'What stays online, and how to reduce your exposure.', $md$Every post, comment, like, and sign-up leaves a trace. Some of it is public, some is visible to companies, and some is copied by strangers. Assume that anything you post publicly can be screenshotted and remain online indefinitely.

Practical rules:

- **Post about experiences, not locations in real time.** Share the photo after you leave.
- **Check app permissions.** A torch app does not need your contacts. Turn off location access unless the app truly needs it.
- **Use separate usernames** for school work and personal social media when possible.
- **Think before tagging others.** You may be revealing their location or plans.
- **Know how to report and block.** Every major platform has tools; using them is not overreacting.

Your footprint also includes accounts you forgot about. Once a year, search your email for "welcome" and "verify" to find old sign-ups you can delete.

**Try this:** Open the privacy settings of one app you use daily. List every permission it has and turn off one that is not needed.
$md$, 7, 5),
  ('digital-literacy', 'passwords-and-account-safety', 'Passwords and account safety', 'Passphrases, two-step verification, and recovery plans.', $md$Most account takeovers do not involve clever hacking. They involve a reused password leaked from another site, or a convincing fake login page.

Build three habits:

1. **Use a unique passphrase for every important account.** Four unrelated words are easier to remember and harder to guess than `P@ssw0rd1`. Example structure: `blue-lantern-tiger-bridge`.
2. **Turn on two-step verification (2SV).** Even if someone learns your password, they still need the second factor. Prefer an authenticator app over SMS where available.
3. **Never enter a password after clicking a link in a message.** Open the site yourself by typing its address. Check the domain carefully: `accounts.google.com` is not `accounts-google.com`.

Also set up a recovery email and phone number, and write down recovery codes somewhere offline.

If you suspect a compromise: change the password from a trusted device, sign out all sessions, check connected apps, and tell a trusted adult or your school's administrator.

**Try this:** Choose your most important account. Make its password unique and enable two-step verification today.
$md$, 8, 6),

  ('coding-foundations', 'think-like-a-programmer', 'Think like a programmer', 'Decomposition, patterns, and algorithms.', $md$Programming is mostly thinking, not typing. When a problem feels impossible, it is usually too large. Break it down.

**Decomposition:** Split a task into smaller tasks. "Make a quiz app" becomes: store questions, show one question, record an answer, score it, show the result.

**Pattern recognition:** Look for repetition. If five lines do almost the same thing, a loop or a function probably replaces them.

**Algorithm:** Write the steps in plain language before code. A good algorithm has a clear start, clear decisions, and a clear stop.

Example — find the largest number in a list:

1. Remember the first number as the current maximum.
2. Look at each remaining number.
3. If it is larger than the maximum, replace the maximum.
4. When there are no numbers left, the maximum is the answer.

**Pseudocode** lets you test the logic without fighting syntax. Only translate to code when the steps are clear.

**Try this:** Write pseudocode for "count how many students scored above 80" using a list of marks. Do not write JavaScript yet.
$md$, 8, 1),
  ('coding-foundations', 'variables-and-data', 'Variables and data', 'Names for values, and the types that matter.', $md$A variable is a named box that holds a value. In JavaScript you create one with `let` (it can change) or `const` (it cannot be reassigned).

```js
const studentName = "Aisha";
let score = 42;
score = score + 8; // now 50
```

The common types are:

- **String** — text in quotes: `"hello"`.
- **Number** — `42`, `3.14`, `-7`.
- **Boolean** — `true` or `false`.
- **Array** — an ordered list: `[10, 20, 30]`.
- **Object** — labelled values: `{ name: "Aisha", score: 50 }`.

Choose names that explain the value: `totalMarks` is better than `x`. JavaScript is case-sensitive, so `score` and `Score` are different.

Watch out for **string vs number**: `"5" + 1` gives `"51"`, while `5 + 1` gives `6`. Use `Number("5")` when you need to convert.

**Try this:** Create variables for your name, class, and three subject marks. Print a sentence that uses all of them.
$md$, 8, 2),
  ('coding-foundations', 'conditionals', 'Conditionals', 'Teach your program to choose.', $md$A conditional runs code only when a condition is true.

```js
if (marks >= 90) {
  grade = "A";
} else if (marks >= 75) {
  grade = "B";
} else if (marks >= 60) {
  grade = "C";
} else {
  grade = "D";
}
```

Conditions use comparison operators: `>` `<` `>=` `<=` `===` (equal value and type) and `!==` (not equal). Combine them with `&&` (and), `||` (or), and `!` (not).

Order matters. In the example, checking `marks >= 60` before `marks >= 90` would give every strong student a C. Put the strictest condition first, or use ranges.

A **ternary** is a short if/else for simple choices:

```js
const result = marks >= 40 ? "Pass" : "Try again";
```

**Try this:** Write a program that labels a temperature as "cold" below 15, "pleasant" from 15 to 30, and "hot" above 30. Test all three branches.
$md$, 8, 3),
  ('coding-foundations', 'loops', 'Loops', 'Repeat work without repeating code.', $md$A loop repeats a block. The two you will use most are `for` and `while`.

```js
let total = 0;
for (let i = 1; i <= 5; i++) {
  total = total + i;
}
// total is 15
```

Read the `for` header in three parts: start (`let i = 1`), continue while (`i <= 5`), and step (`i++`). A `while` loop repeats as long as a condition stays true — make sure something inside changes that condition, or it will run forever.

Use `for...of` to visit every item in an array:

```js
for (const mark of [72, 88, 95]) {
  console.log(mark);
}
```

**Accumulator pattern:** create a result variable before the loop, update it inside, use it after. Sums, counts, maximums, and filtered lists all follow this pattern.

**Try this:** Write a loop that prints the multiplication table of 7 from 1 to 10. Then modify it to stop at 70.
$md$, 9, 4),
  ('coding-foundations', 'functions', 'Functions', 'Package logic so you can reuse and test it.', $md$A function takes inputs, does one job, and returns an output.

```js
function average(numbers) {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total / numbers.length;
}

const result = average([10, 20, 30]); // 20
```

`return` ends the function and sends a value back. A function without `return` gives `undefined`. Parameters are the names in the definition; arguments are the values you pass in.

Good functions are **small**, **named for their job**, and **do not secretly change outside variables**. If a function is called `calculateTotal`, it should not also send an email.

Arrow functions are a shorter syntax:

```js
const double = (n) => n * 2;
```

**Try this:** Write `largest(numbers)` that returns the biggest value without using `Math.max`. Then write `countAbove(numbers, limit)`.
$md$, 9, 5),
  ('coding-foundations', 'debug-like-a-pro', 'Debug like a pro', 'Read the error, isolate the cause, verify the fix.', $md$Bugs are normal. Professionals do not stare at the whole program; they narrow the search.

A reliable routine:

1. **Read the error message.** It usually names the line and the type of problem. `undefined is not a function` means you called something that is not a function.
2. **Reproduce it reliably.** Find the smallest input that triggers the bug.
3. **Locate the boundary.** Print or inspect values just before and just after the suspected line.
4. **Change one thing at a time.** Multiple changes make it impossible to know which one worked.
5. **Verify and prevent.** Add a test or a guard so the same bug cannot return silently.

Common causes: off-by-one errors in loops, using `=` instead of `===`, forgetting to return, modifying an array while looping over it, and treating text as a number.

`console.log({ value })` prints the name and the value together, which is easier to read than a bare value.

**Try this:** The function below should return the largest number but returns the first one. Find and fix the bug.

```js
function largest(numbers) {
  let best = 0;
  for (const n of numbers) {
    if (n > best) best = n;
  }
  return best;
}
```
$md$, 8, 6),

  ('web-studio', 'html-structure', 'HTML structure', 'Elements, nesting, and semantic tags.', $md$HTML describes the structure of a page. An element usually has an opening tag, content, and a closing tag:

```html
<h1>My Portfolio</h1>
<p>I am learning web development.</p>
```

Elements nest. The element you open last must close first. A page has one `html` root, a `head` for metadata, and a `body` for visible content.

**Semantic tags** describe meaning, not appearance: `header`, `nav`, `main`, `section`, `article`, and `footer`. They help screen readers and search engines understand the page. Use `button` for actions and `a` for links — not a clickable `div`.

Images need an `alt` attribute that describes the image's purpose. Forms need a `label` connected to each input.

```html
<label for="email">Email</label>
<input id="email" type="email" required />
```

**Try this:** Build a page with a header containing your name, a main section with two paragraphs, and a footer with the year. Use no `div` unless you truly need a container.
$md$, 9, 1),
  ('web-studio', 'css-layout', 'CSS layout', 'The box model, flexbox, and grid.', $md$CSS controls presentation. Every element is a box made of content, padding, border, and margin. `box-sizing: border-box` makes width include padding and border, which is usually what you want.

```css
* { box-sizing: border-box; }
.card { padding: 16px; border: 1px solid #ddd; border-radius: 12px; }
```

**Flexbox** arranges items in one direction:

```css
.row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
```

**Grid** arranges items in rows and columns:

```css
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
```

That single grid rule creates a responsive card layout without media queries.

Use **relative units** (`rem`, `%`) for text and layout so the page respects user settings. Keep contrast high: dark text on a light background, or the reverse. Do not rely on colour alone to communicate meaning.

**Try this:** Create three cards in a grid. Resize the window and confirm they stack on narrow screens without horizontal scrolling.
$md$, 10, 2),
  ('web-studio', 'responsive-design', 'Responsive design', 'Mobile-first layout and readable text.', $md$Most students will open your page on a phone. Design for the small screen first, then add space for larger screens.

Three tools do most of the work:

1. **The viewport meta tag** — without it, phones pretend to be desktop screens:
   `<meta name="viewport" content="width=device-width, initial-scale=1" />`
2. **Fluid widths** — prefer `max-width` and percentages over fixed pixel widths.
3. **Media queries** — adjust layout at a breakpoint:
   `@media (min-width: 768px) { .layout { display: grid; grid-template-columns: 1fr 2fr; } }`

Keep body text at least `16px`, line length around 60–75 characters, and tap targets at least `44px` tall. Test with your thumb, not just a mouse.

Avoid horizontal scrolling. If content overflows, inspect the widest element rather than hiding the overflow.

**Try this:** Open your page on a phone or use the browser's device toolbar. Fix every element that is hard to tap or read.
$md$, 9, 3),
  ('web-studio', 'javascript-interactivity', 'JavaScript interactivity', 'Select elements, listen for events, update the page.', $md$JavaScript makes a page respond. The basic pattern is: select an element, listen for an event, change something.

```html
<button id="count">Clicked 0 times</button>
<script>
  const button = document.querySelector("#count");
  let count = 0;
  button.addEventListener("click", () => {
    count += 1;
    button.textContent = `Clicked ${count} times`;
  });
</script>
```

`querySelector` returns the first matching element. Use `textContent` for text (safer than `innerHTML`). Add classes with `classList.add` and remove them with `classList.remove`.

Keep data and display separate: store the count in a variable, then render it. If you only change the text, you lose the value.

For forms, listen for `submit`, call `event.preventDefault()`, validate the input, then update the page.

**Try this:** Build a button that changes the page background between light and dark each time it is clicked. Store the current mode in a variable.
$md$, 10, 4),
  ('web-studio', 'accessibility-basics', 'Accessibility basics', 'Make your page usable with a keyboard and a screen reader.', $md$Accessibility is not an extra feature. It is part of a page working correctly.

Checklist:

- **Keyboard:** every link, button, and form field must be reachable with Tab and usable with Enter or Space. Never remove the focus outline without providing a visible replacement.
- **Labels:** every input needs a `label`. Every image needs meaningful `alt` text, or `alt=""` if it is purely decorative.
- **Headings:** use `h1`, `h2`, `h3` in order. Do not skip levels for visual size; use CSS for that.
- **Contrast:** normal text should have a contrast ratio of at least 4.5:1 against its background.
- **Motion:** avoid flashing content and respect `prefers-reduced-motion`.
- **Language:** set `<html lang="en">` (or the correct language) so screen readers pronounce words properly.

Test by tabbing through the page with your eyes closed, then with the screen reader built into your browser or operating system.

**Try this:** Tab through your page. If you cannot tell where you are, add a clear `:focus-visible` style.
$md$, 8, 5),
  ('web-studio', 'publish-your-site', 'Publish your site', 'From local files to a live link.', $md$A website is a folder of files served by a web server. `index.html` is the default entry point.

Before publishing:

- Put CSS in `styles.css` and JavaScript in `script.js`; link them from the HTML.
- Use relative paths (`./styles.css`) so the site works when moved.
- Compress large images and give them descriptive file names.
- Test every link and check the browser console for errors.

Free static hosting options include GitHub Pages, Netlify, and Cloudflare Pages. The general flow is: create a repository or project folder, upload the files, enable static hosting, and open the generated URL.

Never publish passwords, API keys, or personal addresses. Anything in a static site is public.

**Try this:** Publish your portfolio page and send the link to a classmate. Ask them to open it on a phone and report one thing that could be clearer.
$md$, 8, 6),

  ('data-and-ai', 'data-to-decisions', 'From data to decisions', 'Ask a question before you collect numbers.', $md$Data work starts with a question, not a spreadsheet. "How are we doing?" is not a question you can answer. "Which class improved its reading score the most between two tests?" is.

A useful structure:

1. **Question** — specific and answerable.
2. **Measure** — what exactly will you count or score?
3. **Collect** — where will the numbers come from, and who is missing?
4. **Analyse** — compare, average, or group.
5. **Decide** — what action follows?

Averages hide variation. Two classes can have the same average score while one is consistently steady and the other has very high and very low scores. Always ask about the spread.

Correlation is not causation. Ice-cream sales and drowning incidents both rise in summer; ice cream does not cause drowning. Look for a third factor and for a mechanism.

**Try this:** Turn a vague question about your school into a specific, measurable one. Name the data you would need and one group that might be missing.
$md$, 9, 1),
  ('data-and-ai', 'charts-that-tell-the-truth', 'Charts that tell the truth', 'Choose the right chart and avoid misleading axes.', $md$The chart type should match the question:

- **Bar chart** — compare categories.
- **Line chart** — change over time.
- **Scatter plot** — relationship between two numbers.
- **Pie chart** — parts of one whole, with few slices. Avoid it for comparisons.
- **Histogram** — distribution of one variable.

Common distortions:

- **Truncated axis.** Starting a bar chart at 90 instead of 0 makes small differences look huge.
- **Unequal intervals.** Labels spaced evenly while the values are not.
- **Cherry-picked range.** Showing only the months that support a claim.
- **Dual axes.** Two scales can make unrelated lines appear to move together.

A good chart has a clear title, labelled axes with units, a readable scale, and a source. If removing the title makes the chart meaningless, the title is doing too much work.

**Try this:** Find a chart in a news article. Identify the chart type, the axis range, and one thing the chart makes easy to conclude.
$md$, 9, 2),
  ('data-and-ai', 'spreadsheets-power-tools', 'Spreadsheet power tools', 'Sort, filter, and summarise without hand-counting.', $md$A spreadsheet is a small database with a grid interface. Keep it tidy:

- One table per sheet.
- One variable per column.
- One observation per row.
- A header row with clear names.
- No merged cells inside the data.

Core tools:

- **Sort** to order rows by a column.
- **Filter** to show only matching rows.
- **COUNTIF** to count matches: `=COUNTIF(B2:B100, "10")`.
- **SUMIF** and **AVERAGEIF** to aggregate by category.
- **Pivot tables** to group and summarise large tables quickly.

Use formulas instead of typing totals. A typed total silently becomes wrong when a row changes.

**Try this:** Build a table of 20 fictional students with class, subject, and marks. Use `AVERAGEIF` to find the average for each class, then create a bar chart from the result.
$md$, 10, 3),
  ('data-and-ai', 'machine-learning-intuition', 'Machine-learning intuition', 'Features, labels, training, and testing.', $md$Machine learning finds patterns in examples instead of following hand-written rules.

Imagine predicting whether a student will pass. You collect **features** (attendance, study minutes, previous score) and a **label** (passed or not). The model learns a relationship from labelled examples, then predicts the label for new students.

Key vocabulary:

- **Training set** — examples used to learn.
- **Test set** — examples held back to check whether the model generalises.
- **Overfitting** — memorising the training examples instead of learning the pattern. It scores well on training data and poorly on new data.
- **Accuracy** — the share of predictions that are correct, which can be misleading when one class is rare.

A model is not an explanation. A high accuracy score does not tell you *why* a decision was made, and it does not prove the features are fair or causal.

**Try this:** Choose a prediction question about your school. List three features, the label, and one reason the model might be unfair.
$md$, 10, 4),
  ('data-and-ai', 'bias-and-fairness', 'Bias and fairness', 'Where automated decisions go wrong.', $md$A model learns from historical data, including historical unfairness. If past hiring favoured one group, a model trained on those decisions can reproduce and scale that bias.

Sources of bias:

- **Sampling bias** — some groups are missing from the data.
- **Label bias** — the historical decision itself was unfair.
- **Measurement bias** — the feature measures something different for different groups.
- **Deployment bias** — the model is used in a context it was not designed for.

Fairness is not one number. A model can be equally accurate across groups but still produce unequal outcomes, or equal outcomes but different error rates. The right definition depends on the decision and who bears the cost of a mistake.

Questions to ask: Who is affected? What happens when the model is wrong? Can a person appeal? Is the data still representative?

**Try this:** Pick an automated decision you encounter (recommendations, exam eligibility, content moderation). Write one group that could be disadvantaged and one safeguard you would require.
$md$, 9, 5),

  ('career-readiness', 'know-your-strengths', 'Know your strengths', 'Evidence beats adjectives.', $md$Employers and colleges do not need a list of adjectives. They need evidence.

Build a **strength inventory** with three columns:

1. **What I did** — a specific activity, project, competition, or responsibility.
2. **What it required** — the skill: explaining, organising, coding, designing, leading, persisting.
3. **What changed** — the result: a working page, a cleaner process, a team that met a deadline, a score that improved.

"Good at teamwork" is a claim. "Coordinated a four-person science exhibition team; we finished the model two days early" is evidence.

Look for repeated themes across school, home, hobbies, and online learning. A student who maintains a fan wiki is practising writing, moderation, and community management.

**Try this:** Write five evidence rows. Then circle the two themes that appear most often. Those are your current strengths, and they belong on a resume.
$md$, 8, 1),
  ('career-readiness', 'first-resume', 'Your first resume', 'One page, clear structure, no decoration.', $md$A first resume is a one-page evidence sheet, not an autobiography.

Order for a student:

1. **Name and contact** — email and city. A professional email address, not a joke handle.
2. **Education** — school, class or expected graduation year, relevant subjects.
3. **Projects and activities** — two or three entries with what you built or organised and the result.
4. **Skills** — tools and abilities you can demonstrate. Be honest about the level.
5. **Achievements** — competitions, scholarships, responsibilities.

Use a clean font, consistent spacing, and reverse chronological order. Save as PDF so the layout does not shift.

Avoid photos, date of birth, full address, and phrases such as "hard-working individual". Use strong verbs: built, organised, analysed, wrote, fixed, led.

**Try this:** Draft your resume in a document, then cut it to one page. Ask a teacher to find one claim that lacks evidence.
$md$, 10, 2),
  ('career-readiness', 'email-and-message-etiquette', 'Email and message etiquette', 'Clear subject lines and respectful requests.', $md$A professional message respects the reader's time.

Structure:

- **Subject:** specific and short. "Request for a recommendation letter — Class 12" beats "Hello".
- **Greeting:** use the person's name and title.
- **Context:** who you are and why you are writing, in one or two sentences.
- **Request:** one clear ask, with a deadline if relevant.
- **Logistics:** attach files, include links, mention your class and section.
- **Close:** thank them and sign your full name.

Keep it short. Use paragraphs, not one giant block. Proofread names and attachments — the most common email mistake is forgetting the file.

Follow up once after a reasonable wait. Do not send repeated messages on multiple platforms.

**Try this:** Write an email to a teacher asking for feedback on a project. Include a subject line, a one-sentence context, a specific question, and a proposed deadline.
$md$, 7, 3),
  ('career-readiness', 'interview-basics', 'Interview basics', 'Prepare stories, not scripts.', $md$An interview is a conversation to check whether your claims are true and whether you can think on your feet.

Prepare three or four **stories** using the STAR shape:

- **Situation** — the context.
- **Task** — what you needed to do.
- **Action** — what you actually did.
- **Result** — what changed, with a number if possible.

Common questions: "Tell me about yourself", "Describe a challenge", "Why this course?", "What are you learning now?" Keep "tell me about yourself" to 60–90 seconds and connect it to the opportunity.

Before the interview: research the organisation, prepare two questions, test your connection if it is online, and keep a glass of water nearby. During: slow down, ask for clarification if needed, and it is fine to say "I do not know, but here is how I would find out."

After: send a short thank-you message within a day.

**Try this:** Write one STAR story about a project that did not go to plan. Practise it aloud in under two minutes.
$md$, 9, 4),
  ('career-readiness', 'teamwork-and-feedback', 'Teamwork and feedback', 'Make the team better, not just busier.', $md$Good teamwork is mostly coordination, not loudness.

Practical behaviours:

- **Clarify the goal** before dividing work. A team can be busy and still build the wrong thing.
- **Make work visible.** Use a shared list with owners and deadlines.
- **Default to written updates** so people who were absent can catch up.
- **Disagree with the idea, not the person.** Say "I am worried this will not work because…" and propose an alternative.
- **Do your part by the agreed time.** Reliability is a skill.

When giving feedback, be specific, timely, and about behaviour: "The slides had three different fonts; can we standardise on one?" is usable. "Your slides are bad" is not.

When receiving feedback, ask a clarifying question before defending yourself. Write it down, decide what to act on, and thank the person.

**Try this:** With a study group, assign one owner and one deadline for each task. At the end, each person gives one specific piece of feedback.
$md$, 8, 5),
  ('career-readiness', 'money-basics', 'Money basics', 'Budget, save, and avoid expensive traps.', $md$Money skills are life skills. Start with three numbers: what comes in, what goes out, and what is left.

A simple budget:

- **Needs** — transport, supplies, essential data.
- **Wants** — entertainment, upgrades, treats.
- **Savings** — a fixed amount moved aside before spending.

Pay yourself first: save a small amount as soon as money arrives, not whatever is left at the end.

Understand **interest**. When you save, interest works for you. When you borrow, it works against you. A "small" monthly payment can hide a large total cost; always ask for the total repayment amount.

Be sceptical of schemes that promise guaranteed high returns, urgent deadlines, or payments to unlock a prize. If it sounds too good to be true, it usually is.

**Try this:** Track every rupee you spend for one week. Group the entries into needs, wants, and savings. Choose one want to reduce next week.
$md$, 9, 6)
) AS v(track_slug, slug, title, summary, content_md, est_minutes, sort_order)
  ON t.slug = v.track_slug
ON CONFLICT (track_id, slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  content_md = excluded.content_md,
  est_minutes = excluded.est_minutes,
  sort_order = excluded.sort_order,
  published = true;

INSERT INTO public.skill_challenges (lesson_id, title, prompt_md, starter_code, language, tests, sort_order, published)
SELECT l.id, v.title, v.prompt_md, v.starter_code, v.language, v.tests::jsonb, v.sort_order, true
FROM public.skill_lessons l
JOIN public.skill_tracks t ON t.id = l.track_id
JOIN (VALUES
  ('coding-foundations', 'variables-and-data', 'Build a profile line',
   $md$Write a function `solve(name, age)` that returns a sentence in the form `Aisha is 14 years old`.

Use a template literal. The tests call your function with different names and ages.$md$,
   $code$function solve(name, age) {
  // Return the sentence here
  return "";
}
$code$,
   'javascript',
   $json$[{"input":["Aisha",14],"expected":"Aisha is 14 years old"},{"input":["Rohan",12],"expected":"Rohan is 12 years old"} ]$json$,
   1),
  ('coding-foundations', 'conditionals', 'Grade calculator',
   $md$Write `solve(marks)` that returns a grade using this scale:

- 90 or above: `"A"`
- 75 to 89: `"B"`
- 60 to 74: `"C"`
- below 60: `"D"`

Return only the letter. Check the strictest condition first.$md$,
   $code$function solve(marks) {
  // Write your conditionals
}
$code$,
   'javascript',
   $json$[{"input":[95],"expected":"A"},{"input":[75],"expected":"B"},{"input":[60],"expected":"C"},{"input":[59],"expected":"D"} ]$json$,
   1),
  ('coding-foundations', 'loops', 'Sum from 1 to n',
   $md$Write `solve(n)` that returns the sum of all whole numbers from 1 to `n`.

For example, `solve(5)` is `1 + 2 + 3 + 4 + 5 = 15`. Use a loop, not a formula.$md$,
   $code$function solve(n) {
  let total = 0;
  // Add each number to total
  return total;
}
$code$,
   'javascript',
   $json$[{"input":[5],"expected":15},{"input":[1],"expected":1},{"input":[10],"expected":55} ]$json$,
   1),
  ('coding-foundations', 'functions', 'Average of a list',
   $md$Write `solve(numbers)` that returns the average of an array of numbers.

`solve([10, 20, 30])` should return `20`. Assume the array is never empty. Return a number, not a string.$md$,
   $code$function solve(numbers) {
  // Add the numbers, then divide by how many there are
}
$code$,
   'javascript',
   $json$[{"input":[[10,20,30]],"expected":20},{"input":[[5,5]],"expected":5},{"input":[[2,4,6,8]],"expected":5} ]$json$,
   1),
  ('coding-foundations', 'debug-like-a-pro', 'Fix the largest-number bug',
   $md$The function below should return the largest number in an array, but it starts `best` at `0`. That fails for arrays where every number is negative.

Fix it so it works for any non-empty array. Keep the loop.$md$,
   $code$function solve(numbers) {
  let best = 0;
  for (const n of numbers) {
    if (n > best) best = n;
  }
  return best;
}
$code$,
   'javascript',
   $json$[{"input":[[3,9,2]],"expected":9},{"input":[[-5,-2,-9]],"expected":-2},{"input":[[7]],"expected":7} ]$json$,
   1),
  ('web-studio', 'html-structure', 'Build a semantic profile',
   $md$Build a small page with:

- a `header` containing an `h1` with the text `My Portfolio`
- a `main` containing a `p` with the text `I am learning web development.`
- a `footer` containing the text `Built by me`

Use semantic tags, not `div`s. The checker looks for the tags and their text.$md$,
   $code$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Portfolio</title>
  </head>
  <body>
    <!-- Build the header, main, and footer here -->
  </body>
</html>
$code$,
   'html',
   $json$[{"selector":"header h1","text":"My Portfolio"},{"selector":"main p","text":"I am learning web development."},{"selector":"footer","text":"Built by me"} ]$json$,
   1),
  ('web-studio', 'javascript-interactivity', 'Counter function',
   $md$Write `solve(current)` that returns the next count.

`solve(0)` returns `1`, `solve(4)` returns `5`. This is the logic behind a click counter.$md$,
   $code$function solve(current) {
  // Return the next number
}
$code$,
   'javascript',
   $json$[{"input":[0],"expected":1},{"input":[4],"expected":5},{"input":[99],"expected":100} ]$json$,
   1)
) AS v(track_slug, lesson_slug, title, prompt_md, starter_code, language, tests, sort_order)
  ON l.track_id = t.id AND l.slug = v.lesson_slug
ON CONFLICT (lesson_id, title) DO UPDATE SET
  prompt_md = excluded.prompt_md,
  starter_code = excluded.starter_code,
  language = excluded.language,
  tests = excluded.tests,
  sort_order = excluded.sort_order,
  published = true;

INSERT INTO public.career_resources (slug, title, category, stream, summary, content_md, link_url, min_class, max_class, sort_order, published)
VALUES
  ('after-class-10-science', 'Science after Class 10', 'stream', 'Science', 'PCM, PCB, and how to choose between them.', $md$Science in Classes 11–12 usually splits into **PCM** (Physics, Chemistry, Mathematics) and **PCB** (Physics, Chemistry, Biology), with some schools offering both Mathematics and Biology.

**PCM** keeps engineering, architecture, defence technical branches, and most physical-science degrees open. **PCB** is the usual route to medicine, dentistry, nursing, pharmacy, and life sciences. Choosing both keeps more options open but increases workload.

Ask three questions before deciding:

1. Which subjects do I enjoy doing practice problems in, not just reading?
2. Does my target course require a specific subject combination?
3. Can I handle the weekly workload alongside entrance-exam preparation?

Do not choose a stream only because of family pressure or a single exam. Look at the daily work, not the destination alone.

**Next step:** List two courses you are curious about and check their official subject requirements.$md$, NULL, '9', '12', 1, true),
  ('after-class-10-commerce', 'Commerce after Class 10', 'stream', 'Commerce', 'Accounts, business studies, economics, and the maths question.', $md$Commerce combines **Accountancy**, **Business Studies**, and **Economics**, often with Mathematics or Informatics Practices.

It leads to careers in chartered accountancy, company secretaryship, cost accounting, finance, banking, marketing, entrepreneurship, and business degrees such as BBA and B.Com.

Mathematics is not always mandatory, but several quantitative courses and entrance exams reward it. If you enjoy numbers and logic, keeping Maths can preserve options.

Core skills: accuracy, comfort with tables, clear writing, and ethical judgement. Accountancy rewards practice more than memorisation.

**Next step:** Open a Class 11 Accountancy textbook chapter and try one journal-entry exercise. If the structure feels interesting rather than exhausting, Commerce may fit.$md$, NULL, '9', '12', 2, true),
  ('after-class-10-arts', 'Humanities after Class 10', 'stream', 'Arts / Humanities', 'History, political science, psychology, and unexpected paths.', $md$Humanities covers subjects such as History, Political Science, Geography, Economics, Psychology, Sociology, and Languages. It is not a "last option"; it is the core training for law, journalism, public policy, design research, education, and social science research.

The work is reading, arguing, writing, and connecting evidence. If you enjoy debating why events happened and how institutions work, this stream rewards you.

Useful combinations depend on the target: Political Science and History for law and civil services; Psychology and Biology for psychology or health-related paths; Economics and Mathematics for economics and public policy.

**Next step:** Read one editorial and write a one-paragraph response with a claim, evidence, and a counterargument.$md$, NULL, '9', '12', 3, true),
  ('after-class-10-vocational', 'Vocational and skill pathways', 'stream', 'Vocational', 'Early work skills, diplomas, and applied learning.', $md$Vocational education teaches a trade or applied skill alongside general subjects. Options include IT and software, electronics, automotive, healthcare support, beauty and wellness, agriculture, tourism, and graphic design.

Paths include school vocational subjects, ITI trades, polytechnic diplomas, and apprenticeships. A diploma can lead directly to work or to lateral entry into a degree programme.

Choose based on the work you want to do, not on prestige. Visit a training centre, talk to someone doing the job, and ask about placement support, equipment, and safety.

**Next step:** Find one government-recognised vocational course in your state and note its duration, fees, and entry requirements.$md$, NULL, '8', '12', 4, true),
  ('jee-main-and-advanced', 'JEE Main and Advanced', 'exam', 'Science', 'The engineering entrance route through NTA and the IITs.', $md$**JEE Main** is conducted by the National Testing Agency and is used for admission to NITs, IIITs, and other participating institutions, and as the qualifying step for JEE Advanced. **JEE Advanced** is conducted by the IITs for admission to Indian Institutes of Technology.

The syllabus is based on Class 11–12 Physics, Chemistry, and Mathematics. Preparation is a long game: build concepts, solve progressively harder problems, and take timed mock tests. Review every mistake by category, not just by score.

Check the official NTA and JEE Advanced portals for current dates, eligibility, paper patterns, and counselling rules. JoSAA handles seat allocation for the IITs, NITs, IIITs, and GFTIs.

**Next step:** Download the latest official syllabus and mark the Class 11 topics you have already studied.$md$, 'https://jeemain.nta.nic.in', '10', '12', 5, true),
  ('neet-ug', 'NEET UG', 'exam', 'Science', 'The national entrance exam for medical and allied health courses.', $md$**NEET UG** is the national undergraduate entrance examination used for admission to MBBS, BDS, AYUSH, and several allied health programmes. It is conducted by the National Testing Agency.

The paper covers Physics, Chemistry, and Biology (Botany and Zoology) from the Class 11–12 syllabus. Accuracy matters as much as speed; negative marking makes guessing expensive.

Build a revision system: short daily recall, weekly full-syllabus tests, and an error log with the reason for each mistake (concept, calculation, misread question, or guess).

Rules, eligibility, and counselling change. Verify details on the official NTA and MCC websites before applying.

**Next step:** Create a one-page error log and use it for your next practice test.$md$, 'https://neet.nta.nic.in', '10', '12', 6, true),
  ('cuet-ug', 'CUET UG', 'exam', 'All streams', 'The common entrance route to central universities.', $md$The **Common University Entrance Test (CUET UG)** is conducted by the National Testing Agency for admission to participating central and other universities.

Depending on the university and course, you may take language papers, domain-subject papers, and a general test. The subjects you choose must match the course requirements, so read the university's admission page before selecting.

Preparation is syllabus-based and closer to board work than to olympiad-style problem solving. Strong NCERT foundations and timed practice on the exam interface help.

**Next step:** Choose three universities you are interested in and note their required CUET papers.$md$, 'https://cuet.nta.nic.in', '11', '12', 7, true),
  ('clat', 'CLAT and law entrance', 'exam', 'Arts / Humanities', 'A reasoning-heavy route to national law universities.', $md$The **Common Law Admission Test (CLAT)** is conducted by the Consortium of National Law Universities for admission to participating NLUs. It tests English, current affairs and general knowledge, legal reasoning, logical reasoning, and quantitative techniques.

The exam rewards reading speed and careful argument analysis more than memorisation. Build a daily habit: one long article, one set of reasoning questions, and a review of why each wrong option was tempting.

Several other universities use their own law entrance tests, so check each institution.

**Next step:** Read a news editorial and identify the claim, the evidence, and one assumption the writer makes.$md$, 'https://consortiumofnlus.ac.in', '10', '12', 8, true),
  ('nda', 'NDA and defence entry', 'exam', 'Science', 'UPSC''s twice-yearly route to the armed forces.', $md$The **National Defence Academy (NDA)** examination is conducted by the Union Public Service Commission for entry to the Army, Navy, and Air Force wings of the NDA.

The written exam covers Mathematics and General Ability. Candidates who clear it proceed to the Services Selection Board, which assesses leadership, teamwork, and psychological suitability through tasks and interviews.

Physical fitness matters. Build a consistent routine early: running, strength work, and adequate sleep. Do not treat the medical standards as a last-minute formality.

Check the official UPSC notification for age, educational eligibility, and current schedule.

**Next step:** Read the latest UPSC NDA notification and list the eligibility conditions you must meet.$md$, 'https://upsc.gov.in', '10', '12', 9, true),
  ('nift-nid', 'Design entrance: NIFT and NID', 'exam', 'Design', 'Portfolio, creativity, and design aptitude.', $md$Design education includes fashion, product, communication, textile, and interaction design. Two well-known routes are the **National Institute of Fashion Technology (NIFT)** entrance and the **National Institute of Design (NID)** entrance.

Tests typically assess drawing, observation, visualisation, and design thinking, followed by a situation test or interview for shortlisted candidates. Practice drawing from life, not only from imagination. Keep a sketchbook and date your work.

A portfolio is evidence of process: rough sketches, rejected ideas, iterations, and final work. Admissions teams want to see how you think, not only the polished result.

Check each institute's official site for current programmes and selection stages.

**Next step:** Start a 10-day sketchbook habit: one object, one observation note, and one alternative design each day.$md$, 'https://www.nift.ac.in', '9', '12', 10, true),
  ('engineering-and-technology', 'Engineering and technology careers', 'career', 'Science', 'What engineers actually do, and how to explore early.', $md$Engineering applies science and design to real constraints: cost, safety, materials, and time.

Major branches include computer science, electronics, mechanical, civil, chemical, electrical, and aerospace, plus newer areas such as robotics and data engineering.

What the work looks like: understanding a problem, modelling it, building a prototype, testing, and improving. Most of the job is communication and trade-offs, not solitary genius.

Explore early by building small things: a webpage, an Arduino sensor project, a bridge model, or a data analysis of your own study habits. Document what failed.

**Next step:** Pick one branch and find a 20-minute video of an engineer describing a normal week.$md$, NULL, '8', '12', 11, true),
  ('medicine-and-healthcare', 'Medicine and healthcare careers', 'career', 'Science', 'Beyond MBBS: nursing, pharmacy, allied health, and research.', $md$Healthcare is much broader than becoming a doctor. Routes include MBBS, BDS, nursing, pharmacy, physiotherapy, occupational therapy, medical laboratory science, radiology, nutrition, and public health.

Common features: science foundations, careful observation, communication with anxious people, and strict safety habits. Clinical work involves shift schedules and emotional load, so speak to practitioners before committing.

Volunteering at a health camp, learning first aid, or shadowing a local clinic can clarify whether the daily reality fits you.

**Next step:** List three healthcare roles and the qualification each requires. Then identify one you can observe safely with a trusted adult.$md$, NULL, '9', '12', 12, true),
  ('commerce-and-finance', 'Commerce and finance careers', 'career', 'Commerce', 'Accounting, banking, analysis, and entrepreneurship.', $md$Commerce careers include chartered accountancy, company secretaryship, cost and management accounting, banking, insurance, financial analysis, marketing, and entrepreneurship.

The core skills are numerical accuracy, reading rules carefully, explaining decisions, and maintaining integrity under pressure. Many roles require professional exams after graduation, so plan for several years of study alongside work.

Explore by managing a small real budget, reading a company's annual report, or learning spreadsheet modelling.

**Next step:** Open the annual report of a company you know and find its revenue, profit, and cash flow. Write three sentences on what changed.$md$, NULL, '9', '12', 13, true),
  ('design-and-creative', 'Design and creative careers', 'career', 'Design', 'UX, graphic, fashion, film, and content.', $md$Creative careers include graphic design, UX and product design, fashion, textile, interior, animation, film, photography, and content creation.

The work is iterative: brief, research, sketch, critique, revise. Feedback is constant, and the ability to explain a decision matters as much as taste.

Build a portfolio of process, not just final images. Learn one tool deeply (Figma, Illustrator, Blender, or a camera) and one fundamental skill (composition, typography, or storytelling).

**Next step:** Redesign one screen of an app you use daily. Show the before, three sketches, and the final version with reasons.$md$, NULL, '8', '12', 14, true),
  ('law-and-public-policy', 'Law and public policy', 'career', 'Arts / Humanities', 'Argument, evidence, and institutions.', $md$Law and policy careers include litigation, corporate law, legal aid, civil services, think tanks, governance, and journalism.

The core work is reading closely, constructing arguments, spotting contradictions, and writing precisely. You do not need to memorise every law; you need to reason from principles and evidence.

Explore by following a local civic issue, reading a court judgment summary, or debating a policy in a structured format.

**Next step:** Pick one local issue and write a one-page brief: the problem, who is affected, two options, and your recommendation.$md$, NULL, '9', '12', 15, true),
  ('civil-services', 'Civil services and public administration', 'career', 'All streams', 'UPSC and state services: scope, stages, and preparation.', $md$Civil services include the Indian Administrative Service, Indian Police Service, Indian Foreign Service, and state services. Selection usually involves a preliminary objective exam, a written main exam, and an interview.

The syllabus rewards broad reading, clear writing, ethical reasoning, and current affairs. Preparation is a multi-year project; start with understanding the exam and building a reading habit, not with buying every book.

Talk to serving officers if possible. The job involves public accountability, transfers, and difficult trade-offs.

**Next step:** Read the official UPSC syllabus and choose two optional subjects you would enjoy studying for years.$md$, 'https://upsc.gov.in', '10', '12', 16, true),
  ('digital-and-data-careers', 'Digital and data careers', 'career', 'All streams', 'Software, data, cybersecurity, and product roles.', $md$Digital careers include software development, data analysis, data science, cybersecurity, product management, and technical support.

A common myth is that you need a computer-science degree for all of them. Some roles do require formal qualifications; many entry paths value demonstrated skill. Build evidence: small projects, a public portfolio, and clear explanations of what you built.

Start with one language (Python or JavaScript), one data tool (spreadsheets, then SQL), and one habit: version control with Git.

**Next step:** Complete one beginner project and publish it with a short README explaining the problem and your approach.$md$, NULL, '8', '12', 17, true),
  ('national-scholarship-portal', 'National Scholarship Portal', 'scholarship', NULL, 'One portal for many government scholarships.', $md$The **National Scholarship Portal (NSP)** is the Government of India's platform for several central and state scholarship schemes.

Typical requirements include identity details, bank account information, income or category certificates, and previous marksheets. Deadlines differ by scheme, and incomplete applications are a common reason for rejection.

Practical advice:

- Read the scheme guidelines before starting.
- Use the exact name and details on your bank account and identity documents.
- Keep scanned copies ready in the required size and format.
- Submit early; portals slow down near deadlines.
- Track the application status and respond to verification requests.

Never pay an agent to "guarantee" a scholarship. Apply through the official portal.

**Next step:** Create a folder with your identity document, bank details, last marksheet, and income certificate. Check which schemes you may be eligible for.$md$, 'https://scholarships.gov.in', '9', '12', 18, true),
  ('school-and-state-scholarships', 'School and state scholarships', 'scholarship', NULL, 'Where to look beyond the national portal.', $md$Besides the NSP, scholarships are offered by state governments, schools, trusts, and companies.

Where to look:

- Your school office and notice board.
- The state education department website.
- Public sector companies and foundations.
- Universities you plan to apply to.

Check eligibility carefully: family income limits, category, attendance, and whether the award is renewed yearly. Keep a calendar of deadlines and required documents.

Be cautious with private "scholarship" offers that ask for a fee or bank details before selection.

**Next step:** Ask your school office for a list of scholarships current students have received. Add their deadlines to a calendar.$md$, NULL, '8', '12', 19, true),
  ('build-a-portfolio', 'Build a portfolio that proves your work', 'skill', NULL, 'A simple structure anyone can start this week.', $md$A portfolio is a small, honest collection of work that shows what you can do.

Structure:

1. **One-line introduction** — who you are and what you are learning.
2. **Three projects** — each with the problem, what you built, and what you learned.
3. **Evidence** — screenshots, a live link, code, or a short video.
4. **Contact** — a professional email.

Quality beats quantity. A single finished project with a clear explanation is stronger than ten half-started ones.

Publish it somewhere free: a simple website, a document, or a repository with a README. Update it every term.

**Next step:** Write the problem and result for one project you have already completed. That is your first portfolio entry.$md$, NULL, '8', '12', 20, true),
  ('learn-to-code-roadmap', 'A realistic learn-to-code roadmap', 'skill', NULL, 'What to learn first, and what to ignore for now.', $md$A workable order for self-study:

1. **One language** — Python or JavaScript. Learn variables, conditionals, loops, functions, and lists.
2. **Small programs** — calculator, quiz, to-do list, number guessing game.
3. **Version control** — Git and a GitHub account.
4. **One domain** — web, data, or automation. Go deep in one before adding another.
5. **One real project** — something you actually want to use.

Ignore framework churn, competitive "100 days" challenges, and tool shopping until you can build a small program without following a tutorial line by line.

Study in 25-minute blocks. Type every example yourself. When stuck, read the error, isolate the smallest failing case, and ask a specific question.

**Next step:** Choose one language and build a number-guessing game this week. Publish the code with a README.$md$, NULL, '6', '12', 21, true),
  ('communication-that-works', 'Communication that works', 'skill', NULL, 'Speak and write so people can act.', $md$Clear communication is a career skill in every field.

For writing: start with the point, then give context, then the ask. Use short sentences. Cut adjectives that do not add information.

For speaking: pause instead of filling silence with "um". Make eye contact for a few seconds at a time. If you do not know, say so and describe how you will find out.

For presentations: one idea per slide, large text, and a spoken explanation. Do not read the slide aloud.

For disagreement: describe the behaviour, its impact, and a proposed alternative. "When the file was submitted late, we could not review it; can we agree on a 6 p.m. deadline?" is easier to act on than "You are irresponsible."

**Next step:** Record a 60-second explanation of something you learned this week. Listen once and remove one unnecessary sentence.$md$, NULL, '6', '12', 22, true)
ON CONFLICT (slug) DO UPDATE SET
  title = excluded.title,
  category = excluded.category,
  stream = excluded.stream,
  summary = excluded.summary,
  content_md = excluded.content_md,
  link_url = excluded.link_url,
  min_class = excluded.min_class,
  max_class = excluded.max_class,
  sort_order = excluded.sort_order,
  published = true;
