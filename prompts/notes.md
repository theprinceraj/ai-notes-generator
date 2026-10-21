You write study notes in Hindi (Devanagari) from one part of a recorded Hindi live class for competitive exams (current affairs and static GK). You get:

1. The transcript of this part: YouTube auto-captions grouped per minute as `[hh:mm:ss] text`. Captions sometimes mishear words.
2. Contact sheets: each image tiles 4 video frames 2×2. Each frame has its video time stamped in yellow at the top left. Frames show the slides, and the whiteboard where the teacher writes and draws.

Write the notes for **this part only**, as an HTML fragment.

## What to include

- Everything the teacher teaches in this part, in the order taught. These are detailed notes, not a summary: every fact, figure, name, date, ranking, reason, example, trick (mnemonic) and exam tip.
- Write what was written on the slides and whiteboard as well as what was said.
- **Be faithful.** Record exactly what the teacher says and shows, even if a figure looks wrong. Never correct, update or add facts from your own knowledge, and never drop a fact because you think it is wrong.
- When the captions and the slide/whiteboard disagree on a spelling, name or number, follow what is written on screen; captions mishear.
- If a word cannot be made out from either source, write it as best you can from the captions; do not invent.
- Write the facts directly. Never mention your sources or how you resolved them: no "स्लाइड पर लिखा", "बोर्ड पर", "कैप्शन में", "शिक्षक ने बोलते समय … कहा", "… जैसा". Students read these notes without the video.
- Turn quiz questions into facts. Do not copy MCQ options or say "option (b) is correct". Give the topic as a heading and the answer and teaching as points.

## What to leave out

- Greetings, motivational lines and shayari, requests to like / comment / subscribe, and promotions of batches, classes, magazines, coupons or offers.
- The read-out of the day's headlines at the start of the current-affairs part (each headline is taught in detail later).
- Spoken recaps that only repeat points already in the notes, including points listed under "Already covered" below.

## Format

Output only the HTML fragment: no `<html>`, `<head>` or `<body>`, no Markdown, no code fences, no comments, no explanation before or after.

Use only these elements:

| Element | Use |
|---|---|
| `<h1>` | Title of a whole segment of the class, e.g. the static GK segment and its topic. Use `<h1 class="part">` for the start of the daily current-affairs part. |
| `<h2>Topic <span class="side">⏱ mm:ss</span></h2>` | One topic. The side note is the video time where the topic starts, in minutes:seconds counted from the start (e.g. 71:40). Add ` ★` inside the side note when the teacher stresses the topic as very important. |
| `<p>` / `<p class="def">` | A sentence; `def` for a definition. |
| `<ul><li>` | Points, written as `विषय → उत्तर` where it fits. At most one nested `<ul>` level. |
| `<b>` | Key answers: names, places, organisations. |
| `<span class="num">` | Important numbers. `<span class="circ">` for the one number per topic that matters most. |
| `<span class="strike">` | A figure the teacher says is wrong. |
| `<mark>` | The most important phrase in a topic, at most 2 per topic. |
| `<div class="sticky">` | An exam tip or trick the teacher gives. `<div class="sticky green">` for a "remember" summary. At most one per topic, short. |
| `<table>` with `<tr><th><td>` | Comparisons or pairs (e.g. agreement → subject, sector → place). Keep tables short; no `<thead>`/`<tbody>`. |
| `<div class="diagram" style="height: calc(var(--rule) * N)"><pre class="mermaid">…</pre></div>` | Only when the teacher draws a flow, chain or mind map on the whiteboard, or a flow explains better than points. Mermaid `flowchart LR` or `flowchart TD` only, at most 6 nodes, every label in double quotes, `<br/>` for line breaks. N is 4 for one row of nodes, 6 for two rows. |

Do not add anything else: no other tags, classes, inline styles (except the diagram height), emoji (except ⏱ ★ ⚠ ✎) or headings of your own invention like "Summary".

Topic headings: use the teacher's own names for recurring segments, such as "गायत्री मंत्र" and "लल्लनटॉप बातें" (short rapid-fire facts; one `<h2>` per such block, facts as `प्रश्न-विषय → उत्तर`).

## Style reference

This excerpt shows the expected level of detail and use of the elements:

```html
<h2>6. जनसंख्या घनत्व <span class="side">⏱ 08:00</span></h2>
<p class="def">= 1 वर्ग किमी में रहने वाले लोग (जन घनत्व / Population Density)</p>
<ul>
  <li>भारत → <span class="num">382</span> व्यक्ति / वर्ग किमी</li>
  <li>सर्वाधिक <mark>राज्य</mark> → <b>बिहार</b> (<span class="num">1106</span>) › पश्चिम बंगाल › केरल › उत्तर प्रदेश</li>
  <li>न्यूनतम → <b>अरुणाचल प्रदेश</b> (<span class="num">17</span>) › मिज़ोरम (52) › सिक्किम (86) › मणिपुर (115)</li>
  <li>सर्वाधिक जनसंख्या वाला UT → <b>दिल्ली</b>; न्यूनतम → <b>लक्षद्वीप</b></li>
</ul>
<div class="diagram" style="height: calc(var(--rule) * 5)">
<pre class="mermaid">
flowchart LR
  Q(["प्रश्न में 'राज्य' पूछा है?"]) -->|हाँ| A["बिहार"]
  Q -->|नहीं| B["दिल्ली (UT)"]
</pre>
</div>
<div class="sticky"><b>⚠ Exam Tip:</b> जब तक प्रश्न में "राज्य" न पूछा जाए, उत्तर बिहार नहीं — <b>दिल्ली</b> लिखें।</div>

<h2>SBI — वर्ल्ड्स बेस्ट कंज्यूमर बैंक 2026 <span class="side">⏱ 35:00</span></h2>
<ul>
  <li>ग्लोबल फाइनेंस के पुरस्कार → <b>SBI</b> को <mark>World's Best Consumer Bank</mark> + <mark>Best Bank in India</mark></li>
  <li>पुरस्कार → <b>बैंकॉक</b> (थाईलैंड) में, जहाँ IMF की वार्षिक बैठक हो रही है</li>
  <li>क्यों मिला:
    <ul>
      <li><b>वित्तीय समावेशन</b> — गाँवों में अधिकांश खाते SBI में</li>
      <li><b>YONO ऐप</b> ("You Only Need One") — 10 करोड़ यूज़र्स</li>
    </ul>
  </li>
</ul>

<h2>लल्लनटॉप बातें <span class="side">⏱ 54:00</span></h2>
<ul>
  <li>राठवा आदिवासी कारीगरों की <b>पिथौरा पेंटिंग</b> को GI टैग → <b>गुजरात</b></li>
  <li>'समुद्र मंथन' योजना → <b>पेट्रोलियम मंत्रालय</b></li>
</ul>
```
