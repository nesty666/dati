from flask import Flask, render_template, jsonify, send_from_directory, request
import json
import os
import time

app = Flask(__name__)

DATA_DIR = os.path.join(app.root_path, 'data')

@app.context_processor
def inject_version():
    return dict(version=int(time.time()))

@app.route('/')
def index():
    selected_subject = request.args.get('subject')
    subjects = []
    if os.path.exists(DATA_DIR):
        subjects = [f.replace('.json', '') for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    questions = []
    if selected_subject:
        file_path = os.path.join(DATA_DIR, f"{selected_subject}.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    questions = json.load(f)
            except json.JSONDecodeError:
                # Handle empty or malformed JSON
                questions = []

    return render_template('index.html', subjects=subjects, selected_subject=selected_subject, questions=questions)

@app.route('/api/subjects')
def get_subjects():
    """Scans the data directory and returns a list of available subjects."""
    subjects = []
    if os.path.exists(DATA_DIR):
        for filename in os.listdir(DATA_DIR):
            if filename.endswith('.json'):
                subject_name = os.path.splitext(filename)[0]
                subjects.append(subject_name)
    return jsonify(subjects)

@app.route('/api/questions/<subject>')
def get_questions(subject):
    """Loads questions for a specific subject."""
    file_path = os.path.join(DATA_DIR, f"{subject}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        return jsonify(questions)
    return jsonify({"error": "Subject not found"}), 404

# Favicon route to prevent 404 errors in the console
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    # Use a specific port and set debug=False for production
    app.run(host='0.0.0.0', port=5001, debug=False) 