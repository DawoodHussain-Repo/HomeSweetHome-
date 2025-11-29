interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
      {message}
    </div>
  );
}
