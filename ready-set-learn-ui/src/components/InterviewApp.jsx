import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import Loader from "./Loader";

const API_BASE = "https://effective-space-capybara-97x76xwj9p762p5p6-5000.app.github.dev" || "http://localhost:5000";

export default function InterviewApp() {
  const [tech, setTech] = useState("javascript");
  const [category, setCategory] = useState("problems");
  const [questions, setQuestions] = useState({
    performance: [],
    refactor: [],
    unitTests: [],
    problems: [],
  });
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [code, setCode] = useState("// Select a question and click Load Questions");
  const [output, setOutput] = useState("");
  const [hint, setHint] = useState("");
  const [solution, setSolution] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const withLoader = async (fn) => {
    try {
      setLoading(true);
      await fn();
    } finally {
      setLoading(false);
    }
  };

  // Load questions
  const loadQuestions = async () => {
    await withLoader(async () => {
      setOutput(""); setHint(""); setSolution(""); setShowSolution(false);
      setChatMessages([]);
      try {
        const res = await fetch(`${API_BASE}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tech }),
        });
        const data = await res.json();
        setQuestions(data);
        const firstQ = data[category]?.[0] || "";
        setSelectedQuestion(firstQ);
        if (firstQ) await fetchStarterWithSolution(firstQ);
      } catch {
        setOutput("Failed to load questions.");
      }
    });
  };

  const handleQuestionChange = async (e) => {
    const selected = e.target.value;
    setSelectedQuestion(selected);
    setOutput(""); setHint(""); setSolution(""); setShowSolution(false);
    setChatMessages([]);
    if (selected) await fetchStarterWithSolution(selected);
  };

  const fetchStarterWithSolution = async (question) => {
    await withLoader(async () => {
      try {
        const res = await fetch(`${API_BASE}/starter-with-solution`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, tech }),
        });
        const data = await res.json();
        setCode(data.starterCode || "// Could not fetch starter code");
        setSolution(data.solution || "// Could not fetch solution");
        setShowSolution(false);
      } catch {
        setCode("// Failed to fetch starter code");
        setSolution("// Failed to fetch solution");
      }
    });
  };

  const getHint = async () => {
    if (!selectedQuestion) return setHint("Select a question first.");
    await withLoader(async () => {
      try {
        const res = await fetch(`${API_BASE}/hint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: selectedQuestion, tech }),
        });
        const data = await res.json();
        setHint(data.hint || "No hint available.");
      } catch {
        setHint("Failed to get hint.");
      }
    });
  };

  const handleShowSolution = () => solution && setShowSolution(true);

  const runCode = async () => {
    if (tech === "sql") return;
    await withLoader(async () => {
      setOutput("Running...");
      try {
        const resp = await fetch(`${API_BASE}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language: tech, stdin: "" }),
        });
        const data = await resp.json();
        if (data.error) return setOutput(`Error: ${data.error}`);

        let out = "";
        if (data.stdout) out += data.stdout;
        else if (data.compile_output) out += `Compilation Error:\n${data.compile_output}`;
        else if (data.stderr) out += `Runtime Error:\n${data.stderr}`;
        else out += "No output.";
        setOutput(out.trim());
      } catch {
        setOutput("Execution failed");
      }
    });
  };

  // Chat
  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    const newChat = [...chatMessages, userMsg];
    setChatMessages(newChat);
    setChatInput("");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: selectedQuestion,
          tech,
          messages: newChat,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Chat failed. Try again." }]);
    }
  };

  // Format chat message content (text + code blocks)
  const renderMessageContent = (content) => {
    const parts = content.split(/```(.*?)\n([\s\S]*?)```/g);
    return parts.map((part, idx) => {
      if (idx % 3 === 1) return null; // language
      if (idx % 3 === 2) {
        return (
          <pre key={idx} style={{ background: "#eee", padding: 6, borderRadius: 4, overflowX: "auto", fontFamily: "monospace" }}>
            {part}
          </pre>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div style={{ fontFamily: "sans-serif", height: "100vh", display: "flex", flexDirection: "column" }}>
      {loading && <Loader />}

      <nav style={{ background: "#222", color: "#fff", padding: "15px", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 20 }}>Ready Set Learn</div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={tech} onChange={(e) => setTech(e.target.value)}>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="nodejs">NodeJs</option>
          </select>
          <button className="action-button" onClick={loadQuestions}>Load Questions</button>
        </div>
      </nav>

      <div style={{ textAlign: "center", padding: 8, margin: "7px 0 5px" }}>
        <label style={{ marginRight: 8 }}>Category :</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "15%", padding: "6px 10px" }}>
          <option value="performance">Performance Improvement</option>
          <option value="refactor">Code Refactoring</option>
          <option value="unitTests">Fixing Unit Test Cases</option>
          <option value="problems">Problem Statements</option>
        </select>

        <label style={{ marginLeft: 8, marginRight: 8 }}>Choose Question:</label>
        <select value={selectedQuestion} onChange={handleQuestionChange} style={{ width: "50%", padding: "6px 10px" }}>
          <option value="">-- Select a question --</option>
          {questions[category]?.map((q, i) => (
            <option key={i} value={q}>{q.length > 120 ? q.slice(0, 120) + "..." : q}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 12, padding: 12, flex: 1, minHeight: 0 }}>
        {/* Editor */}
        <div style={{ minHeight: 0 }}>
          <Editor
            height="100%"
            defaultLanguage={tech === "java" ? "java" : tech}
            value={code}
            onChange={(val) => setCode(val)}
            theme="vs-dark"
            options={{ automaticLayout: true }}
          />
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
            <button className="action-button" onClick={runCode} disabled={tech === "sql" || loading}>Run Code</button>
            <button className="action-button" onClick={getHint} disabled={!selectedQuestion || loading}>Get Hint</button>
            <button className="action-button" onClick={handleShowSolution} disabled={!selectedQuestion || loading}>Get Solution</button>
          </div>

          {/* Output */}
          <div style={{ flex: 1, overflow: "auto", border: "1px solid #ddd", padding: 5, background: "#fff", marginBottom: 8 }}>
            <h3>Output</h3>
            <pre style={{textAlign: "left"}}>{output}</pre>
          </div>

          {/* Hint & Solution */}
          <div style={{ flex: 1, overflow: "auto", border: "1px solid #ddd", padding: 5, background: "#fff", marginBottom: 8 }}>
            <h3>Hint & Solution</h3>
            {hint && <><h4>Hint</h4><pre style={{textAlign : "left"}}>{hint}</pre></>}
            {showSolution && solution && <><h4>Solution</h4><pre style={{textAlign : "left"}}>{solution}</pre></>}
          </div>

          {/* Chat Window */}
          <div style={{ height: 200, display: "flex", flexDirection: "column", border: "1px solid #ddd", background: "#fff" }}>
            <h3>Ask Us</h3>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "2px 0" }}>
                  <div style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: msg.role === "user" ? "#007bffff" : "#eee",
                    color: msg.role === "user" ? "#fff" : "#000",
                    maxWidth: "100%",
                  }}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", borderTop: "1px solid #eee" }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about the question..."
                style={{ flex: 1, padding: "8px", border: "none" }}
              />
              <button onClick={sendMessage} style={{ padding: "8px 12px" }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
