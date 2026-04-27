import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Hook pour reporter à un service plus tard si besoin
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border rounded-xl shadow-card p-8 text-center">
            <h1 className="text-xl font-heading font-bold text-foreground mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              L'application a rencontré un problème inattendu. Vous pouvez retourner à l'accueil et réessayer.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-muted text-muted-foreground rounded p-3 mb-6 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.reset} className="w-full">Retour à l'accueil</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
