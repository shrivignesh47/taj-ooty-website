import OffersBanner from "@/components/OffersBanner";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import MenuPreview from "@/components/MenuPreview";
import Testimonials from "@/components/Testimonials";
import Visit from "@/components/Visit";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <OffersBanner />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Gallery />
        <MenuPreview />
        <Testimonials />
        <Visit />
      </main>
      <Footer />
    </>
  );
}
