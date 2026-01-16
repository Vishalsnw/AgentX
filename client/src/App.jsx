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

  const [repoPath, setRepoPath] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'github-token') {
        const token = event.data.token;
        localStorage.setItem('github_token', token);
        fetch('/api/git_auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        }).then(res => res.json()).then(data => alert(data.message));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const authenticateGithub = async () => {
    const res = await fetch('/api/auth/github');
    const data = await res.json();
    window.open(data.url, 'GitHub Auth', 'width=600,height=700');
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
          <button onClick={cloneRepo} title="Clone Repo" className="p-2 hover:bg-gray-700 rounded transition">
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

      <main className="flex-1 flex overflow-hidden">
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
