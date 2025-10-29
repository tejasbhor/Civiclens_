# CivicLens Client - Citizen & Officer Web Portal

Modern web application for citizens to report civic issues and officers to manage and resolve them.

## 🚀 Features

### Citizen Portal
- **Quick Login** - OTP-based instant access
- **Full Registration** - Complete account with email and password
- **Submit Reports** - Report civic issues with photos and location
- **Track Reports** - Real-time status updates and timeline
- **My Reports** - View all submitted reports
- **Profile Management** - Update personal information

### Officer Portal
- **Task Management** - View and manage assigned tasks
- **Acknowledge Tasks** - Accept responsibility for reports
- **Start Work** - Begin resolution process
- **Complete Work** - Submit completion with before/after photos
- **Dashboard** - Performance metrics and statistics

## 🛠️ Tech Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Query** - Data fetching and caching

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

Create a `.env` file in the root directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1
```

## 🏃 Development

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── pages/
│   ├── citizen/          # Citizen portal pages
│   └── officer/          # Officer portal pages
├── components/           # Reusable UI components
├── services/            # API services
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
└── App.tsx             # Main application component
```

## 🔗 Backend Integration

This client connects to the CivicLens FastAPI backend. Make sure the backend is running before starting the client.

**Backend Repository:** `../civiclens-backend`

**Backend API Docs:** http://localhost:8000/docs

## 🧪 Testing

```bash
# Run linter
npm run lint
```

## 📝 License

Private - CivicLens Project

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.
