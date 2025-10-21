# IPD Dashboard - Interactive 3D Globe Visualization

A comprehensive React-based dashboard featuring an interactive 3D globe visualization for sales data analysis by country.

## 🌍 Features

### Dashboard Components
- **KPI Cards**: Key performance indicators with real-time data
- **Interactive Maps**: 2D and 3D map views with country-based data
- **Sales Visualization**: Country-wise sales data with percentage breakdowns
- **Responsive Design**: Optimized for desktop and mobile viewing

### 3D Globe Features
- **Interactive Globe**: Built with react-globe.gl and Three.js
- **Country Labels**: Dynamic country names with sales percentages
- **Zoom Controls**: Smooth zoom, rotation, and pan controls
- **Fullscreen Mode**: Immersive viewing experience
- **Local Market Focus**: Automatically centers on UAE (local market)

### Technical Features
- **Real-time Data**: Live data from SQLite database
- **API Integration**: RESTful API for data fetching
- **Performance Optimized**: 60fps rendering with GPU acceleration
- **Cross-platform**: Works on Windows, Mac, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/camS74/IPD.git
   cd IPD
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

3. **Start the application**
   ```bash
   # Start both frontend and backend
   npm run start-all
   
   # Or start individually
   npm start          # Frontend (port 3000)
   cd server && npm start  # Backend (port 3001)
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
IPD/
├── src/                    # React frontend source
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── charts/         # Chart components
│   │   └── common/         # Shared components
│   ├── contexts/           # React contexts
│   └── utils/              # Utility functions
├── server/                 # Node.js backend
│   ├── database/           # Database services
│   ├── data/              # Data files
│   └── scripts/           # Database scripts
├── public/                 # Static assets
│   └── assets/            # Images and resources
└── docs/                   # Documentation
```

## 🎮 Usage

### Dashboard Navigation
1. **KPI View**: Overview of key metrics
2. **2D Map**: Traditional map view with country data
3. **3D Globe**: Interactive 3D globe visualization

### 3D Globe Controls
- **Mouse Wheel**: Zoom in/out
- **Mouse Drag**: Rotate globe
- **Right Click + Drag**: Pan view
- **Fullscreen Button**: Enter/exit fullscreen mode
- **Click Labels**: View detailed country information

### Data Visualization
- **Country Labels**: Show country names and sales percentages
- **Color Coding**: Visual representation of sales data
- **Dynamic Sizing**: Label size based on sales volume
- **Smart Positioning**: Prevents label overlapping

## 🛠️ Development

### Available Scripts
```bash
npm start              # Start frontend development server
npm run build          # Build for production
npm test               # Run tests
npm run start-all      # Start both frontend and backend
```

### Backend Scripts
```bash
cd server
npm start              # Start backend server
npm run setup-db       # Setup database
npm run seed-data      # Seed sample data
```

## 📊 Data Structure

### Sales Data Format
```javascript
{
  country: "United Arab Emirates",
  sales: 29047664.6,
  percentage: 55.84,
  region: "UAE"
}
```

### API Endpoints
- `GET /api/sales-by-country` - Fetch sales data
- `GET /api/countries` - Get country information
- `GET /api/kpi-data` - Get KPI metrics

## 🔧 Configuration

### Environment Variables
Create `.env` file in the root directory:
```env
REACT_APP_API_URL=http://localhost:3001
NODE_ENV=development
```

### Database Configuration
Database configuration is in `server/database/config.js`:
```javascript
module.exports = {
  database: './data/ipd_database.db',
  // ... other config
};
```

## 🎨 Customization

### Styling
- CSS files in `src/components/` directories
- Global styles in `src/index.css`
- Component-specific styles

### Globe Appearance
Modify globe settings in `src/components/dashboard/SimpleGlobe.js`:
```javascript
// Globe configuration
backgroundColor="rgba(0,0,0,1)"
globeImageUrl="/assets/8k_earth.jpg"
backgroundImageUrl="/assets/starfield_4k.jpg"
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy to GitHub Pages
1. Build the project
2. Push to `gh-pages` branch
3. Enable GitHub Pages in repository settings

### Deploy to Vercel/Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `build`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **CamS74** - *Initial work* - [GitHub](https://github.com/camS74)

## 🙏 Acknowledgments

- React Globe GL library for 3D globe functionality
- Three.js for 3D graphics
- React community for excellent documentation
- All contributors and testers

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [Your Contact Information]

---

**Made with ❤️ for interactive data visualization**