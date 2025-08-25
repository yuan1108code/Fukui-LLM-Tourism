# Project Directory Structure

## 📁 Root Directory Files

### Core Files
- `README_EN.md` - Complete project description
- `USAGE_GUIDE_EN.md` - Concise usage guide
- `PROJECT_OVERVIEW.md` - Project overview
- `requirements.txt` - Python dependencies

### Automation Scripts
- `start_dev_optimized.sh` - One-click startup script (Recommended)
- `start_with_optimization.sh` - Optimized startup script
- `stop_dev.sh` - Stop services script
- `check_services.sh` - Check service status

### Tool Scripts
- `optimize_data_loading.py` - Data loading optimization
- `chromadb_config.py` - ChromaDB configuration

### Configuration Files
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules
- `chromadb_config.py` - ChromaDB configuration

## 📂 Main Directories

### 🎨 Frontend Application (`frontend/`)
```
frontend/
├── src/              # React source code
│   ├── components/   # React components
│   ├── services/     # API services
│   └── App.tsx       # Main application
├── public/           # Static resources
├── dist/             # Build output
└── package.json      # Node.js dependencies
```

### 🔧 Backend Service (`backend/`)
```
backend/
├── app.py           # FastAPI main service
├── venv/            # Python virtual environment
└── chroma_db/       # Backend ChromaDB data
```

### 🗄️ Vector Database (`chroma_db/`)
- ChromaDB vector database files
- Contains vectorized data for attractions and shrines

### 📊 Data Files (`data/`)
```
data/
├── fukui_location.json           # Original attraction data
├── shrines_detail.csv           # Shrine detailed data
└── fukui-attraction-picture/    # Attraction image resources
```

### 🔧 Data Processing Tools (`src/`)
```
src/
├── JSON_Generator/              # JSON data generators
│   ├── Google_Map_API_Location.py
│   └── Search_Engine_Shrine.py
├── Markdown_Generator/          # Markdown generators
│   ├── convert_all_to_natural_language.py
│   ├── location_to_natural_language.py
│   └── shrine_to_natural_language.py
└── Vector_Database/             # Vector database management
    └── ChromaDB_v1.py
```

### 📄 Output Data (`output/`)
- Processed JSON and Markdown files
- Natural language conversion results

### 📚 Project Documentation (`docs/`)
```
docs/
├── BACKEND_FIX_REPORT.md        # Backend fix report
├── DEV_GUIDE.md                 # Developer guide
├── EDIT_MODE_GUIDE.md           # Edit mode guide
├── FRONTEND_README.md           # Frontend guide
├── LOCATION_TIME_ENHANCEMENT.md # Location enhancement
├── SHRINE_SEARCH_*.md           # Shrine search reports
├── STORY_MODE_IMPLEMENTATION.md # Story mode implementation
└── TRANSLATION_REPORT.md        # Translation report
```

### 📱 QR Code Resources (`QRcode_http/`)
- Geographic location QR Code image files
- Used for physical navigation
- `qrcode_html.py` - QR Code generation tool

## 🚀 Quick Navigation

### New Users
1. Read `USAGE_GUIDE_EN.md` - Quick start
2. Check `PROJECT_OVERVIEW.md` - Understand project features
3. Execute `./start_dev_optimized.sh` - Launch application

### Developers
1. Check `docs/DEV_GUIDE.md` - Development guide
2. Examine `src/` directory - Data processing tools
3. Reference `frontend/` and `backend/` - Code structure

### Maintainers
1. Check `docs/` directory - Complete documentation
2. Check `.gitignore` - Version control rules
3. Reference report files - Understand development history

---

**Note**: All `.log`, `.pid`, and `.DS_Store` files have been cleaned up and will not appear in version control.
