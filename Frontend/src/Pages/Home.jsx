import React from 'react';
import SiteHeader from '../Components/landing/SiteHeader';
import {
  Hero,
  StatBand,
  HowItWorks,
  Vendors,
  Milestones,
  AboutUs,
  Community,
  ClosingCta,
} from '../Components/landing/Sections';
import Footer from '../Components/Footer';
import SEO from '../Components/SEO';

/*
 * Landing page, LayersbyJ tile revamp. Every section is a row of flat colour
 * tiles on a 4-column grid (1440 max), collapsing to 2 and 1 columns.
 * The old sections (Header, Hero, HowItWorks, Milestones, AboutUs, Apps) are
 * kept in Components/ for reference but are no longer mounted here.
 */
const Home = () => (
  <div className="bg-fufu">
    <SEO
      title="ChopNow - Save Food, Save Money, Save the Planet"
      description="ChopNow connects you with surplus food from local businesses at discounted prices. Reduce food waste and save money in Kigali, Rwanda."
    />
    <SiteHeader />
    <div>
      <Hero />
      <StatBand />
      <HowItWorks />
      <Vendors />
      <Milestones />
      <AboutUs />
      <Community />
      <ClosingCta />
    </div>
    <Footer />
  </div>
);

export default Home;
