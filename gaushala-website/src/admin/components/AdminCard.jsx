export default function AdminCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-soft sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
