# Euphrates (Robust Edition)
### Kolkata Afforestation Explorer & Environmental Memory

Euphrates has been upgraded from a prototype to a **Robust Ecosystem**. It now features a dedicated backend for data persistence, allowing users to save and revisit environmental analyses.

## 🏗️ Robust Architecture
- **Frontend**: React.js (ESM-based) with Framer Motion for premium "Apple-like" UI.
- **Backend**: Python **FastAPI** serving as a high-performance REST API.
- **Database (Memory)**: **SQLite** for reliable, lightweight persistence of analysis history.
- **Maps**: Coordinated **Leaflet (2D)** and **CesiumJS (3D)** views.

## 🌟 New Features
- **Persistent Memory**: Every search and analysis is saved to a local database.
- **History Sidebar**: Access your previous 20 analyses via the new history button.
- **One-Click Sync**: Select any past analysis from the memory to instantly fly back to that location on the map.
- **API Architecture**: Clean separation of concerns between visualization and data logic.

## 🚀 Installation & Setup
1. **Dependencies**: Ensure you have Python 3.12+ installed.
2. **Install Libraries**:
   ```powershell
   pip install fastapi uvicorn
   ```
3. **Run Everything**:
   Simply execute the master launcher:
   ```powershell
   python run_app.py
   ```
   This will start the backend, the frontend server, and open your browser automatically.

## 📊 Analysis Logic
The environmental engine classifies areas based on:
- **Vegetation**: Proximity to Kolkata's green lungs.
- **Land Type**: Distance from the Hooghly river and urban density nodes.
- **Open Space**: Calculation of building density vs. green index.

---
*Built for robustness. Designed for Kolkata.*
