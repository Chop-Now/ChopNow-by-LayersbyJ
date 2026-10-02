import React, { useRef } from 'react';
import SiteHeader from '../Components/landing/SiteHeader';
import {
  Hero,
  Ticker,
  StatBand,
  HowItWorks,
  Vendors,
  AboutUs,
  Milestones,
  Community,
  ClosingCta,
  SectionRail,
} from '../Components/landing/Sections';
import { SECTIONS } from '../Components/landing/sectionList';
import { useActiveSection, useReveal } from '../Components/landing/useLandingMotion';
import Footer from '../Components/Footer';
import SEO from '../Components/SEO';

const SECTION_IDS = SECTIONS.map((s) => s.id);

/*
 * Landing page, LayersbyJ tile revamp. Story order: hero, the problem, how it
 * works, vendors, vision, road ahead, get involved, closing call to action.
 * Numbered sections share one anatomy (see SectionHead) and reveal as they
 * scroll in; the header and the side rail track the current section.
 */
const Home = () => {
  const mainRef = useRef(null);
  useReveal(mainRef);
  const active = useActiveSection(SECTION_IDS);

  return (
    <div className="bg-fufu">
      <SEO
        title="ChopNow - Save Food, Save Money, Save the Planet"
        description="ChopNow connects you with surplus food from local businesses at discounted prices. Reduce food waste and save money in Kigali, Rwanda."
      />
      <SiteHeader active={active} />
      <div ref={mainRef}>
        <Hero />
        <Ticker />
        <StatBand />
        <HowItWorks />
        <Vendors />
        <AboutUs />
        <Milestones />
        <Community />
        <ClosingCta />
      </div>
      <SectionRail active={active} />
      <Footer />
    </div>
  );
};

export default Home;
