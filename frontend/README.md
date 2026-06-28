# DocuMind AI - Frontend

The frontend for DocuMind AI is built with performance and modern SaaS aesthetics in mind.

## Folder Structure
- `/src/components/ui`: Reusable, theme-aware components (`Button`, `Card`, `Skeleton`, `EmptyState`).
- `/src/contexts`: React Contexts (e.g., `ThemeContext` for managing Dark/Light modes).
- `/src/pages`: Main application views (`Auth`, `Dashboard`, `Chat`).
- `/src/api`: Axios instance configured for automatic JWT insertion.

## Styling Guidelines
We use Tailwind CSS v4. Instead of hardcoded colors like `text-white`, we utilize CSS variables defined in `index.css`:
- `bg-background`: Main application background.
- `bg-surface`: Card and modal backgrounds.
- `text-textMain`: Primary text (automatically adapts to dark/light mode).
- `text-textMuted`: Secondary/helper text.
- `bg-primary`: The main brand color (Indigo).

## State Management
- Routing is handled via `react-router-dom`.
- The `AppLayout` component acts as the master wrapper, providing a dual-sidebar navigation experience and passing a `refreshTrigger` via the `<Outlet context />` to synchronize data re-fetching (like dashboard stats) upon global actions (like deleting a PDF).
- `react-hot-toast` is used for global notifications.
