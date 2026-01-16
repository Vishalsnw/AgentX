import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, FileCode, Play, Github } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });
      const data = await res.json();
      const aiContent = data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

      // Attempt to parse and write files if JSON detected
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*"files"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          await fetch('/api/write_files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: parsed.files })
          });
          setLogs(prev => [...prev, `Created ${parsed.files.length} files.`]);
        }
      } catch (e) {}

    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    const command = prompt("Enter shell command (e.g., kotlinc main.kt -include-runtime -d main.jar && java -jar main.jar):");
    if (!command) return;
    setLogs(prev => [...prev, `> ${command}`]);
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    if (data.stdout) setLogs(prev => [...prev, data.stdout]);
    if (data.stderr) setLogs(prev => [...prev, `ERR: ${data.stderr}`]);
  };

  const [repos, setRepos] = useState([]);
  const [showRepoList, setShowRepoList] = useState(false);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('github_token');
      const res = await fetch(`/api/github/repos?token=${encodeURIComponent(token || '')}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
        setShowRepoList(true);
      } else {
        alert(data.error || "Failed to fetch repos");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = async (repoUrl) => {
    setShowRepoList(false);
    setLogs(prev => [...prev, `Cloning ${repoUrl}...`]);
    setLoading(true);
    try {
      const token = localStorage.getItem('github_token');
      const res = await fetch('/api/git_clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, token: token })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(prev => [...prev, `Success: ${data.message}`]);
        setRepoPath(data.path);
      } else {
        setLogs(prev => [...prev, `Error: ${data.message || data.error}`]);
      }
    } finally {
      setLoading(false);
    }
  };

  const authenticateGithub = async () => {
    const token = prompt("Enter your GitHub Personal Access Token (PAT):\n1. Go to GitHub Settings > Developer Settings > Tokens (classic)\n2. Generate new token with 'repo' scope\n3. Paste it here.");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/git_auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      console.log("Auth response:", data); // Debug log
      if (data.status === 'success') {
        localStorage.setItem('github_token', token);
        alert("GitHub Authenticated!");
      } else {
        alert("Auth Error: " + data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const gitOp = async (op) => {
    if (!repoPath) return alert("Clone a repo first!");
    const message = op === 'push' ? prompt("Commit message:") : null;
    setLoading(true);
    try {
      const res = await fetch('/api/git_operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: op, path: repoPath, message })
      });
      const data = await res.json();
      setLogs(prev => [...prev, data.status === 'success' ? `${op} successful` : `Error: ${data.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const cloneRepo = async () => {
    const url = prompt("Enter GitHub Repository URL:");
    if (!url) return;
    setLogs(prev => [...prev, `Cloning ${url}...`]);
    setLoading(true);
    try {
      const res = await fetch('/api/git_clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url })
      });
      const data = await res.json();
      console.log("Clone response:", data);
      if (data.status === 'success') {
        setLogs(prev => [...prev, `Success: ${data.message}`]);
        setRepoPath(data.path);
      } else {
        setLogs(prev => [...prev, `Error: ${data.message || data.error}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Terminal size={24} /> Replit Replica
        </h1>
        <div className="flex gap-2">
          <button onClick={authenticateGithub} title="Auth GitHub" className="p-2 hover:bg-gray-700 rounded transition text-blue-400">
            <Github size={20} />
          </button>
          <button onClick={fetchRepos} title="List Repos" className="p-2 hover:bg-gray-700 rounded transition text-purple-400">
            <FileCode size={20} />
          </button>
          <button onClick={() => gitOp('pull')} title="Pull Changes" className="p-2 hover:bg-gray-700 rounded transition text-yellow-400">
            <Terminal size={20} />
          </button>
          <button onClick={() => gitOp('push')} title="Push Changes" className="p-2 hover:bg-gray-700 rounded transition text-orange-400">
            <Send size={20} />
          </button>
          <button onClick={runCode} className="p-2 hover:bg-gray-700 rounded transition text-green-400">
            <Play size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {showRepoList && (
          <div className="absolute inset-0 z-50 bg-gray-900 bg-opacity-95 p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Repository</h2>
              <button onClick={() => setShowRepoList(false)} className="px-4 py-2 bg-red-600 rounded hover:bg-red-500">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map(repo => (
                <button
                  key={repo.name}
                  onClick={() => handleRepoSelect(repo.url)}
                  className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 text-left border border-gray-700 transition"
                >
                  <div className="font-bold truncate">{repo.name}</div>
                  <div className="text-xs text-gray-500 truncate">{repo.url}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'ml-auto bg-blue-600' : 'bg-gray-800'}`}>
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          ))}
          {loading && <div className="text-gray-500 animate-pulse">Agent is thinking...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="w-80 bg-black border-l border-gray-800 flex flex-col">
          <div className="p-2 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-widest">Console</div>
          <div className="flex-1 p-2 font-mono text-sm overflow-y-auto text-green-500">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask agent to build something..."
          className="flex-1 bg-gray-800 border-none rounded-lg px-4 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button onClick={sendMessage} disabled={loading} className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500 disabled:opacity-50">
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
