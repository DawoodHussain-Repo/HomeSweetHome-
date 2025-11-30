interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm backdrop-blur-sm">
      {message}
    </div>
  );
}
