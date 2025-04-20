from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import json
from werkzeug.utils import secure_filename
from utils.file_handler import process_file
from utils.parser import parse_resume
from utils.gemini_api import analyze_with_gemini

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size

# Ensure upload directory exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Persistent storage for parsed resumes
RESUMES_FILE = 'parsed_resumes.json'

def load_resumes():
    if os.path.exists(RESUMES_FILE):
        with open(RESUMES_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return []
    return []

def save_resumes():
    with open(RESUMES_FILE, 'w', encoding='utf-8') as f:
        json.dump(parsed_resumes, f, ensure_ascii=False, indent=2)

parsed_resumes = load_resumes()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload')
def upload():
    return render_template('upload.html')

@app.route('/results')
def results():
    resumes_cleared = request.args.get('cleared') == '1'
    return render_template('results.html', resumes=parsed_resumes, resumes_cleared=resumes_cleared)

@app.route('/clear_resumes', methods=['POST'])
def clear_resumes():
    global parsed_resumes
    parsed_resumes = []
    save_resumes()
    return redirect(url_for('results', cleared=1))

@app.route('/compare')
def compare():
    return render_template('compare.html', resumes=parsed_resumes)

@app.route('/api/upload', methods=['POST'])
def api_upload():
    import logging
    logging.basicConfig(level=logging.INFO)
    if 'resume' not in request.files:
        logging.error('No file part in upload')
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['resume']
    job_role = request.form.get('job_role', 'Software Engineer')
    candidate_name = request.form.get('candidate_name', '')
    
    if file.filename == '':
        logging.error('No file selected')
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Extract text from file
            text = process_file(file_path)
            
            # Initial parsing with basic techniques
            parsed_data = parse_resume(text, candidate_name)
            
            # Enhanced parsing with Gemini API
            enhanced_data = analyze_with_gemini(text, job_role, candidate_name)
            
            # Merge results, prioritizing enhanced data
            result = {**parsed_data, **enhanced_data, 'job_role': job_role}
            
            # Add to in-memory storage
            parsed_resumes.append(result)
            save_resumes()
            logging.info(f'Resume uploaded and saved. Now {len(parsed_resumes)} resumes.')
            return jsonify({'success': True, 'resume_id': len(parsed_resumes) - 1}), 200
            
        except Exception as e:
            logging.error(f'Error processing resume: {e}')
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up the file after processing
            if os.path.exists(file_path):
                os.remove(file_path)
    
    logging.error('Failed to process file')
    return jsonify({'error': 'Failed to process file'}), 500

@app.route('/api/resumes', methods=['GET'])
def get_resumes():
    return jsonify(parsed_resumes)

@app.route('/api/resumes/<int:resume_id>', methods=['GET'])
def get_resume(resume_id):
    if 0 <= resume_id < len(parsed_resumes):
        return jsonify(parsed_resumes[resume_id])
    return jsonify({'error': 'Resume not found'}), 404

@app.route('/api/compare', methods=['POST'])
def compare_resumes():
    import logging
    logging.basicConfig(level=logging.INFO)
    resume_ids = request.json.get('resume_ids', [])
    try:
        resume_ids = [int(rid) for rid in resume_ids]
    except Exception:
        logging.error('Invalid resume IDs (not convertible to int)')
        return jsonify({'error': 'Invalid resume IDs'}), 400
    if not parsed_resumes:
        logging.error('No resumes available for comparison')
        return jsonify({'error': 'No resumes available for comparison. Please upload resumes first.'}), 400
    if not resume_ids or not all(0 <= rid < len(parsed_resumes) for rid in resume_ids):
        logging.error('Resume IDs out of range or missing')
        return jsonify({'error': 'Invalid resume IDs'}), 400
    selected_resumes = [parsed_resumes[rid] for rid in resume_ids]
    logging.info(f'Comparing resumes: {resume_ids}')
    return jsonify(selected_resumes)

if __name__ == '__main__':
    app.run(debug=True)