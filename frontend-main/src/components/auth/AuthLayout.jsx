export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl md:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-sand/60 bg-cream/50 p-12 md:flex">
        <p className="eyebrow">Smart Travel</p>
        <blockquote className="max-w-sm">
          <p className="font-display text-3xl font-light leading-snug">
            "The plan was three museums a day. The plan lasted until lunch on day one."
          </p>
          <footer className="mt-4 text-sm text-soot">- everyone, on every trip, before this</footer>
        </blockquote>
        <p className="text-xs text-stone">Itineraries paced for humans. Budgets you can argue with.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-soot">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-soot">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
