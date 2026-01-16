import os
import json
import requests
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../client/dist', static_url_path='')
CORS(app)

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-68be7759cb7746dbb0b90edba8e78fe0")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN_SECRET", "sk-placeholder")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    
    # System prompt to act as Replit Agent
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

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("REDIRECT_URI")

@app.route('/api/auth/github')
def github_login():
    # Force re-read from os.environ to ensure we get the latest values
    client_id = os.environ.get("GITHUB_CLIENT_ID")
    redirect_uri = os.environ.get("REDIRECT_URI")
    
    # Ensure redirect_uri exactly matches what is in GitHub App settings
    if not client_id or not redirect_uri:
        client_id = client_id or "Ov23lipwgA5vPc0x7HbV"
        redirect_uri = redirect_uri or "https://agent-x-tawny.vercel.app/api/github/callback"
        
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo,user"
    return jsonify({"url": url})

@app.route('/api/github/callback')
def github_callback():
    code = request.args.get('code')
    if not code:
        return "No code provided", 400
    
    # Force re-read credentials for token exchange
    client_id = os.environ.get("GITHUB_CLIENT_ID") or "Ov23lipwgA5vPc0x7HbV"
    client_secret = os.environ.get("GITHUB_CLIENT_SECRET") or "9d890e753b9806d6cc6269016de5a9dc35684a3f"
    redirect_uri = os.environ.get("REDIRECT_URI") or "https://agent-x-tawny.vercel.app/api/github/callback"
    
    # Exchange code for token
    res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri
        }
    )
    token_data = res.json()
    access_token = token_data.get('access_token')
    
    if access_token:
        # Pass token back to frontend via postMessage
        return f"""
        <html>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{ type: 'github-token', token: '{access_token}' }}, '*');
                    setTimeout(() => window.close(), 1000);
                }} else {{
                    document.body.innerHTML = "Login successful! You can close this window and return to the app.";
                }}
            </script>
            <body>Authentication successful! Redirecting...</body>
        </html>
        """
    return f"Authentication failed: {token_data.get('error_description', 'Unknown error')}", 400

@app.route('/api/github/repos', methods=['GET'])
def get_github_repos():
    token = request.args.get('token')
    if not token:
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN_SECRET")
        
    if not token:
        return jsonify({"error": "GitHub not authenticated"}), 401
    
    token = token.strip()
    
    try:
        # Standard PAT format
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {token}"
        }
        res = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers)
        
        # If that fails, try modern Bearer format
        if res.status_code == 401:
            headers["Authorization"] = f"Bearer {token}"
            res = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers)

        if res.status_code == 200:
            repos = [{"name": r["full_name"], "url": r["html_url"]} for r in res.json()]
            return jsonify(repos)
        else:
            # Fallback: check if the user is using the token as a username/password (old git style)
            res = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", auth=(token, ''))
            if res.status_code == 200:
                repos = [{"name": r["full_name"], "url": r["html_url"]} for r in res.json()]
                return jsonify(repos)
                
            return jsonify({"error": f"GitHub API Error ({res.status_code}): {res.json().get('message', 'Check if your token is valid and has repo scope.')}"}), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/api/git_clone', methods=['POST'])
def git_clone():
    data = request.json
    repo_url = data.get('repo_url')
    if not repo_url:
        return jsonify({"error": "No repository URL provided"}), 400
    
    # Simple validation to ensure it's a github URL
    if "github.com" not in repo_url:
        return jsonify({"error": "Only GitHub URLs are supported"}), 400

    # Prioritize locally provided token from git_auth endpoint
    token = os.environ.get("GITHUB_TOKEN")
    
    # Fallback to secret in env
    if not token:
        token = os.environ.get("GITHUB_TOKEN_SECRET")
    if not token:
        token = os.environ.get("GITHUB_TOKEN")

    if token:
        # Construct authenticated URL if token exists
        repo_url = repo_url.replace("https://github.com/", f"https://{token}@github.com/")

    try:
        folder_name = repo_url.split('/')[-1].replace('.git', '').split('@')[-1]
        target_path = os.path.join(os.getcwd(), folder_name)
        
        if os.path.exists(target_path):
             return jsonify({"status": "success", "message": f"Folder {folder_name} already exists", "path": target_path})

        # Use the absolute path directly discovered via shell
        git_binary = "/nix/store/smaydcvrcaz906653vbnps70y9j7w658-git-2.49.0/bin/git"
        # Check if the binary exists at that specific path before running
        if not os.path.exists(git_binary):
            # Fallback to just "git" if the nix path changed
            git_binary = "git"
            
        result = subprocess.run([git_binary, "clone", repo_url, target_path], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            return jsonify({"status": "success", "message": f"Cloned into {folder_name}", "path": target_path})
        else:
            return jsonify({"status": "error", "message": result.stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/git_auth', methods=['POST'])
def git_auth():
    data = request.json
    token = data.get('token')
    if not token:
        return jsonify({"error": "Token is required"}), 400
    os.environ["GITHUB_TOKEN"] = token
    return jsonify({"status": "success", "message": "GitHub authenticated locally"})

@app.route('/api/git_operation', methods=['POST'])
def git_operation():
    data = request.json
    op = data.get('operation') # 'pull' or 'push'
    repo_path = data.get('path')
    message = data.get('message', 'Update from Agent Replica')
    
    if not os.path.exists(repo_path):
        return jsonify({"error": "Repository path does not exist"}), 400

    try:
        git_binary = "/nix/store/smaydcvrcaz906653vbnps70y9j7w658-git-2.49.0/bin/git"
        if not os.path.exists(git_binary):
            git_binary = "git"

        if op == 'pull':
            result = subprocess.run([git_binary, "-C", repo_path, "pull"], capture_output=True, text=True)
        elif op == 'push':
            # Configure user identity if not set
            subprocess.run([git_binary, "-C", repo_path, "config", "user.email", "agent@replica.com"], capture_output=True)
            subprocess.run([git_binary, "-C", repo_path, "config", "user.name", "Agent Replica"], capture_output=True)
            
            # Ensure the remote URL uses the token for authentication
            remotes = subprocess.run([git_binary, "-C", repo_path, "remote", "-v"], capture_output=True, text=True).stdout
            
            token = os.environ.get("GITHUB_TOKEN_SECRET") or os.environ.get("GITHUB_TOKEN")
            
            if token and "github.com" in remotes and token not in remotes:
                # Get the current remote URL (usually 'origin')
                remote_name = "origin"
                current_url = subprocess.run([git_binary, "-C", repo_path, "remote", "get-url", remote_name], capture_output=True, text=True).stdout.strip()
                if "https://github.com/" in current_url:
                    new_url = current_url.replace("https://github.com/", f"https://{token}@github.com/")
                    subprocess.run([git_binary, "-C", repo_path, "remote", "set-url", remote_name, new_url], capture_output=True)

            subprocess.run([git_binary, "-C", repo_path, "add", "."], capture_output=True)
            subprocess.run([git_binary, "-C", repo_path, "commit", "-m", message], capture_output=True)
            result = subprocess.run([git_binary, "-C", repo_path, "push"], capture_output=True, text=True)
        else:
            return jsonify({"error": "Invalid operation"}), 400

        if result.returncode == 0:
            return jsonify({"status": "success", "output": result.stdout})
        else:
            return jsonify({"status": "error", "message": result.stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
