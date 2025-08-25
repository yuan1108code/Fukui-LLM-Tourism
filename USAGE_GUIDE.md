# Fukui Tourism AI Assistant - Usage Guide

## 🚀 Quick Start

### 1. Environment Preparation
```bash
# Ensure Python 3.8+ and Node.js 16+ are installed
python --version
node --version
```

### 2. Configure API Keys
```bash
# Copy environment variable template
cp .env.example .env

# Edit .env file and add your API keys
# OPENAI_API_KEY=your_openai_api_key_here
# GOOGLE_MAPS_API_KEY=your_google_maps_key_here (optional)
```

### 3. One-Click Launch
```bash
# Automatically install dependencies and start all services
./start_dev_optimized.sh
```

### 4. Open the Application
- **Frontend Interface**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎯 Main Features

### AI-Powered Q&A
- Ask about shrines and attractions in Fukui Prefecture
- Get detailed tourism recommendations
- Location-aware search support

### Interactive Maps
- Visualize attraction locations
- Click to view detailed information
- Support map zoom and pan

### Quick Actions
- Predefined questions for quick queries
- One-click search for popular attractions
- Intelligent recommendation system

## 🔧 Common Commands

### Start Services
```bash
# Development mode startup
./start_dev_optimized.sh

# Stop all services
./stop_dev.sh

# Check service status
./check_services.sh
```

### Data Processing
```bash
# Optimize data loading
python optimize_data_loading.py
```

### Development Tools
```bash
# Start frontend development server
cd frontend && npm run dev

# Start backend development server
cd backend && python app.py
```

## 📁 Project Structure

```
Fukui Tourism AI Assistant/
├── 📱 frontend/          # React frontend application
├── 📡 backend/           # FastAPI backend service
├── 🗄️ chroma_db/        # Vector database
├── 📊 data/             # Raw data files
├── 🔧 src/              # Data processing tools
├── 📄 output/           # Processed data
├── 📚 docs/             # Project documentation
├── 🚀 *.sh              # Automation scripts
└── ⚙️ *.py              # Tool scripts
```

## 🛠️ Troubleshooting

### Common Issues

**Q: Cannot start services**
```bash
# Check dependencies
pip install -r requirements.txt
cd frontend && npm install

# Check API key configuration
cat .env
```

**Q: Data loading fails**
```bash
# Regenerate data
python src/Markdown_Generator/convert_all_to_natural_language.py

# Recreate vector database
rm -rf chroma_db/
python src/Vector_Database/ChromaDB_v1.py
```

**Q: Frontend cannot connect to backend**
```bash
# Check backend service status
curl http://localhost:8000/health

# Check firewall settings
# Ensure ports 8000 and 3000 are not blocked
```

### Performance Optimization

**High memory usage**
```bash
# Use fast mode startup
./start_with_optimization.sh

# Choose fast mode (50 attractions + 50 shrines)
```

**Slow response time**
```bash
# Check network connection
# Confirm OpenAI API service is normal
# Consider upgrading API plan
```

## 📚 Detailed Documentation

For more detailed information, please refer to the `docs/` directory:

- `README_EN.md` - Complete project description
- `DEV_GUIDE.md` - Developer guide
- `FRONTEND_README.md` - Frontend development guide

## 🔗 Related Links

- **GitHub Project**: [Project URL]
- **API Documentation**: http://localhost:8000/docs
- **Frontend Interface**: http://localhost:3000

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintainer**: [Your Name]
