/**
 * LaTeX Editor - Frontend Application
 * Handles editor initialization, compilation, and file management
 */

// DOM Elements
const elements = {
    editor: null,
    filenameInput: document.getElementById('filenameInput'),
    compilerSelect: document.getElementById('compilerSelect'),
    compileBtn: document.getElementById('compileBtn'),
    saveBtn: document.getElementById('saveBtn'),
    newBtn: document.getElementById('newBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    wrapBtn: document.getElementById('wrapBtn'),
    formatBtn: document.getElementById('formatBtn'),
    pdfViewer: document.getElementById('pdfViewer'),
    previewPlaceholder: document.getElementById('previewPlaceholder'),
    previewContainer: document.getElementById('previewContainer'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorToast: document.getElementById('errorToast'),
    errorMessage: document.getElementById('errorMessage'),
    closeToast: document.getElementById('closeToast'),
    latexStatus: document.getElementById('latexStatus'),
    templateBtn: document.getElementById('templateBtn'),
    templateDropdown: document.getElementById('templateDropdown'),
    coverLetterBtn: document.getElementById('coverLetterBtn'),
    coverLetterDropdown: document.getElementById('coverLetterDropdown'),
    resizeHandle: document.getElementById('resizeHandle'),
    mainContent: document.getElementById('mainContent'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    toggleEditorBtn: document.getElementById('toggleEditorBtn'),
    backToEditorBtn: document.getElementById('backToEditorBtn'),
    cursorBtn: document.getElementById('cursorBtn'),
    viewFilesBtn: document.getElementById('viewFilesBtn'),
    filesBrowserOverlay: document.getElementById('filesBrowserOverlay'),
    filesBrowserClose: document.getElementById('filesBrowserClose'),
    filesBrowserSearch: document.getElementById('filesBrowserSearch'),
    filesBrowserList: document.getElementById('filesBrowserList'),
    filesBrowserStatus: document.getElementById('filesBrowserStatus')
};

// State
let currentPdfUrl = null;
let currentPdfFilename = null;
let wordWrap = true;
let editorVisible = true;
let persistTimer = null;

const STORAGE_KEYS = {
    filename: 'lastOpenedDocumentFilename',
    content: 'lastOpenedDocumentContent',
    source: 'lastOpenedDocumentSource', // "saved" | "draft" | "external"
    path: 'lastOpenedFilePath'        // full path when opened from file browser
};

// Default LaTeX template for documents
const defaultTemplate = `\\documentclass[11pt,a4paper]{article}

\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{amsmath,amssymb}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Start writing your LaTeX document here.

\\end{document}
`;

// Clean minimal template for "New File" - a true blank canvas
const blankTemplate = `\\documentclass[11pt,a4paper]{article}

\\usepackage[margin=0.75in]{geometry}

\\begin{document}

% Start writing your LaTeX content here

\\end{document}
`;

// Initialize CodeMirror editor
function initEditor() {
    elements.editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        mode: 'stex',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: wordWrap,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        indentUnit: 2,
        tabSize: 2,
        indentWithTabs: false,
        extraKeys: {
            'Ctrl-Enter': compileDocument,
            'Cmd-Enter': compileDocument,
            'Ctrl-S': saveDocument,
            'Cmd-S': saveDocument,
            'Tab': (cm) => cm.execCommand('indentMore'),
            'Shift-Tab': (cm) => cm.execCommand('indentLess'),
            'Ctrl-M': toggleEditor,
            'Cmd-M': toggleEditor
        }
    });

    // Try to load last opened document, otherwise use default template
    loadLastOpenedDocument();

    // Persist draft content while typing (debounced)
    elements.editor.on('change', () => {
        persistDraft();
    });
}

// Check LaTeX installation status
async function checkLatexStatus() {
    try {
        const response = await fetch('/api/check-latex');
        const data = await response.json();

        const statusDot = elements.latexStatus.querySelector('.status-dot');
        const statusText = elements.latexStatus.querySelector('.status-text');

        if (data.installed) {
            statusDot.className = 'status-dot success';
            statusText.textContent = `LaTeX: ${data.compilers.join(', ')}`;

            // Update select options based on availability
            Array.from(elements.compilerSelect.options).forEach(opt => {
                if (!data.compilers.includes(opt.value)) {
                    opt.disabled = true;
                    opt.text += ' (not found)';
                }
            });
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'LaTeX not found';
        }
    } catch (error) {
        console.error('Failed to check LaTeX status:', error);
    }
}

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();

        if (templates.length === 0) {
            elements.templateDropdown.innerHTML = '<div class="dropdown-empty">No templates available</div>';
        } else {
            elements.templateDropdown.innerHTML = templates.map(t =>
                `<button class="dropdown-item" data-filename="${t.filename}">${t.name}</button>`
            ).join('');

            // Add click handlers
            elements.templateDropdown.querySelectorAll('.dropdown-item').forEach(btn => {
                btn.addEventListener('click', () => loadTemplate(btn.dataset.filename));
            });
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// ============================================================
// File Browser Modal
// ============================================================

let allTexFiles = [];  // cached file list from last scan
let texFilesLoaded = false;
let texFilesLoading = false;

function openFileBrowser() {
    elements.filesBrowserOverlay.classList.remove('hidden');
    elements.filesBrowserSearch.value = '';
    if (texFilesLoading && !texFilesLoaded) {
        elements.filesBrowserList.innerHTML = `
            <div class="modal-scanning">
                <div class="loading-spinner" style="width:32px;height:32px;border-width:2px;"></div>
                <span>Scanning for .tex files...</span>
            </div>`;
        elements.filesBrowserStatus.textContent = 'Scanning...';
        return;
    }

    if (texFilesLoaded) {
        renderFileList(allTexFiles);
        return;
    } else {
        elements.filesBrowserList.innerHTML = `
            <div class="modal-scanning">
                <div class="loading-spinner" style="width:32px;height:32px;border-width:2px;"></div>
                <span>Scanning for .tex files...</span>
            </div>`;
        elements.filesBrowserStatus.textContent = 'Scanning...';
    }
}

function setupDropdownButtons() {
    const closeAll = () => {
        elements.templateDropdown.style.display = '';
        elements.coverLetterDropdown.style.display = '';
    };

    elements.templateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = elements.templateDropdown.style.display === 'block';
        closeAll();
        if (!open) elements.templateDropdown.style.display = 'block';
    });

    elements.coverLetterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = elements.coverLetterDropdown.style.display === 'block';
        closeAll();
        if (!open) elements.coverLetterDropdown.style.display = 'block';
    });

    document.addEventListener('click', closeAll);
}

