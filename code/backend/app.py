"""
LaTeX Editor - Backend Server
A Flask application for editing and compiling LaTeX documents.
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
DOCUMENTS_DIR = ROOT_DIR / 'latex' / 'documents'
COVER_LETTERS_DIR = ROOT_DIR / 'latex' / 'cover_letters'

# Ensure directories exist
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
COVER_LETTERS_DIR.mkdir(parents=True, exist_ok=True)

# Cache for expensive whole-system .tex scan used by the file browser.
# None means "not scanned yet".
TEX_FILES_CACHE = None


def find_available_compilers():
    """Find all available LaTeX compilers on the system"""
    compilers = ['pdflatex', 'xelatex', 'lualatex']
    available = []
    for compiler in compilers:
        if shutil.which(compiler):
            available.append(compiler)
    return available


def find_editor_commands():
    """
    Resolve launch commands for Cursor / VS Code.
    Returns a list of tuples: (editor_name, executable_path_or_cmd).
    """
    candidates = []
    seen = set()

    def add_candidate(editor_name, command):
        if not command:
            return
        key = str(command).lower()
        if key in seen:
            return
        seen.add(key)
        candidates.append((editor_name, str(command)))

    # 1) PATH-based discovery
    cursor_on_path = shutil.which('cursor')
    code_on_path = shutil.which('code')
    add_candidate('cursor', cursor_on_path)
    add_candidate('code', code_on_path)

    # 2) User-configured env overrides (absolute paths preferred)
    add_candidate('cursor', os.environ.get('CURSOR_EXE'))
    add_candidate('code', os.environ.get('VSCODE_EXE'))

    # 3) Well-known install locations (Windows)
    if sys.platform == 'win32':
        known_paths = [
            ('cursor', Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'Cursor' / 'Cursor.exe'),
            ('cursor', Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'Cursor' / 'Cursor.exe'),
            ('cursor', Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)')) / 'Cursor' / 'Cursor.exe'),
            ('cursor', Path(os.environ.get('ProgramFiles(Arm)', r'C:\Program Files (Arm)')) / 'Cursor' / 'Cursor.exe'),
            ('cursor', Path(os.environ.get('ProgramW6432', r'C:\Program Files')) / 'Cursor' / 'Cursor.exe'),
            ('code', Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'Microsoft VS Code' / 'Code.exe'),
            ('code', Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'Microsoft VS Code' / 'Code.exe'),
            ('code', Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)')) / 'Microsoft VS Code' / 'Code.exe'),
            ('code', Path(os.environ.get('ProgramFiles(Arm)', r'C:\Program Files (Arm)')) / 'Microsoft VS Code' / 'Code.exe'),
            ('code', Path(os.environ.get('ProgramW6432', r'C:\Program Files')) / 'Microsoft VS Code' / 'Code.exe'),
        ]
        for editor_name, path_candidate in known_paths:
            if str(path_candidate) and path_candidate.exists():
                add_candidate(editor_name, path_candidate)

    return candidates


def compile_latex(latex_content, filename='document', compiler='pdflatex'):
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


@app.route('/api/health', methods=['GET'])
def health():
    """Simple health endpoint for local checks and CI smoke tests."""
    return jsonify({
        'status': 'ok',
        'electron_mode': ELECTRON_MODE
    })


@app.route('/api/compile', methods=['POST'])
def compile_document():
    """Compile LaTeX content and return PDF"""
    data = request.json
    latex_content = data.get('content', '')
    filename = data.get('filename', 'document')
    compiler = data.get('compiler', 'pdflatex')
    
    # Sanitize filename
    filename = ''.join(c for c in filename if c.isalnum() or c in '-_')[:50]
    
    pdf_path, error = compile_latex(latex_content, filename, compiler)
    
    if error:
        return jsonify({'success': False, 'error': error}), 400
    
    return jsonify({
        'success': True,
        'pdf_url': f'/api/pdf/{filename}.pdf',
        'pdf_filename': f'{filename}.pdf'
    })


@app.route('/api/pdf/<filename>')
def get_pdf(filename):
    """Serve compiled PDF"""
    if not filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Invalid PDF filename'}), 400
    return send_from_directory(OUTPUT_DIR, filename, mimetype='application/pdf')


@app.route('/api/pdf-download/<filename>')
def download_pdf(filename):
    """Download compiled PDF as an attachment with stable filename."""
    if not filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Invalid PDF filename'}), 400
    return send_from_directory(
        OUTPUT_DIR,
        filename,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )


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


@app.route('/api/documents', methods=['GET'])
def list_documents():
    """List saved documents"""
    documents = []
    for f in DOCUMENTS_DIR.glob('*.tex'):
        documents.append({
            'name': f.stem,
            'filename': f.name,
            'modified': f.stat().st_mtime
        })
    return jsonify(sorted(documents, key=lambda x: x['modified'], reverse=True))


@app.route('/api/documents/<filename>', methods=['GET'])
def get_document(filename):
    """Get saved document content"""
    document_path = DOCUMENTS_DIR / filename
    if document_path.exists() and document_path.suffix == '.tex':
        return jsonify({
            'content': document_path.read_text(encoding='utf-8')
        })
    return jsonify({'error': 'Document not found'}), 404


@app.route('/api/documents/<filename>', methods=['POST'])
def save_document(filename):
    """Save document content"""
    data = request.json
    content = data.get('content', '')
    
    # Sanitize filename
    if not filename.endswith('.tex'):
        filename += '.tex'
    filename = ''.join(c for c in filename if c.isalnum() or c in '-_.') 
    
    document_path = DOCUMENTS_DIR / filename
    document_path.write_text(content, encoding='utf-8')
    upsert_cached_tex_file(document_path)
    
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
    upsert_cached_tex_file(cover_letter_path)
    
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/open-in-editor', methods=['POST'])
def open_in_editor():
    """Open a file in Cursor IDE or VS Code"""
    data = request.json
    filename = data.get('filename', '')
    file_type = data.get('type', 'document')

    # Resolve path based on type
    if file_type == 'template':
        file_path = TEMPLATES_DIR / filename
    elif file_type == 'cover-letter':
        file_path = COVER_LETTERS_DIR / filename
    else:
        file_path = DOCUMENTS_DIR / filename

    if not file_path.exists():
        return jsonify({'success': False, 'error': f'File not found: {filename}'}), 404

    # Try Cursor first, then VS Code using PATH + known install locations
    launch_errors = []
    file_dir = str(file_path.parent)
    file_abs = str(file_path)

    for editor_name, command in find_editor_commands():
        try:
            kwargs = {}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            # Open a new window rooted at the file directory, and open the file in that window.
            # Cursor/VS Code CLIs are compatible with this argument style.
            subprocess.Popen([command, '--new-window', file_dir, file_abs], **kwargs)
            return jsonify({'success': True, 'editor': editor_name})
        except Exception as e:
            launch_errors.append(f"{editor_name}: {e}")
            continue

    diagnostic = ''
    if launch_errors:
        diagnostic = f" Attempted launch commands failed: {' | '.join(launch_errors[:3])}."
    return jsonify({
        'success': False,
        'error': 'Neither Cursor nor VS Code could be launched. Install Cursor from https://cursor.sh or set CURSOR_EXE/VSCODE_EXE.' + diagnostic
    }), 404


@app.route('/api/check-latex', methods=['GET'])
def check_latex():
    """Check which LaTeX compilers are installed"""
    compilers = find_available_compilers()
    return jsonify({
        'installed': len(compilers) > 0,
        'compilers': compilers
    })


def build_tex_file_index():
    """Search accessible directories for all .tex files on the system."""
    tex_files = []
    seen_paths = set()
    seen_roots = set()
    try:
        workspace_root = ROOT_DIR.resolve()
    except OSError:
        workspace_root = ROOT_DIR

    # Directories to skip (system, build, cache, hidden heavy dirs)
    SKIP_DIRS = {
        'node_modules', '.git', '__pycache__', '.venv', 'venv',
        'env', 'dist', 'build', '.cache', '.npm', '.cargo',
        'proc', 'sys', 'dev', 'run', 'snap', 'lost+found',
    }

    def is_workspace_path(file_path):
        try:
            file_resolved = file_path.resolve()
        except OSError:
            file_resolved = file_path
        try:
            common = Path(os.path.commonpath([str(file_resolved), str(workspace_root)]))
        except ValueError:
            return False
        return common == workspace_root

    def queue_root(base_path, max_depth=8):
        base = Path(str(base_path)).expanduser()
        if not base.exists() or not base.is_dir():
            return
        try:
            key = str(base.resolve()).lower()
        except OSError:
            key = str(base).lower()
        if key in seen_roots:
            return
        seen_roots.add(key)
        scan_dir(base, max_depth=max_depth)

    def scan_dir(base, max_depth=8):
        base = Path(str(base))
        if not base.exists() or not base.is_dir():
            return
        try:
            for root, dirs, files in os.walk(str(base)):
                root_path = Path(root)
                try:
                    depth = len(root_path.relative_to(base).parts)
                except ValueError:
                    depth = 0
                if depth >= max_depth:
                    dirs.clear()
                    continue
                # Prune dirs in-place to control traversal
                dirs[:] = [
                    d for d in dirs
                    if d not in SKIP_DIRS and not d.startswith('.')
                ]
                for filename in files:
                    if filename.lower().endswith('.tex'):
                        file_path = root_path / filename
                        try:
                            resolved = str(file_path.resolve())
                        except OSError:
                            resolved = str(file_path)
                        if resolved in seen_paths:
                            continue
                        seen_paths.add(resolved)
                        try:
                            stat = file_path.stat()
                            tex_files.append({
                                'path': resolved,
                                'name': filename,
                                'stem': file_path.stem,
                                'directory': str(root_path),
                                'modified': stat.st_mtime,
                                'size': stat.st_size,
                                'is_workspace': is_workspace_path(file_path)
                            })
                        except (OSError, PermissionError):
                            pass
        except (PermissionError, OSError):
            pass

    home = Path.home()

    # Platform-specific roots
    if sys.platform.startswith('win'):
        user_profile = Path(os.environ.get('USERPROFILE', str(home)))
        one_drive = os.environ.get('OneDrive')
        public_profile = Path(os.environ.get('PUBLIC', r'C:\Users\Public'))

        queue_root(user_profile / 'Desktop', max_depth=8)
        queue_root(user_profile / 'Documents', max_depth=8)
        queue_root(user_profile / 'Downloads', max_depth=8)
        queue_root(public_profile / 'Desktop', max_depth=5)

        if one_drive:
            queue_root(Path(one_drive) / 'Desktop', max_depth=8)
            queue_root(Path(one_drive) / 'Documents', max_depth=8)

        # Broad fallback so Desktop-visible folders and other user folders are discoverable.
        queue_root(user_profile, max_depth=7)
    else:
        queue_root('/home', max_depth=9)
        queue_root('/root', max_depth=8)
        queue_root('/tmp', max_depth=3)
        queue_root(home, max_depth=8)

    # App workspace (covers latex/documents, templates, cover_letters)
    queue_root(ROOT_DIR, max_depth=8)

    # Current working directory if outside the above
    cwd = Path.cwd()
    try:
        cwd_resolved = cwd.resolve()
    except OSError:
        cwd_resolved = cwd
    if not is_workspace_path(cwd_resolved):
        queue_root(cwd_resolved, max_depth=6)

    # Sort: newest modified first
    tex_files.sort(key=lambda x: x['modified'], reverse=True)
    return tex_files


def upsert_cached_tex_file(file_path):
    """Insert/update one .tex file entry in the cached file index."""
    global TEX_FILES_CACHE
    if TEX_FILES_CACHE is None:
        return

    file_path = Path(file_path)
    if file_path.suffix.lower() != '.tex' or not file_path.exists():
        return

    try:
        resolved_path = str(file_path.resolve())
    except OSError:
        resolved_path = str(file_path)

    try:
        workspace_root = ROOT_DIR.resolve()
    except OSError:
        workspace_root = ROOT_DIR

    try:
        file_resolved = file_path.resolve()
    except OSError:
        file_resolved = file_path

    try:
        common = Path(os.path.commonpath([str(file_resolved), str(workspace_root)]))
        is_workspace = common == workspace_root
    except ValueError:
        is_workspace = False

    try:
        stat = file_path.stat()
    except (OSError, PermissionError):
        return

    entry = {
        'path': resolved_path,
        'name': file_path.name,
        'stem': file_path.stem,
        'directory': str(file_path.parent),
        'modified': stat.st_mtime,
        'size': stat.st_size,
        'is_workspace': is_workspace
    }

    replaced = False
    for idx, existing in enumerate(TEX_FILES_CACHE):
        if existing.get('path') == resolved_path:
            TEX_FILES_CACHE[idx] = entry
            replaced = True
            break

    if not replaced:
        TEX_FILES_CACHE.append(entry)

    TEX_FILES_CACHE.sort(key=lambda x: x['modified'], reverse=True)


@app.route('/api/browse-tex-files', methods=['GET'])
def browse_tex_files():
    """
    Return all discoverable .tex files.
    Expensive system scan is done only once per app run unless refresh=1.
    """
    global TEX_FILES_CACHE
    refresh = request.args.get('refresh') in {'1', 'true', 'yes'}

    if TEX_FILES_CACHE is None or refresh:
        TEX_FILES_CACHE = build_tex_file_index()

    return jsonify(TEX_FILES_CACHE)


@app.route('/api/file', methods=['GET'])
def get_tex_file():
    """Get content of any .tex file by its full path"""
    path_str = request.args.get('path', '')
    if not path_str:
        return jsonify({'error': 'No path provided'}), 400

    file_path = Path(path_str)
    if file_path.suffix.lower() != '.tex':
        return jsonify({'error': 'Not a .tex file'}), 400
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404

    try:
        content = file_path.read_text(encoding='utf-8', errors='replace')
        return jsonify({
            'content': content,
            'path': str(file_path),
            'name': file_path.name
        })
    except (PermissionError, OSError) as e:
        return jsonify({'error': str(e)}), 403


def graceful_shutdown(signum=None, frame=None):
    """Handle graceful shutdown for desktop mode"""
    print("\nShutting down LaTeX Editor...")
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
    print("LaTeX Editor")
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

