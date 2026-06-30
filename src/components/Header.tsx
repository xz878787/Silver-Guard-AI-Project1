"use client";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "银发守护 AI", subtitle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-title">
        <span className="app-logo" aria-hidden="true">AI</span>
        <h1>{title}</h1>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