function closeFileBrowser() {
    elements.filesBrowserOverlay.classList.add('hidden');
}

async function loadAllTexFiles() {
    if (texFilesLoading) return;
    texFilesLoading = true;
    try {
        const response = await fetch('/api/browse-tex-files');
        allTexFiles = await response.json();
        texFilesLoaded = true;
        if (!elements.filesBrowserOverlay.classList.contains('hidden')) {
            renderFileList(allTexFiles);
        }
    } catch (error) {
        texFilesLoaded = false;
        if (!elements.filesBrowserOverlay.classList.contains('hidden')) {
            elements.filesBrowserList.innerHTML = `<div class="dropdown-empty">Failed to scan files: ${error.message}</div>`;
            elements.filesBrowserStatus.textContent = 'Error scanning files.';
        }
    } finally {
        texFilesLoading = false;
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(mtime) {
    const diff = Date.now() / 1000 - mtime;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(mtime * 1000).toLocaleDateString();
}

function renderFileList(files) {
    if (files.length === 0) {
        elements.filesBrowserList.innerHTML = '<div class="dropdown-empty">No .tex files found.</div>';
        elements.filesBrowserStatus.textContent = 'No files found.';
        return;
    }

    // Group by directory; workspace files come first
    const groups = new Map();
    const WORKSPACE_KEY = '__workspace__';

    for (const file of files) {
        const key = file.is_workspace ? WORKSPACE_KEY : file.directory;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(file);
    }

    // Build HTML
    let html = '';

    // Workspace group first
    if (groups.has(WORKSPACE_KEY)) {
        html += `<div class="file-group">
            <div class="file-group-header dedicated">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Workspace (dedicated folder)
            </div>`;
        for (const file of groups.get(WORKSPACE_KEY)) {
            html += buildFileItemHTML(file);
        }
        html += '</div>';
    }

    // Other directories
    for (const [dir, dirFiles] of groups) {
        if (dir === WORKSPACE_KEY) continue;
        html += `<div class="file-group">
            <div class="file-group-header">${escapeHtml(dir)}</div>`;
        for (const file of dirFiles) {
            html += buildFileItemHTML(file);
        }
        html += '</div>';
    }

    elements.filesBrowserList.innerHTML = html;

    // Wire up click handlers
    elements.filesBrowserList.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
            loadFileByPath(item.dataset.path, item.dataset.name);
        });
    });

    const total = files.length;
    elements.filesBrowserStatus.textContent = `${total} file${total !== 1 ? 's' : ''} found`;
}

