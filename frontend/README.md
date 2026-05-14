# Aqdy Platform - Frontend 🚀

Welcome to the frontend of **Aqdy Platform**, a modern, high-performance web application built with React 19 and Vite. This project is designed with a focus on premium aesthetics, seamless internationalization (i18n), and robust Right-to-Left (RTL) support.

## ✨ Features

-   **React 19 & Vite 8**: Utilizing the latest React features and the fastest build tool.
-   **Tailwind CSS 4**: Modern styling with logical properties for seamless LTR/RTL support.
-   **Shadcn UI & Radix UI**: Accessible and beautiful pre-built components.
-   **Internationalization (i18n)**: Fully integrated with `i18next` supporting Arabic and English.
-   **RTL First**: Designed from the ground up to support RTL layouts perfectly.
-   **Dark Mode**: Native support for light and dark themes using `next-themes`.
-   **Performance Optimized**: Lazy loading, Suspense, and TanStack Query for efficient data fetching.
-   **Comprehensive Testing**: Unit and integration tests with Vitest and React Testing Library.

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Core** | React 19, TypeScript, Vite 8 |
| **Styling** | Tailwind CSS 4, Framer Motion, Lucide Icons, Hugeicons |
| **UI Components** | Shadcn UI, Radix UI |
| **State Management** | TanStack React Query (v5) |
| **Routing** | React Router 7 |
| **Internationalization** | i18next, react-i18next |
| **Testing** | Vitest, MSW, Testing Library |
| **Code Quality** | ESLint, Prettier, Lint-Staged |

## 🚀 Getting Started

### Prerequisites

-   Node.js (LTS version recommended)
-   npm or yarn

### Installation

1.  Clone the repository
2.  Navigate to the `frontend` directory:
    ```bash
    cd aqdy-platform/frontend
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Start the development server:
```bash
npm run dev
```

### Production Build

Build the application for production:
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

### Testing

Run the test suite:
```bash
npm test
```
Generate test coverage report:
```bash
npm run test:coverage
```

## 📂 Project Structure

```text
src/
├── api/          # API services and data fetching logic
├── assets/       # Static assets (images, fonts, etc.)
├── components/   # Reusable UI components
│   ├── layout/   # Layout-specific components (Header, Footer, MainLayout)
│   └── ui/       # Atomic UI components (Shadcn)
├── hooks/        # Custom React hooks
├── lib/          # External library configurations (i18n, queryClient, etc.)
├── locales/      # Translation files (JSON)
├── pages/        # Main application pages
├── store/        # Global state management
├── types/        # Global TypeScript types and interfaces
└── utils/        # Helper functions and utilities
```

## 🌍 Internationalization & RTL

The platform uses `i18next` for translations. We follow best practices for RTL support by:
-   Using Tailwind CSS **logical properties** (e.g., `ms-2` instead of `ml-2`).
-   Automatically detecting language and setting the `dir` attribute on the `<html>` tag.
-   Providing a `DirectionProvider` (if applicable) or handling direction shifts in the `MainLayout`.

## 🤝 Contributing

1.  **Format Code**: `npm run format`
2.  **Lint Check**: `npm run lint`
3.  **Type Check**: `npm run type-check`


---

## 📖 Additional Documentation

- [Component Architecture](file:///media/merna/merna/work/iti/Aqdy/aqdy-platform/frontend/COMPONENT_ARCHITECTURE.md) - Deep dive into our frontend structure and patterns.

Built with ❤️ by the Aqdy Development Team.
