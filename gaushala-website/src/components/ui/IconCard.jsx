// Small presentational card reused across the Services page, Volunteer
// "Types of Seva" section, and the Home page service/activity previews —
// keeps that repeated icon+title+description card markup in one place.
export default function IconCard({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-2xl bg-white p-6 shadow-soft transition-shadow hover:shadow-lift ${className}`}
    >
      {Icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <h3 className="font-display text-lg text-brown-800">{title}</h3>
      {description && (
        <p className="text-sm leading-relaxed text-brown-500">{description}</p>
      )}
      {action}
    </div>
  );
}