function buildFileItemHTML(file) {
    return `<div class="file-item" data-path="${escapeHtml(file.path)}" data-name="${escapeHtml(file.name)}">
        <span class="file-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
            </svg>
        </span>
        <span class="file-item-name">${escapeHtml(file.name)}</span>
        <span class="file-item-meta">
            <span>${formatRelativeTime(file.modified)}</span>
            <span>${formatFileSize(file.size)}</span>
        </span>
    </div>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function filterFiles(query) {
    if (!query.trim()) {
        renderFileList(allTexFiles);
        return;
    }
    const q = query.toLowerCase();
    const filtered = allTexFiles.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
    );
    renderFileList(filtered);
}

async function loadFileByPath(filePath, fileName) {
    try {
        const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
        const data = await response.json();

        if (data.content !== undefined) {
            elements.editor.setValue(data.content);
            const stem = fileName.replace(/\.tex$/i, '');
            elements.filenameInput.value = stem;

            // Remember this file
            localStorage.setItem(STORAGE_KEYS.filename, fileName);
            localStorage.setItem(STORAGE_KEYS.source, 'external');
            localStorage.setItem(STORAGE_KEYS.path, filePath);
            localStorage.removeItem(STORAGE_KEYS.content);

            closeFileBrowser();
        } else {
            showError(data.error || 'Failed to load file.');
        }
    } catch (error) {
        showError('Failed to load file: ' + error.message);
    }
}

// Load saved documents (both documents and cover letters)
async function loadSavedDocuments() {
    try {
        const [documentsResponse, coverLettersResponse] = await Promise.all([
            fetch('/api/documents'),
            fetch('/api/cover-letters')
        ]);
        const documents = await documentsResponse.json();
        const coverLetters = await coverLettersResponse.json();

        const docs = [
            ...documents.map(r => ({ ...r, docType: 'document' })),
            ...coverLetters.map(c => ({ ...c, docType: 'cover-letter' }))
        ].sort((a, b) => b.modified - a.modified);

        if (docs.length === 0) {
            elements.coverLetterDropdown.innerHTML = '<div class="dropdown-empty">No saved documents</div>';
        } else {
            elements.coverLetterDropdown.innerHTML = docs.map(doc =>
                `<div class="dropdown-item-row">
                    <button class="dropdown-item" data-filename="${doc.filename}" data-type="${doc.docType}">
                        ${doc.name} <span style="opacity:.6">(${doc.docType === 'document' ? 'Document' : 'Cover Letter'})</span>
                    </button>
                    <button class="dropdown-item-cursor" data-filename="${doc.filename}" data-type="${doc.docType}" title="Open in Cursor">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15,3 21,3 21,9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </button>
                </div>`
            ).join('');

            // Add click handlers - load file
            elements.coverLetterDropdown.querySelectorAll('.dropdown-item').forEach(btn => {
                btn.addEventListener('click', () => loadSavedDocument(btn.dataset.filename, btn.dataset.type));
            });
            // Add click handlers - open in Cursor
            elements.coverLetterDropdown.querySelectorAll('.dropdown-item-cursor').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openInCursor(btn.dataset.filename, btn.dataset.type);
                });
            });
        }
    } catch (error) {
        console.error('Failed to load saved documents:', error);
        elements.coverLetterDropdown.innerHTML = '<div class="dropdown-empty">Failed to load saved documents</div>';
    }
}

async function loadSavedDocument(filename, type = 'document') {
    if (type === 'cover-letter') {
        return loadCoverLetter(filename);
    }
    return loadDocument(filename);
}

// Load a template
async function loadTemplate(filename) {
    try {
        const response = await fetch(`/api/templates/${filename}`);
        const data = await response.json();

        if (data.content) {
            elements.editor.setValue(data.content);
            elements.filenameInput.value = filename.replace('.tex', '');
            persistDraft('draft');
        }
    } catch (error) {
        console.error('Failed to load template:', error);
    }
}

// Load a saved document
async function loadDocument(filename) {
    try {
        const response = await fetch(`/api/documents/${filename}`);
        const data = await response.json();

        if (data.content) {
            elements.editor.setValue(data.content);
            elements.filenameInput.value = filename.replace('.tex', '');
            // Remember this as the last opened document
            localStorage.setItem(STORAGE_KEYS.filename, filename);
            localStorage.setItem(STORAGE_KEYS.source, 'saved');
            localStorage.removeItem(STORAGE_KEYS.content);
        }
    } catch (error) {
        console.error('Failed to load document:', error);
    }
}

// Load a saved cover letter
async function loadCoverLetter(filename) {
    try {
        const response = await fetch(`/api/cover-letters/${filename}`);
        const data = await response.json();

        if (data.content) {
            elements.editor.setValue(data.content);
            elements.filenameInput.value = filename.replace('.tex', '');
            // Remember this as the last opened document
            localStorage.setItem(STORAGE_KEYS.filename, filename);
            localStorage.setItem(STORAGE_KEYS.source, 'saved');
            localStorage.removeItem(STORAGE_KEYS.content);
        }
    } catch (error) {
        console.error('Failed to load cover letter:', error);
    }
}

function showFullPreview() {
    if (editorVisible) {
        toggleEditor();
    }
    elements.backToEditorBtn.hidden = false;
}

function showEditorPanel() {
    if (!editorVisible) {
        toggleEditor();
    }
    elements.backToEditorBtn.hidden = true;
}

// Compile document
async function compileDocument() {
    const content = elements.editor.getValue();
    const filename = elements.filenameInput.value || 'document';
    const compiler = elements.compilerSelect.value;

    // Show loading
    elements.loadingOverlay.classList.remove('hidden');
    hideError();

    try {
        const response = await fetch('/api/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, filename, compiler })
        });

        const data = await response.json();

        if (data.success) {
            // Show PDF preview
            currentPdfFilename = data.pdf_filename || ((elements.filenameInput.value || 'document') + '.pdf');
            currentPdfUrl = data.pdf_url + '?t=' + Date.now();
            elements.pdfViewer.src = currentPdfUrl;
            elements.pdfViewer.classList.remove('hidden');
            elements.previewPlaceholder.style.display = 'none';
            elements.downloadBtn.disabled = false;
            showFullPreview();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Failed to connect to server: ' + error.message);
    } finally {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// Save document
async function saveDocument(e) {
    if (e) e.preventDefault();

    const content = elements.editor.getValue();
    const filename = elements.filenameInput.value || 'document';

    try {
        const response = await fetch(`/api/documents/${filename}.tex`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (data.success) {
            // Remember this as the last opened document
            localStorage.setItem(STORAGE_KEYS.filename, data.filename);
            localStorage.setItem(STORAGE_KEYS.source, 'saved');
            localStorage.removeItem(STORAGE_KEYS.content);

            // Visual feedback
            elements.saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                </svg>
                Saved!
            `;
            setTimeout(() => {
                elements.saveBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                    </svg>
                    Save
                `;
            }, 2000);
        }
    } catch (error) {
        showError('Failed to save: ' + error.message);
    }
}

// Load last opened document from localStorage
async function loadLastOpenedDocument() {
    const lastDocument = localStorage.getItem(STORAGE_KEYS.filename);
    const lastContent = localStorage.getItem(STORAGE_KEYS.content);
    const lastSource = localStorage.getItem(STORAGE_KEYS.source);
    const lastPath = localStorage.getItem(STORAGE_KEYS.path);

    // Try loading a file opened from the file browser (external path)
    if (lastSource === 'external' && lastPath) {
        try {
            const response = await fetch(`/api/file?path=${encodeURIComponent(lastPath)}`);
            const data = await response.json();
            if (data.content) {
                elements.editor.setValue(data.content);
                elements.filenameInput.value = lastDocument ? lastDocument.replace('.tex', '') : 'my_document';
                return;
            }
        } catch (error) {
            console.log('Last external file not found, falling back to draft');
        }
    }

    if (lastSource === 'saved' && lastDocument) {
        try {
            const response = await fetch(`/api/documents/${lastDocument}`);
            const data = await response.json();
            if (data.content) {
                elements.editor.setValue(data.content);
                elements.filenameInput.value = lastDocument.replace('.tex', '');
                return;
            }
        } catch (error) {
            console.log('Last opened document not found, falling back to local draft');
        }
    }

    if (lastContent) {
        elements.editor.setValue(lastContent);
        elements.filenameInput.value = lastDocument ? lastDocument.replace('.tex', '') : 'my_document';
        return;
    }

    // If no saved document or draft, use default template
    elements.editor.setValue(defaultTemplate);
    elements.filenameInput.value = 'my_document';
    persistDraft('draft');
}

// Create new document with unique auto-generated filename
async function newDocument() {
    // Generate a unique filename by checking existing saved documents
    let newName = 'untitled_1';
    try {
        const response = await fetch('/api/documents');
        const documents = await response.json();
        const existingNames = new Set(documents.map(r => r.name));

        let counter = 1;
        while (existingNames.has(`untitled_${counter}`)) {
            counter++;
        }
        newName = `untitled_${counter}`;
    } catch {
        // Fallback if API fails
        newName = `untitled_${Date.now()}`;
    }

    // Clean slate: minimal LaTeX canvas, unique filename, reset preview
    elements.editor.setValue(blankTemplate);
    elements.filenameInput.value = newName;
    elements.pdfViewer.classList.add('hidden');
    elements.previewPlaceholder.style.display = 'flex';
    elements.downloadBtn.disabled = true;
    elements.backToEditorBtn.hidden = true;
    currentPdfUrl = null;
    currentPdfFilename = null;

    // Clear saved-file association so this is treated as a fresh draft
    localStorage.removeItem(STORAGE_KEYS.content);
    localStorage.setItem(STORAGE_KEYS.source, 'draft');
    localStorage.setItem(STORAGE_KEYS.filename, `${newName}.tex`);

    // Focus the filename input so the user can rename immediately
    elements.filenameInput.focus();
    elements.filenameInput.select();
}

function persistDraft(source = 'draft') {
    if (!elements.editor) return;
    if (persistTimer) {
        clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
        const filename = elements.filenameInput.value || 'my_document';
        localStorage.setItem(STORAGE_KEYS.filename, `${filename}.tex`);
        localStorage.setItem(STORAGE_KEYS.content, elements.editor.getValue());
        localStorage.setItem(STORAGE_KEYS.source, source);
    }, 300);
}

// Open a file in Cursor IDE (or VS Code as fallback)
async function openInCursor(filename, type = 'document') {
    // If opening the current file, save it to disk first so the editor sees latest content
    if (!filename) {
        const currentFilename = elements.filenameInput.value || 'document';
        filename = currentFilename + '.tex';
        type = 'document';

        // Quick-save to disk before opening
        try {
            await fetch(`/api/documents/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: elements.editor.getValue() })
            });
        } catch {
            // Continue anyway - file might already exist on disk
        }
    }

    try {
        const response = await fetch('/api/open-in-editor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, type })
        });
        const data = await response.json();

        if (!data.success) {
            showError(data.error || 'Could not open file in editor.');
        }
    } catch (error) {
        showError('Failed to open in editor: ' + error.message);
    }
}

