export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brown-200 bg-cream-50 px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brown-300 shadow-soft">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-medium text-brown-600">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-brown-400">{subtitle}</p>}
      {action}
    </div>
  );
}
