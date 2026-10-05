import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

// The whole page reads from siteInfo — updating "Website Information" in
// /admin updates this page with no other file to touch.
export default function About() {
  const { siteInfo } = useGaushalaData();

  return (
    <div>
      <PageHeader title="हमारे बारे में" subtitle={siteInfo.name} />
      <div className="container-page py-14">
        <div className="mx-auto max-w-3xl rounded-2xl bg-cream-50 p-8 shadow-soft sm:p-10">
          <p className="whitespace-pre-line text-base leading-relaxed text-brown-600">
            {siteInfo.about}
          </p>
        </div>
      </div>
    </div>
  );
}
