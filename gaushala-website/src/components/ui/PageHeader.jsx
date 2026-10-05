export default function PageHeader({ title, subtitle }) {
  return (
    <div className="bg-cream-100">
      <div className="container-page py-12 text-center sm:py-16">
        <h1 className="font-display text-3xl font-bold text-brown-800 sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-brown-500 sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
