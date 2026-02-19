"""
LaTeX Resume Editor - Backend Server
A Flask application for editing and compiling LaTeX resumes.
Supports both standalone web mode and Electron desktop mode.
"""

import os
import sys
import signal
import subprocess
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

# Detect Electron desktop mode
ELECTRON_MODE = os.environ.get('ELECTRON_MODE') == '1'

# Root directory resolution:
# - In Electron packaged mode, LATEX_EDITOR_ROOT env var is set by main.js
# - In development, it's the parent of code/
if os.environ.get('LATEX_EDITOR_ROOT'):
    ROOT_DIR = Path(os.environ['LATEX_EDITOR_ROOT'])
else:
    ROOT_DIR = Path(__file__).resolve().parent.parent.parent

app = Flask(__name__, static_folder=str(ROOT_DIR / 'code' / 'frontend'))
CORS(app)

# Configuration - LaTeX and output under root
TEMPLATES_DIR = ROOT_DIR / 'latex' / 'templates'
OUTPUT_DIR = ROOT_DIR / 'output'
RESUMES_DIR = ROOT_DIR / 'latex' / 'resumes'
COVER_LETTERS_DIR = ROOT_DIR / 'latex' / 'cover_letters'

# Ensure directories exist
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RESUMES_DIR.mkdir(parents=True, exist_ok=True)
COVER_LETTERS_DIR.mkdir(parents=True, exist_ok=True)


def find_available_compilers():
    """Find all available LaTeX compilers on the system"""
    compilers = ['pdflatex', 'xelatex', 'lualatex']
    available = []
    for compiler in compilers:
        if shutil.which(compiler):
            available.append(compiler)
    return available


