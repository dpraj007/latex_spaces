# LaTeX Resume Editor - Environment Setup

A beautiful web-based LaTeX editor for creating, editing, and compiling professional resumes with live PDF preview.

![Editor Preview](https://via.placeholder.com/800x400/1c1c2e/7c3aed?text=LaTeX+Resume+Editor)

## Features

- 🎨 **Modern Dark Theme** - Easy on the eyes, great for extended editing
- ✏️ **Syntax Highlighting** - LaTeX-aware code editor with CodeMirror
- 📄 **Live PDF Preview** - Compile and preview your resume instantly
- ⚙️ **Multi-Compiler Support** - Choose between `pdflatex`, `xelatex`, and `lualatex`
- 💾 **Save & Load** - Manage multiple resume versions
- 📑 **Templates** - Professional templates to get started quickly
- ⌨️ **Keyboard Shortcuts** - `Ctrl+Enter` to compile, `Ctrl+S` to save
- 📱 **Responsive** - Works on desktop and tablets

---

## Prerequisites

### 1. Python 3.8+

Download and install Python from [python.org](https://www.python.org/downloads/)

Verify installation:
```bash
python --version
```

### 2. LaTeX Distribution (Required for PDF compilation)

**Option A: MiKTeX (Recommended for Windows)**
1. Download from [miktex.org/download](https://miktex.org/download)
2. Run the installer
3. During installation, select "Yes" for "Install missing packages on-the-fly"
4. Restart your terminal after installation

**Option B: TeX Live**
1. Download from [tug.org/texlive](https://tug.org/texlive/)
2. Follow installation instructions

Verify LaTeX installation:
```bash
pdflatex --version
```

---

## Quick Start

### Step 1: Create Virtual Environment

Open PowerShell/Terminal in the **RESUME** project root:

```powershell
# Navigate to the project root
cd C:\Users\ddpat\Desktop\RESUME

# Create virtual environment (at project root)
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate

# Or for Command Prompt:
# venv\Scripts\activate.bat

# Or for Git Bash/Unix:
# source venv/Scripts/activate
```

### Step 2: Install Dependencies

```powershell
pip install -r code/config/requirements.txt
```

### Step 3: Run the Application

From the project root (RESUME folder):

```powershell
python code/backend/app.py
```

### Step 4: Open in Browser

Navigate to: **http://localhost:5000**

---

## Directory Structure

```
RESUME/
├── latex/                  # All LaTeX files
│   ├── resumes/            # Saved resume .tex files
│   ├── cover_letters/      # Saved cover letter .tex files
│   └── templates/          # LaTeX templates
│       ├── professional_modern.tex
│       ├── minimal_elegant.tex
│       ├── academic_cv.tex
│       └── tech_startup.tex
├── code/
│   ├── backend/
│   │   └── app.py          # Flask backend server
│   ├── frontend/           # Frontend files
│   │   ├── index.html      # Main editor page
│   │   ├── styles.css      # Styling
│   │   └── app.js          # Frontend JavaScript
│   └── config/
│       ├── requirements.txt
│       └── ENVIRONMENT_SETUP.md  # This file
├── output/                 # Compiled PDFs
└── venv/                   # Python virtual environment
```

---

## Usage Guide

### Creating a New Resume

1. Click the **New** button (📄) to start with the default template
2. Or select a template from the **Templates** dropdown

### Editing

- The editor supports full LaTeX syntax with highlighting
- Use **Tab** for indentation, **Shift+Tab** to outdent
- Click **Wrap** to toggle word wrapping
- Common LaTeX commands are auto-completed

### Compiling to PDF

- Select your preferred compiler (`pdflatex`, `xelatex`, or `lualatex`) from the dropdown next to the filename.
- Click **Compile PDF** button
- Or press **Ctrl+Enter** (Cmd+Enter on Mac)
- The PDF preview appears on the right panel
- **Note**: `xelatex` is recommended if you are using custom system fonts.

### Saving Your Work

- Enter a filename in the input field
- Click **Save** or press **Ctrl+S**
- Saved resumes appear in the **Open** dropdown

### Downloading PDF

- After compiling, click **Download** in the preview panel
- The PDF is saved with your specified filename

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Compile PDF |
| `Ctrl + S` | Save Resume |
| `Tab` | Indent |
| `Shift + Tab` | Outdent |

---

## Templates Included

### 1. Professional Modern
Clean, ATS-friendly design with icons and a modern color scheme. Great for tech and corporate roles.

### 2. Minimal Elegant
Typography-focused design using serif fonts. Perfect for design, marketing, and creative roles.

### 3. Academic CV
Comprehensive format for academia with sections for publications, grants, and teaching experience.

### 4. Tech Startup
Bold, modern design emphasizing metrics and achievements. Ideal for startup and tech leadership roles.

---

## Troubleshooting

### "LaTeX not found" error

1. Ensure MiKTeX or TeX Live is installed
2. Restart your terminal after installation
3. Verify with: `pdflatex --version`

### Missing packages during compilation

If using MiKTeX:
1. Open MiKTeX Console
2. Go to Settings → General
3. Set "Install missing packages" to "Yes"

Or install manually:
```bash
mpm --install <package-name>
```

### Port 5000 already in use

Edit `code/backend/app.py` and change the port:
```python
app.run(debug=True, port=5001)  # Change to any available port
```

### Compilation timeout

Complex documents may take longer. The default timeout is 60 seconds. To increase, edit `code/backend/app.py`:
```python
timeout=120  # Increase to 120 seconds
```

---

## Customization

### Adding Custom Templates

1. Create a `.tex` file in the `latex/templates/` folder
2. Restart the server
3. Your template will appear in the Templates dropdown

### Changing the Theme

Edit `code/frontend/styles.css` and modify the CSS variables in `:root`:

```css
:root {
    --bg-primary: #0d0d14;      /* Main background */
    --accent-primary: #7c3aed;   /* Accent color */
    /* ... other variables ... */
}
```

---

## Tips for Great Resumes

1. **Keep it concise** - Aim for 1 page (2 max for senior roles)
2. **Use action verbs** - Led, Built, Designed, Increased, etc.
3. **Quantify achievements** - "Increased revenue by 40%" vs "Improved sales"
4. **Tailor for each role** - Customize content for the job you're applying to
5. **Check ATS compatibility** - Avoid tables, graphics, and unusual fonts

---

## Need Help?

- **LaTeX Documentation**: [overleaf.com/learn](https://www.overleaf.com/learn)
- **LaTeX Symbols**: [detexify.kirelabs.org](https://detexify.kirelabs.org/)
- **Resume Tips**: [resume.io/blog](https://resume.io/blog)

---

Happy resume building! 🚀