// Download PDF
function downloadPdf() {
    if (currentPdfFilename) {
        const link = document.createElement('a');
        link.href = `/api/pdf-download/${encodeURIComponent(currentPdfFilename)}`;
        link.download = currentPdfFilename;
        link.click();
    }
}

// Toggle word wrap
function toggleWordWrap() {
    wordWrap = !wordWrap;
    elements.editor.setOption('lineWrapping', wordWrap);
    elements.wrapBtn.style.color = wordWrap ? 'var(--accent-secondary)' : 'var(--text-muted)';
}

// Toggle editor visibility
function toggleEditor() {
    editorVisible = !editorVisible;
    if (editorVisible) {
        elements.mainContent.classList.remove('editor-hidden');
        elements.toggleEditorBtn.classList.add('active');
        elements.toggleEditorBtn.title = "Minimize Editor Entirely";
        elements.backToEditorBtn.hidden = true;
        // Refresh CodeMirror to fix layout issues when appearing
        setTimeout(() => elements.editor.refresh(), 100);
    } else {
        elements.mainContent.classList.add('editor-hidden');
        elements.toggleEditorBtn.classList.remove('active');
        elements.toggleEditorBtn.title = "Restore Editor Panel";
        elements.backToEditorBtn.hidden = !currentPdfUrl;
    }
}

