# Professional Resume & LaTeX Editor Environment

This repository contains a professional resume and a dedicated LaTeX editing environment designed for viewing, editing, and compiling LaTeX-based resumes with ease.

## 📁 Repository Structure

```
RESUME/
├── Dhairyasheel_Patil_Resume.pdf   # Current version of the professional resume
├── README.md
├── latex/                           # All LaTeX files
│   ├── resumes/                     # Saved resume .tex files
│   ├── cover_letters/               # Saved cover letter .tex files
│   └── templates/                   # LaTeX templates
├── code/                            # Application code
│   ├── backend/                     # Flask backend
│   │   └── app.py
│   ├── frontend/                    # Frontend (HTML, CSS, JS)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── config/                      # Configuration
│       ├── requirements.txt
│       └── ENVIRONMENT_SETUP.md
├── output/                          # Compiled PDF output
└── venv/                            # Python virtual environment
```

---

## 🚀 LaTeX Resume Editor

The `code/` folder contains the application code for a modern, web-based interface to manage your LaTeX resumes. It features:

- 🎨 **Modern UI**: Dark-themed editor with a sleek, responsive design.
- ✏️ **Real-time Editing**: Syntax highlighting via CodeMirror.
- 📄 **Live PDF Preview**: Compile your LaTeX code and view the results instantly in your browser.
- ⚙️ **Multi-Compiler Support**: Support for `pdflatex`, `xelatex`, and `lualatex`.
- 📑 **Professional Templates**: Includes 4 pre-built templates (Modern, Minimal, Academic CV, Tech Startup).
- 💾 **Version Management**: Save and load multiple versions of your resumes and cover letters.

### Quick Start

1.  **Navigate to the project root** (RESUME folder) and create/activate the virtual environment:
    ```bash
    cd RESUME
    python -m venv venv
    .\venv\Scripts\Activate
    pip install -r code/config/requirements.txt
    ```
2.  **Run the application** (from project root):
    ```bash
    python code/backend/app.py
    ```
4.  **Access the editor**:
    Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🛠️ Prerequisites

To compile resumes locally, you need a LaTeX distribution installed on your system:

- **Windows**: [MiKTeX](https://miktex.org/download) (Recommended) or [TeX Live](https://tug.org/texlive/)
- **MacOS**: [MacTeX](https://tug.org/mactex/)
- **Linux**: `texlive-full` package

The editor will automatically detect available compilers on your system.

---

## 📑 Included Templates

1.  **Professional Modern**: Clean, ATS-friendly with icons.
2.  **Minimal Elegant**: Focused on beautiful typography.
3.  **Academic CV**: Multi-page format for research and teaching.
4.  **Tech Startup**: Bold design emphasizing metrics and skills.

For detailed setup instructions and troubleshooting, refer to [code/config/ENVIRONMENT_SETUP.md](code/config/ENVIRONMENT_SETUP.md).

---

## ⌨️ Shortcuts

- `Ctrl + Enter`: Compile PDF
- `Ctrl + S`: Save Resume
- `Ctrl + M`: Toggle Editor Visibility (Minimize/Restore)
- `Tab` / `Shift + Tab`: Indent / Outdent
