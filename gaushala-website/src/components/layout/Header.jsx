import TopBar from "./TopBar.jsx";
import Navbar from "./Navbar.jsx";

// TopBar scrolls away naturally with the page; Navbar is the sticky element,
// so the header never eats more vertical space than the navbar alone.
export default function Header() {
  return (
    <>
      <TopBar />
      <Navbar />
    </>
  );
}
