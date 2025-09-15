import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import { examples } from "./examples.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Map languages to Judge0 IDs
const LANGUAGE_MAP = {
  javascript: 63, // Node.js
  java: 62,
  dotnet: 51,
};

// Helper: comment style
function commentStyleFor(tech) {
  const t = (tech || "").toLowerCase();
  if (t.includes("python")) return { start: '"""', end: '"""' };
  if (t.includes("sql")) return { start: "/*", end: "*/" };
  return { start: "/*", end: "*/" }; // JS/Java/C# etc.
}

// -------------------- QUESTIONS --------------------
// app.post("/questions", async (req, res) => {
//   try {
//     const { tech } = req.body;
//     if (!tech) return res.status(400).json({ error: "tech required" });

//     const localExamples = examples[tech.toLowerCase()] || [];

//     const prompt = `
// You are an expert interview question generator for ${tech}.
// Generate questions in 4 categories:

// 1. Performance Improvement
// 2. Code Refactoring
// 3. Fixing Unit Test Cases
// 4. Problem Statements

// For Problem Statements, follow the style of these examples:
// ${localExamples.join("\n")}

// Return output as valid JSON in this exact format:
// {
//   "performance": [ "Q1", "Q2", ... ],
//   "refactor": [ "Q1", "Q2", ... ],
//   "unitTests": [ "Q1", "Q2", ... ],
//   "problems": [ "Q1", "Q2", ... ]
// }
// Each array should contain exactly 10 questions.
// IMPORTANT: Return only JSON, no explanations, no markdown.
// `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 1500,
//     });

//     let raw = completion.choices[0].message.content.trim();
//     let parsed;
//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
//       parsed = JSON.parse(raw);
//     }

//     res.json(parsed);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to generate questions" });
//   }
// });
// app.post("/questions", async (req, res) => {
//   try {
//     const { tech } = req.body;
//     if (!tech) return res.status(400).json({ error: "tech required" });

//     const localExamples = examples[tech.toLowerCase()] || [];

//     const prompt = `
// You are an expert interview question generator for ${tech}.
// Generate a total of 10 interview questions, split into 4 categories:

// 1. Performance Improvement
// 2. Code Refactoring
// 3. Fixing Unit Test Cases
// 4. Problem Statements

// For Problem Statements, follow the style of these examples:
// ${localExamples.join("\n")}

// Return output as valid JSON in this exact format:
// {
//   "performance": [ "Q1", "Q2" ],
//   "refactor": [ "Q3", "Q4" ],
//   "unitTests": [ "Q5", "Q6" ],
//   "problems": [ "Q7", "Q8", "Q9", "Q10" ]
// }

// ⚠️ The total must be exactly 10 questions across all categories.
// Do not include explanations. Only return valid JSON.
// `;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 1000,
//     });

//     let raw = completion.choices[0].message.content.trim();
//     let parsed;
//     try {
//       parsed = JSON.parse(raw);
//     } catch {
//       raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
//       parsed = JSON.parse(raw);
//     }

//     res.json(parsed);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to generate questions" });
//   }
// });
app.post("/questions", async (req, res) => {
  try {
    const { tech } = req.body;
    if (!tech) return res.status(400).json({ error: "tech required" });

    const localExamples = examples[tech.toLowerCase()] || [];

    //console.log(`localExamples for ${tech}: `,localExamples)

    const prompt = `
You are an expert ${tech} interview question generator.

Generate exactly 10 interview questions split into these categories:
1. Performance Improvement
2. Code Refactoring
3. Fixing Unit Test Cases
4. Problem Statements

⚡ RULES:
- For "Problem Statements", you MUST strictly follow the style and format of these examples:
${localExamples.join("\n")}
- Questions must NEVER require user input (stdin, console input, prompt, Scanner, readline, etc.).
- All problems must use hardcoded sample data or predefined function arguments.
- Avoid vague or open-ended questions; each should be directly solvable in code.
- Keep difficulty between easy and medium for interviews.

Return ONLY valid JSON in this format:
{
  "performance": ["Q1", "Q2"],
  "refactor": ["Q3", "Q4"],
  "unitTests": ["Q5", "Q6"],
  "problems": ["Q7", "Q8", "Q9", "Q10"]
}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    let raw = completion.choices[0].message.content.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(raw);
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});



// -------------------- STARTER + SOLUTION --------------------
app.post("/starter-with-solution", async (req, res) => {
  const { question, tech } = req.body;
  if (!question || !tech)
    return res.status(400).json({ error: "question and tech required" });

  const { start, end } = commentStyleFor(tech);

  try {
    const starterPrompt = `
Question: "${question}"
Generate a starter code template in ${tech}:
- Include the question at the top using ${start} ... ${end}.
- Use TODO comments where implementation is needed.
- If Java, class MUST be named Main with public static void main(String[] args).
Return only raw code, no markdown.
`;
    const starterResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: starterPrompt }],
      max_tokens: 700,
    });

    let starterCode = starterResp.choices[0].message.content.trim();
    starterCode = starterCode.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();

    const solutionPrompt = `
Question: "${question}"
Here is the starter code:
${starterCode}
Complete it into a fully working solution in ${tech}.
If Java, class MUST be named Main with public static void main(String[] args).
Return only the final code, nothing else.
`;
    const solutionResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: solutionPrompt }],
      max_tokens: 700,
    });

    let solution = solutionResp.choices[0].message.content.trim();
    solution = solution.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();

    res.json({ starterCode, solution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate starter and solution" });
  }
});

// -------------------- HINT --------------------
app.post("/hint", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "question required" });

    const prompt = `Provide a concise, helpful hint (not a full solution) for this interview question: "${question}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    const hint = completion.choices[0].message.content.trim();
    res.json({ hint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get hint" });
  }
});

// -------------------- EXECUTION (Public Judge0) --------------------
app.post("/execute", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    if (!code || !language)
      return res.status(400).json({ error: "code and language required" });

    const language_id = LANGUAGE_MAP[language.toLowerCase()];
    if (!language_id) return res.status(400).json({ error: "unsupported language" });

    const submissionRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: code, language_id, stdin: stdin || "" }),
    });

    const submission = await submissionRes.json();
    if (!submission.token)
      return res.status(500).json({ error: "Failed to create submission" });

    const token = submission.token;
    let result = null;
    for (let attempts = 0; attempts < 20; attempts++) {
      const rRes = await fetch(`https://ce.judge0.com/submissions/${token}?base64_encoded=false`);
      const r = await rRes.json();
      if (r?.status?.id > 2) {
        result = r;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!result) return res.status(504).json({ error: "Execution timed out" });

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: result.status,
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Execution failed" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { question, tech, messages } = req.body;

    // Add system message to guide OpenAI
    const systemMessage = {
      role: "system",
      content: `You are an AI coding assistant. The user is solving interview questions in ${tech}. 
      The current question is: "${question}". Give insights, hints, or explanations when asked.`,
    };

    // Prepend system message to conversation
    const conversation = [systemMessage, ...messages];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or gpt-4.1-mini
      messages: conversation,
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to get chat response" });
  }
});



app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
