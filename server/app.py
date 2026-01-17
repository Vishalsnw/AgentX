import os
import json
import requests
import git
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-68be7759cb7746dbb0b90edba8e78fe0")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    system_prompt = {
        "role": "system",
        "content": "You are a Replit Agent replica. You can write code, create files, and debug. When asked to create an app, provide the file structure and contents in a JSON-parsable format: {\"files\": [{\"path\": \"filename\", \"content\": \"...\"}]}."
    }
    response = requests.post(
        DEEPSEEK_URL,
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "deepseek-chat",
            "messages": [system_prompt] + messages
        }
    )
    return jsonify(response.json())

@app.route('/api/execute', methods=['POST'])
def execute():
    import subprocess
    data = request.json
    command = data.get('command')
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/write_files', methods=['POST'])
def write_files():
    data = request.json
    files = data.get('files', [])
    results = []
    for f in files:
        path = f.get('path')
        content = f.get('content')
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w') as file:
                file.write(content)
            results.append({"path": path, "status": "success"})
        except Exception as e:
            results.append({"path": path, "status": "error", "message": str(e)})
    return jsonify(results)

@app.route('/api/auth/github')
def github_login():
    client_id = os.environ.get("GITHUB_CLIENT_ID") or "Ov23lipwgA5vPc0x7HbV"
    redirect_uri = os.environ.get("REDIRECT_URI") or "https://agent-x-tawny.vercel.app/api/github/callback"
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo,user"
    return jsonify({"url": url})

@app.route('/api/github/callback')
def github_callback():
    code = request.args.get('code')
    if not code: return "No code provided", 400
    client_id = os.environ.get("GITHUB_CLIENT_ID") or "Ov23lipwgA5vPc0x7HbV"
    client_secret = os.environ.get("GITHUB_CLIENT_SECRET") or "9d890e753b9806d6cc6269016de5a9dc35684a3f"
    redirect_uri = os.environ.get("REDIRECT_URI") or "https://agent-x-tawny.vercel.app/api/github/callback"
    res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri}
    )
    token_data = res.json()
    access_token = token_data.get('access_token')
    if access_token:
        return f"<html><script>if(window.opener){{window.opener.postMessage({{type:'github-token',token:'{access_token}'}},'*');setTimeout(()=>window.close(),1000);}}else{{document.body.innerHTML='Login successful!';}}</script><body>Authenticating...</body></html>"
    return f"Auth failed: {token_data.get('error_description', 'Unknown')}", 400

@app.route('/api/github/repos')
def get_github_repos():
    token = request.args.get('token') or os.environ.get("GITHUB_TOKEN_SECRET")
    if not token: return jsonify({"error": "No token"}), 401
    headers = {"Accept": "application/vnd.github.v3+json", "Authorization": f"token {token}"}
    res = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers)
    if res.status_code == 200:
        return jsonify([{"name": r["full_name"], "url": r["html_url"]} for r in res.json()])
    return jsonify({"error": res.json().get('message', 'Error')}), res.status_code

@app.route('/api/git_clone', methods=['POST'])
def git_clone():
    data = request.json
    repo_url, token = data.get('repo_url'), data.get('token') or os.environ.get("GITHUB_TOKEN_SECRET")
    if not repo_url: return jsonify({"error": "No URL"}), 400
    if token: repo_url = repo_url.replace("https://github.com/", f"https://{token}@github.com/")
    try:
        folder = repo_url.split('/')[-1].replace('.git', '').split('@')[-1]
        path = os.path.join(os.getcwd(), folder)
        if os.path.exists(path): return jsonify({"status": "success", "path": path})
        git.Repo.clone_from(repo_url, path)
        return jsonify({"status": "success", "path": path})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/git_operation', methods=['POST'])
def git_operation():
    data = request.json
    op, path, msg = data.get('operation'), data.get('path'), data.get('message', 'Update')
    try:
        repo = git.Repo(path)
        if op == 'pull': repo.remotes.origin.pull(); return jsonify({"status": "success"})
        if op == 'push':
            repo.config_writer().set_value("user", "email", "agent@replica.com").release()
            repo.config_writer().set_value("user", "name", "Agent").release()
            token = os.environ.get("GITHUB_TOKEN_SECRET")
            if token:
                origin = repo.remote('origin')
                if token not in origin.url: origin.set_url(origin.url.replace("https://github.com/", f"https://{token}@github.com/"))
            repo.git.add(A=True); repo.index.commit(msg); repo.remotes.origin.push()
            return jsonify({"status": "success"})
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
