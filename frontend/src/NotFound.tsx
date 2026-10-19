import { Link } from 'react-router-dom';
import { HomeIcon } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground/50">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <HomeIcon className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}
