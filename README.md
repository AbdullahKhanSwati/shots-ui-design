# SHOTS - Business Management Mobile App

A comprehensive Expo React Native application for managing multiple businesses, starting with Phase 1 focusing on the Shots Snooker & Pool Club.

## Features

### Dashboard
- Business selection on app launch
- Admin authentication (login/logout)
- Real-time statistics (revenue, tables, members)
- Quick access navigation

### Tables Management
- View all pool and snooker tables
- Filter by status (Available, Occupied, Maintenance)
- Mark tables as available/occupied
- Track table maintenance and cleaning schedules
- Reserve tables for members

### Memberships
- Manage active and expired memberships
- Digital membership cards
- Membership type tracking (Premium, Standard, Basic)
- Renew memberships
- Filter by status
- Add new members

### Finance Tracking
- Income and expense tracking
- Period filtering (Week, Month, Year)
- Net profit calculations
- Transaction history by date
- Category-based financial insights

### Additional Features
- Responsive drawer navigation menu
- Bottom tab navigation for main sections
- Professional snooker-themed design system
- All data stored locally (no backend required)
- Optional AsyncStorage for data persistence

## Project Structure

```
src/
├── screens/              # All main app screens
│   ├── SplashScreen.js
│   ├── BusinessSelectionScreen.js
│   ├── LoginScreen.js
│   ├── DashboardScreen.js
│   ├── TablesScreen.js
│   ├── MembershipsScreen.js
│   └── FinanceScreen.js
├── components/           # Reusable UI components
│   ├── StatCard.js
│   ├── TableCard.js
│   ├── MembershipCard.js
│   └── MenuDrawer.js
├── navigation/           # Navigation configuration
│   └── RootNavigator.js
├── data/                # Mock data
│   └── mockData.js
└── styles/              # Design system and theme
    └── theme.js
```

## Design System

**Colors:**
- Primary: `#1a472a` (Deep forest green)
- Secondary: `#D4A574` (Gold/bronze)
- Accent: `#dc143c` (Crimson red)
- Success: `#4caf50`
- Error: `#f44336`

**Spacing Scale:** 4px, 8px, 12px, 16px, 24px, 32px

**Typography:** 
- Headings: Bold, varying sizes
- Body: 16px regular
- Captions: 12px for metadata

## Mock Data

All data is completely client-side and includes:
- 6 snooker/pool tables with different statuses
- 5 sample memberships
- Finance transactions
- Time slot availability
- Maintenance logs

No backend or database required - perfect for prototyping and testing.

## Getting Started

### Installation
```bash
# Install dependencies
pnpm install

# Start the development server
pnpm start

# For specific platforms:
pnpm web      # Web browser
pnpm android  # Android emulator
pnpm ios      # iOS simulator
```

### Demo Credentials
- Email: `admin@shots.com`
- Password: `password`

## Technology Stack

- **Framework:** Expo React Native
- **Navigation:** React Navigation (Stack, Tabs, Drawer)
- **UI Components:** React Native Paper
- **State Management:** React Context API + hooks
- **Styling:** React Native StyleSheet
- **Storage:** AsyncStorage (optional)

## Future Phases

Phase 2 and beyond could include:
- Backend API integration (Supabase, Firebase, etc.)
- Real database persistence
- Payment integration
- Advanced analytics
- Multi-user support
- Real-time notifications
- Additional business types (Sadozai Block Factory, Munchies Restaurant)

## Navigation Flow

```
Splash Screen
    ↓
Business Selection
    ↓
Login
    ↓
Main App (Drawer + Bottom Tabs)
├── Dashboard
├── Memberships
├── Tables
├── Finance
└── Menu Drawer
    ├── Settings
    ├── Reports
    ├── Help & Support
    └── Logout
```

## Notes

- All data is stored in local state (React hooks)
- No API calls or database connections
- Design is fully responsive for mobile screens
- Snooker/pool themed throughout for visual consistency
- Ready for Phase 2 backend integration

## License

Built with v0 - Vercel's AI-powered assistant for building web apps.
