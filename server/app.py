import os
import json
import requests
import git
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../client/dist', static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-68be7759cb7746dbb0b90edba8e78fe0")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

@app.errorhandler(404)
def resource_not_found(e):
    return jsonify({"error": True, "message": "Resource not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": True, "message": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"error": True, "message": "Internal server error"}), 500

@app.after_request
def add_header(response):
    if response.mimetype == 'text/html' and request.path.startswith('/api/github/callback'):
        return response
    response.headers['Content-Type'] = 'application/json'
    return response

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({"error": True, "message": "No JSON data provided"}), 400
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
        if response.status_code != 200:
            return jsonify({"error": True, "message": f"DeepSeek API error: {response.text}"}), response.status_code
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/execute', methods=['POST'])
def execute():
    try:
        import subprocess
        data = request.json
        if not data:
            return jsonify({"error": True, "message": "No JSON data provided"}), 400
        command = data.get('command')
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/write_files', methods=['POST'])
def write_files():
    try:
        data = request.json
        if not data:
            return jsonify({"error": True, "message": "No JSON data provided"}), 400
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
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/auth/github')
def github_login():
    try:
        client_id = os.environ.get("GITHUB_CLIENT_ID") or "Ov23lipwgA5vPc0x7HbV"
        redirect_uri = os.environ.get("REDIRECT_URI") or "https://agent-x-tawny.vercel.app/api/github/callback"
        url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo,user"
        return jsonify({"url": url})
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/github/callback')
def github_callback():
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({"error": True, "message": "No code provided"}), 400
        client_id = os.environ.get("GITHUB_CLIENT_ID") or "Ov23lipwgA5vPc0x7HbV"
        client_secret = os.environ.get("GITHUB_CLIENT_SECRET") or "9d890e753b9806d6cc6269016de5a9dc35684a3f"
        redirect_uri = os.environ.get("REDIRECT_URI") or "https://agent-x-tawny.vercel.app/api/github/callback"
        res = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri}
        )
        if res.status_code != 200:
            return jsonify({"error": True, "message": f"GitHub Auth error: {res.text}"}), res.status_code
        token_data = res.json()
        access_token = token_data.get('access_token')
        if access_token:
            html = f"<html><script>if(window.opener){{window.opener.postMessage({{type:'github-token',token:'{access_token}'}},'*');setTimeout(()=>window.close(),1000);}}else{{document.body.innerHTML='Login successful!';}}</script><body>Authenticating...</body></html>"
            from flask import make_response
            response = make_response(html)
            response.headers['Content-Type'] = 'text/html'
            return response
        return jsonify({"error": True, "message": f"Auth failed: {token_data.get('error_description', 'Unknown')}"}), 400
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/github/repos')
def get_github_repos():
    try:
        token = request.args.get('token') or os.environ.get("GITHUB_TOKEN_SECRET")
        if not token:
            return jsonify({"error": True, "message": "No token"}), 401
        headers = {"Accept": "application/vnd.github.v3+json", "Authorization": f"token {token}"}
        res = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers)
        if res.status_code == 200:
            return jsonify([{"name": r["full_name"], "url": r["html_url"]} for r in res.json()])
        return jsonify({"error": True, "message": res.json().get('message', 'Error')}), res.status_code
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/git_clone', methods=['POST'])
def git_clone():
    try:
        data = request.json
        if not data:
            return jsonify({"error": True, "message": "No JSON data provided"}), 400
        repo_url, token = data.get('repo_url'), data.get('token') or os.environ.get("GITHUB_TOKEN_SECRET")
        if not repo_url:
            return jsonify({"error": True, "message": "No URL"}), 400
        if token:
            repo_url = repo_url.replace("https://github.com/", f"https://{token}@github.com/")
        folder = repo_url.split('/')[-1].replace('.git', '').split('@')[-1]
        path = os.path.join(os.getcwd(), folder)
        if os.path.exists(path):
            return jsonify({"status": "success", "path": path})
        git.Repo.clone_from(repo_url, path)
        return jsonify({"status": "success", "path": path})
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@app.route('/api/git_operation', methods=['POST'])
def git_operation():
    try:
        data = request.json
        if not data:
            return jsonify({"error": True, "message": "No JSON data provided"}), 400
        op, path, msg = data.get('operation'), data.get('path'), data.get('message', 'Update')
        repo = git.Repo(path)
        if op == 'pull':
            repo.remotes.origin.pull()
            return jsonify({"status": "success"})
        if op == 'push':
            repo.config_writer().set_value("user", "email", "agent@replica.com").release()
            repo.config_writer().set_value("user", "name", "Agent").release()
            token = os.environ.get("GITHUB_TOKEN_SECRET")
            if token:
                origin = repo.remote('origin')
                if token not in origin.url:
                    origin.set_url(origin.url.replace("https://github.com/", f"https://{token}@github.com/"))
            repo.git.add(A=True)
            repo.index.commit(msg)
            repo.remotes.origin.push()
            return jsonify({"status": "success"})
        return jsonify({"error": True, "message": f"Unsupported operation: {op}"}), 400
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
