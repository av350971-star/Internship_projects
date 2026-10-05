export default function AdminPageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl text-brown-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brown-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