// Show error toast
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');
}

// Hide error toast
function hideError() {
    elements.errorToast.classList.add('hidden');
}

// Setup resize handle
function setupResizeHandle() {
    const editorPanel = document.querySelector('.editor-panel');
    let isResizing = false;
    let startX, startWidth;

    elements.resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = editorPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(300, Math.min(window.innerWidth - 300, startWidth + diff));
        editorPanel.style.flex = 'none';
        editorPanel.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// Initialize application
function init() {
    initEditor();
    checkLatexStatus();
    loadTemplates();
    loadSavedDocuments();
    setupDropdownButtons();
    loadAllTexFiles();
    setupResizeHandle();

    // Event listeners
    elements.compileBtn.addEventListener('click', compileDocument);
    elements.saveBtn.addEventListener('click', saveDocument);
    elements.newBtn.addEventListener('click', newDocument);
    elements.downloadBtn.addEventListener('click', downloadPdf);
    elements.wrapBtn.addEventListener('click', toggleWordWrap);
    elements.minimizeBtn.addEventListener('click', toggleEditor);
    elements.toggleEditorBtn.addEventListener('click', toggleEditor);
    elements.backToEditorBtn.addEventListener('click', showEditorPanel);
    elements.closeToast.addEventListener('click', hideError);
    elements.cursorBtn.addEventListener('click', () => openInCursor());
    elements.filenameInput.addEventListener('input', () => persistDraft());

    // File browser
    elements.viewFilesBtn.addEventListener('click', openFileBrowser);
    elements.filesBrowserClose.addEventListener('click', closeFileBrowser);
    elements.filesBrowserOverlay.addEventListener('click', (e) => {
        if (e.target === elements.filesBrowserOverlay) closeFileBrowser();
    });
    elements.filesBrowserSearch.addEventListener('input', (e) => {
        filterFiles(e.target.value);
    });

    // Set initial toggle state
    elements.toggleEditorBtn.classList.add('active');

    // Set initial wrap button state
    elements.wrapBtn.style.color = 'var(--accent-secondary)';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

// Backward-compatible names used by Electron menu commands.
window.compileDocument = compileDocument;
window.saveDocument = saveDocument;
window.newDocument = newDocument;


