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

@app.route('/api/git_auth', methods=['POST'])
def git_auth():
    data = request.json
    token = data.get('token')
    if not token:
        return jsonify({"error": "Token is required"}), 400
    os.environ["GITHUB_TOKEN"] = token
    # Configure git to use the token
    subprocess.run(["git", "config", "--global", "url.https://{}.@github.com/".format(token), "insteadOf", "https://github.com/"])
    return jsonify({"status": "success", "message": "GitHub authenticated"})

@app.route('/api/git_operation', methods=['POST'])
def git_operation():
    data = request.json
    op = data.get('operation') # 'pull' or 'push'
    repo_path = data.get('path')
    message = data.get('message', 'Update from Agent Replica')
    
    if not os.path.exists(repo_path):
        return jsonify({"error": "Repository path does not exist"}), 400

    try:
        if op == 'pull':
            result = subprocess.run(["git", "-C", repo_path, "pull"], capture_output=True, text=True)
        elif op == 'push':
            subprocess.run(["git", "-C", repo_path, "add", "."], capture_output=True)
            subprocess.run(["git", "-C", repo_path, "commit", "-m", message], capture_output=True)
            result = subprocess.run(["git", "-C", repo_path, "push"], capture_output=True, text=True)
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