def compile_latex(latex_content, filename='resume', compiler='pdflatex'):
    """Compile LaTeX content to PDF using specified compiler"""
    if not shutil.which(compiler):
        return None, f"Compiler '{compiler}' not found on the system."
    
    # Create temporary directory for compilation
    with tempfile.TemporaryDirectory() as temp_dir:
        tex_file = Path(temp_dir) / f'{filename}.tex'
        pdf_file = Path(temp_dir) / f'{filename}.pdf'
        
        # Write LaTeX content
        tex_file.write_text(latex_content, encoding='utf-8')
        
        try:
            # Run LaTeX compiler twice for references
            for _ in range(2):
                result = subprocess.run(
                    [compiler, '-interaction=nonstopmode', '-halt-on-error', f'{filename}.tex'],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
            
            if pdf_file.exists():
                # Copy PDF to output directory
                output_path = OUTPUT_DIR / f'{filename}.pdf'
                shutil.copy(pdf_file, output_path)
                return str(output_path), None
            else:
                # Parse error from log
                log_file = Path(temp_dir) / f'{filename}.log'
                error_msg = "Compilation failed"
                if log_file.exists():
                    log_content = log_file.read_text(encoding='utf-8', errors='ignore')
                    # Extract error lines
                    error_lines = [l for l in log_content.split('\n') if l.startswith('!')]
                    if error_lines:
                        error_msg = '\n'.join(error_lines[:5])
                return None, error_msg
                
        except subprocess.TimeoutExpired:
            return None, "Compilation timed out"
        except Exception as e:
            return None, str(e)


@app.route('/')
def index():
    """Serve the main editor page"""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory(app.static_folder, path)


@app.route('/api/compile', methods=['POST'])
def compile_resume():
    """Compile LaTeX content and return PDF"""
    data = request.json
    latex_content = data.get('content', '')
    filename = data.get('filename', 'resume')
    compiler = data.get('compiler', 'pdflatex')
    
    # Sanitize filename
    filename = ''.join(c for c in filename if c.isalnum() or c in '-_')[:50]
    
    pdf_path, error = compile_latex(latex_content, filename, compiler)
    
    if error:
        return jsonify({'success': False, 'error': error}), 400
    
    return jsonify({
        'success': True,
        'pdf_url': f'/api/pdf/{filename}.pdf'
    })


@app.route('/api/pdf/<filename>')
def get_pdf(filename):
    """Serve compiled PDF"""
    return send_from_directory(OUTPUT_DIR, filename)


@app.route('/api/templates', methods=['GET'])
def list_templates():
    """List available LaTeX templates"""
    templates = []
    for f in TEMPLATES_DIR.glob('*.tex'):
        templates.append({
            'name': f.stem,
            'filename': f.name
        })
    return jsonify(templates)


@app.route('/api/templates/<filename>', methods=['GET'])
def get_template(filename):
    """Get template content"""
    template_path = TEMPLATES_DIR / filename
    if template_path.exists() and template_path.suffix == '.tex':
        return jsonify({
            'content': template_path.read_text(encoding='utf-8')
        })
    return jsonify({'error': 'Template not found'}), 404


@app.route('/api/resumes', methods=['GET'])
def list_resumes():
    """List saved resumes"""
    resumes = []
    for f in RESUMES_DIR.glob('*.tex'):
        resumes.append({
            'name': f.stem,
            'filename': f.name,
            'modified': f.stat().st_mtime
        })
    return jsonify(sorted(resumes, key=lambda x: x['modified'], reverse=True))


@app.route('/api/resumes/<filename>', methods=['GET'])
def get_resume(filename):
    """Get saved resume content"""
    resume_path = RESUMES_DIR / filename
    if resume_path.exists() and resume_path.suffix == '.tex':
        return jsonify({
            'content': resume_path.read_text(encoding='utf-8')
        })
    return jsonify({'error': 'Resume not found'}), 404


@app.route('/api/resumes/<filename>', methods=['POST'])
def save_resume(filename):
    """Save resume content"""
    data = request.json
    content = data.get('content', '')
    
    # Sanitize filename
    if not filename.endswith('.tex'):
        filename += '.tex'
    filename = ''.join(c for c in filename if c.isalnum() or c in '-_.') 
    
    resume_path = RESUMES_DIR / filename
    resume_path.write_text(content, encoding='utf-8')
    
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/cover-letters', methods=['GET'])
def list_cover_letters():
    """List saved cover letters"""
    cover_letters = []
    for f in COVER_LETTERS_DIR.glob('*.tex'):
        cover_letters.append({
            'name': f.stem,
            'filename': f.name,
            'modified': f.stat().st_mtime
        })
    return jsonify(sorted(cover_letters, key=lambda x: x['modified'], reverse=True))


@app.route('/api/cover-letters/<filename>', methods=['GET'])
def get_cover_letter(filename):
    """Get saved cover letter content"""
    cover_letter_path = COVER_LETTERS_DIR / filename
    if cover_letter_path.exists() and cover_letter_path.suffix == '.tex':
        return jsonify({
            'content': cover_letter_path.read_text(encoding='utf-8')
        })
    return jsonify({'error': 'Cover letter not found'}), 404


@app.route('/api/cover-letters/<filename>', methods=['POST'])
def save_cover_letter(filename):
    """Save cover letter content"""
    data = request.json
    content = data.get('content', '')
    
    # Sanitize filename
    if not filename.endswith('.tex'):
        filename += '.tex'
    filename = ''.join(c for c in filename if c.isalnum() or c in '-_.') 
    
    cover_letter_path = COVER_LETTERS_DIR / filename
    cover_letter_path.write_text(content, encoding='utf-8')
    
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/open-in-editor', methods=['POST'])
def open_in_editor():
    """Open a file in Cursor IDE or VS Code"""
    data = request.json
    filename = data.get('filename', '')
    file_type = data.get('type', 'resume')

    # Resolve path based on type
    if file_type == 'template':
        file_path = TEMPLATES_DIR / filename
    elif file_type == 'cover-letter':
        file_path = COVER_LETTERS_DIR / filename
    else:
        file_path = RESUMES_DIR / filename

    if not file_path.exists():
        return jsonify({'success': False, 'error': f'File not found: {filename}'}), 404

    # Try Cursor first, then VS Code
    for editor in ['cursor', 'code']:
        if shutil.which(editor):
            try:
                kwargs = {}
                if sys.platform == 'win32':
                    kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
                subprocess.Popen([editor, str(file_path)], **kwargs)
                return jsonify({'success': True, 'editor': editor})
            except Exception:
                continue

    return jsonify({
        'success': False,
        'error': 'Neither Cursor nor VS Code found on PATH. Please install Cursor from https://cursor.sh'
    }), 404


@app.route('/api/check-latex', methods=['GET'])
def check_latex():
    """Check which LaTeX compilers are installed"""
    compilers = find_available_compilers()
    return jsonify({
        'installed': len(compilers) > 0,
        'compilers': compilers
    })


def graceful_shutdown(signum=None, frame=None):
    """Handle graceful shutdown for desktop mode"""
    print("\nShutting down LaTeX Resume Editor...")
    sys.exit(0)


if __name__ == '__main__':
    # Register signal handlers for clean shutdown
    signal.signal(signal.SIGTERM, graceful_shutdown)
    if hasattr(signal, 'SIGINT'):
        signal.signal(signal.SIGINT, graceful_shutdown)

    # Configurable host/port via environment (used by Electron)
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', '5000'))
    debug = not ELECTRON_MODE

    print("\n" + "="*60)
    print("LaTeX Resume Editor")
    if ELECTRON_MODE:
        print("  (Desktop Mode)")
    print("="*60)

    compilers = find_available_compilers()
    if compilers:
        print(f"[OK] Available compilers: {', '.join(compilers)}")
    else:
        print("[!] No LaTeX compiler found!")
        print("    Install MiKTeX from: https://miktex.org/download")
        print("    Or TeX Live from: https://tug.org/texlive/")

    print(f"\n>>> Server running on http://{host}:{port}")
    if not ELECTRON_MODE:
        print("    Tip: Use Ctrl+M to toggle the editor visibility!")
    print("="*60 + "\n")

    app.run(debug=debug, host=host, port=port, use_reloader=False)
