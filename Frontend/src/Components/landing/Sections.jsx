import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button, Display, Eyebrow, Tile } from '../brand/Kit';
import {
  Bag,
  Bread,
  Chilli,
  CMark,
  Coin,
  Fork,
  Leaf,
  Pin,
  Spoon,
  TomatoHalf,
} from '../brand/Illustrations';

const WRAP = 'mx-auto max-w-[1440px]';

/* ------------------------------------------------------------------ HERO */

export const Hero = () => (
  <section id="home" className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
    <Tile className="col-span-2 lg:row-span-2 bg-moringa text-fufu px-5 sm:px-10 lg:px-14 pt-8 pb-8 lg:pt-12 lg:pb-12 flex flex-col min-h-[560px] lg:min-h-[720px]">
      <div className="flex justify-between gap-4 text-fufu/85">
        <Eyebrow>Food rescue marketplace / Kigali</Eyebrow>
        <Eyebrow className="hidden sm:block">Est. 2026</Eyebrow>
      </div>
      <h1 className="display mt-8 lg:mt-10 whitespace-nowrap">
        <span className="block text-yellow text-[clamp(104px,15vw,200px)]">Rescue</span>
        <span className="block text-fufu text-[clamp(62px,9vw,124px)]">Good food</span>
        <span className="block text-pepper text-[clamp(62px,9vw,124px)]">for less.</span>
      </h1>
      <p className="mt-7 max-w-[440px] text-base lg:text-lg leading-relaxed font-medium text-fufu/90">
        Restaurants, bakeries, hotels and supermarkets list today&apos;s unsold food. You order at a
        discount, pay with mobile money and pick it up before it goes to waste.
      </p>
      <div className="mt-auto pt-8 flex flex-col sm:flex-row gap-3">
        <Button to="/shop" variant="yellow" size="lg">
          Find food near me <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <Button href="#vendors" variant="outline" size="lg" className="text-fufu hover:bg-fufu/10">
          I sell food
        </Button>
      </div>
    </Tile>

    <Tile className="bg-lime aspect-square lg:aspect-auto lg:min-h-[360px]">
      <Fork
        fill="var(--color-moringa)"
        detail="var(--color-lime)"
        rotate={-10}
        className="absolute left-[18%] top-[8%] w-[78%]"
      />
      <svg viewBox="0 0 360 360" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <path
          d="M22 360C16 250 50 150 132 90"
          stroke="var(--color-moringa)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </Tile>
    <Tile className="bg-yellow aspect-square lg:aspect-auto lg:min-h-[360px]">
      <Chilli rotate={-18} className="absolute left-[4%] top-[4%] w-[118%]" />
    </Tile>
    <Tile className="bg-peach aspect-square lg:aspect-auto lg:min-h-[360px]">
      <Bread className="absolute left-[8%] top-[42%] w-[112%]" />
    </Tile>
    <Tile className="bg-pepper aspect-square lg:aspect-auto lg:min-h-[360px]">
      <Leaf className="absolute left-[24%] top-[18%] w-[90%]" />
      <div className="absolute left-4 top-4 lg:left-6 lg:top-6 w-[104px] h-[104px] lg:w-[132px] lg:h-[132px] rounded-full bg-yellow text-moringa flex items-center justify-center -rotate-12">
        <span className="display text-center text-[19px] lg:text-[24px] leading-[0.95]">
          Now live
          <br />
          in Kigali
        </span>
      </div>
    </Tile>
  </section>
);

/* ------------------------------------------------------------- STAT BAND */

export const StatBand = () => (
  <section aria-labelledby="stat-title" className={`${WRAP} grid lg:grid-cols-4`}>
    <Tile className="lg:col-span-3 bg-pepper text-fufu px-5 sm:px-10 lg:px-14 pt-8 h-[240px] sm:h-[300px] lg:h-[360px]">
      <Eyebrow className="text-char">The problem</Eyebrow>
      <p
        id="stat-title"
        className="display absolute left-3 sm:left-8 lg:left-12 -bottom-[0.1em] text-[clamp(112px,26vw,340px)] whitespace-nowrap"
      >
        A third
      </p>
    </Tile>
    <Tile className="bg-fufu px-5 sm:px-10 lg:px-9 py-8 flex flex-col justify-between gap-6 lg:h-[360px]">
      <p className="text-[26px] lg:text-[30px] leading-[1.12] font-bold text-moringa">
        of all food produced globally is lost or wasted.
      </p>
      <p className="text-base leading-relaxed font-medium text-moringa-muted">
        In Kigali it&apos;s the fresh bread, meals and produce left unsold at closing. ChopNow gets
        it to a table instead of a bin.
      </p>
    </Tile>
  </section>
);

/* ---------------------------------------------------------- HOW IT WORKS */

const STEPS = {
  consumer: [
    [
      'Browse meals',
      'Find surplus meals from restaurants, markets and bakeries near you, at a discount.',
    ],
    [
      'Place your order',
      'Choose your meals and a pickup time, then pay securely with mobile money.',
    ],
    ['Pick it up', 'Head to the vendor at your time, show your order and collect your food.'],
    ['Enjoy and rate', 'Eat well for less, rate the meal and see the waste you helped prevent.'],
  ],
  vendor: [
    [
      'List your surplus',
      'Post surplus food with photos, a price and pickup times. You set the quantity.',
    ],
    ['Get matched', 'Nearby customers and NGOs find your listing and order instantly.'],
    ['Hand it over', 'Prepare the order and hand it over at the agreed time. No delivery needed.'],
    ['Earn and track', 'Get paid through mobile money and track the food you kept out of the bin.'],
  ],
};

const STEP_TONES = [
  'bg-fufu text-moringa',
  'bg-peach text-clay',
  'bg-moringa text-fufu',
  'bg-mint text-moringa',
];

export const HowItWorks = () => {
  const [who, setWho] = useState('consumer');
  return (
    <section
      id="howItWorks"
      aria-labelledby="how-title"
      className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-5`}
    >
      <Tile className="sm:col-span-2 lg:col-span-1 bg-yellow text-moringa px-5 sm:px-10 lg:px-8 py-8 flex flex-col justify-between gap-8 lg:min-h-[480px]">
        <Display id="how-title" className="text-[76px] sm:text-[92px] lg:text-[80px]">
          How it
          <br />
          works
        </Display>
        <div
          role="tablist"
          aria-label="Show steps for"
          className="grid grid-cols-2 border-2 border-moringa"
        >
          {[
            ['consumer', 'Customers'],
            ['vendor', 'Vendors'],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={who === key}
              onClick={() => setWho(key)}
              className={`eyebrow h-11 transition-colors ${
                who === key ? 'bg-moringa text-yellow' : 'text-moringa hover:bg-moringa/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Tile>
      {STEPS[who].map(([title, text], i) => (
        <Tile
          key={title}
          className={`${STEP_TONES[i]} px-5 sm:px-8 lg:px-7 py-8 flex flex-col gap-6 min-h-[260px] lg:min-h-[480px] ${
            i === 0 ? 'lg:border-l lg:border-hairline' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`display text-[120px] lg:text-[136px] leading-[0.82] ${
                i === 2 ? 'text-yellow' : ''
              }`}
            >
              0{i + 1}
            </span>
            <span className="pt-1 text-[22px] leading-[1.15] font-bold max-w-[9ch]">{title}</span>
          </div>
          <p className="mt-auto text-base leading-relaxed font-medium opacity-90">{text}</p>
        </Tile>
      ))}
    </section>
  );
};

/* --------------------------------------------------------------- VENDORS */

const BENEFITS = [
  [
    'Turn unsold food into revenue',
    'Surplus that would be thrown away becomes a new, low-effort sales channel.',
    'bg-fufu text-moringa',
  ],
  [
    'You stay in control',
    'You choose what to list, the discount and how much. Nothing is fixed by ChopNow.',
    'bg-lime text-moringa',
  ],
  [
    'Mobile money, built in',
    'Orders are paid upfront in the app. No extra POS work on your end.',
    'bg-peach text-clay',
  ],
  [
    'Low barrier to join',
    'No new hardware or costly setup. One simple vendor dashboard.',
    'bg-yellow text-moringa',
  ],
  [
    'New customers, not just leftovers',
    'Price-conscious, sustainability-minded people nearby find your business.',
    'bg-mint text-moringa',
  ],
  [
    'No delivery to manage',
    'Customers collect at a time you agree. You keep the revenue.',
    'bg-fufu text-moringa',
  ],
];

export const Vendors = () => (
  <section
    id="vendors"
    aria-labelledby="vendors-title"
    className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-4`}
  >
    <Tile className="sm:col-span-2 lg:col-span-1 lg:row-span-2 bg-moringa text-fufu px-5 sm:px-10 lg:px-8 py-8 flex flex-col min-h-[440px]">
      <Fork
        fill="var(--color-moringa-2)"
        detail="var(--color-moringa)"
        rotate={14}
        className="absolute right-[-12%] lg:left-[16%] top-[30%] lg:top-[34%] w-[62%] lg:w-[94%]"
      />
      <Eyebrow className="relative">For vendors</Eyebrow>
      <Display
        id="vendors-title"
        className="relative mt-6 text-yellow text-[76px] sm:text-[92px] lg:text-[80px]"
      >
        Your
        <br />
        surplus
        <br />
        is
        <br />
        revenue.
      </Display>
      <div className="relative mt-auto pt-8 flex flex-col gap-3">
        <Button to="/signup" variant="yellow" size="lg">
          Become a founding vendor
        </Button>
        <p className="text-sm text-fufu/80">
          First cohort in Kigali, featured as founding partners.
        </p>
      </div>
    </Tile>
    {BENEFITS.map(([title, text, tone], i) => (
      <Tile
        key={title}
        className={`${tone} px-5 sm:px-8 py-8 flex flex-col gap-5 min-h-[240px] lg:min-h-[360px]`}
      >
        <Eyebrow>0{i + 1}</Eyebrow>
        <h3 className="text-[24px] lg:text-[28px] leading-[1.12] font-bold">{title}</h3>
        <p className="mt-auto text-base leading-relaxed font-medium opacity-90">{text}</p>
      </Tile>
    ))}
  </section>
);

/* ------------------------------------------------------------ MILESTONES */

const MILESTONES = [
  {
    when: 'Late 2026',
    title: 'Kigali pilot with 25 food heroes',
    text: 'Onboard supermarkets, restaurants, bakers and farmers, and run the first surplus drops with real-time rescue insights.',
    tone: 'bg-lime text-moringa',
    art: (
      <Pin
        fill="var(--color-moringa)"
        hole="var(--color-lime)"
        className="absolute right-[-6%] bottom-[-34%] w-[30%] sm:w-[22%] lg:w-[36%] lg:bottom-[-30%]"
      />
    ),
  },
  {
    when: 'Mid 2027',
    title: 'Nairobi and Accra waitlists',
    text: 'Turn Kigali learnings into regional playbooks, work with pan-African couriers and grow city waitlists ahead of launch.',
    tone: 'bg-peach text-clay',
    art: (
      <Coin
        fill="var(--color-clay)"
        ring="var(--color-peach)"
        className="absolute right-[-12%] bottom-[-22%] w-[40%] sm:w-[30%] lg:w-[50%]"
      />
    ),
  },
  {
    when: 'Late 2027',
    title: '150k meals rescued in 4 cities',
    text: 'Community pickup hubs and redistribution partners get rescued meals to schools, shelters and families.',
    tone: 'bg-yellow text-moringa',
    art: (
      <Bag
        fill="var(--color-moringa)"
        detail="var(--color-yellow)"
        mark="var(--color-yellow)"
        className="absolute right-[-8%] bottom-[-18%] w-[38%] sm:w-[28%] lg:w-[48%]"
      />
    ),
  },
];

export const Milestones = () => (
  <section
    id="Milestones"
    aria-labelledby="milestones-title"
    className={`${WRAP} grid lg:grid-cols-4`}
  >
    <Tile className="bg-fufu text-moringa px-5 sm:px-10 lg:px-8 py-8 flex flex-col justify-between gap-6 lg:min-h-[440px] lg:border-r lg:border-hairline">
      <Eyebrow>The road ahead</Eyebrow>
      <Display id="milestones-title" className="text-[76px] sm:text-[92px] lg:text-[96px]">
        Mile
        <br />
        stones
      </Display>
      <p className="text-sm font-medium text-moringa-muted">
        Targets, not results. We will update these as we hit them.
      </p>
    </Tile>
    {MILESTONES.map((m) => (
      <Tile
        key={m.title}
        className={`${m.tone} px-5 sm:px-8 pt-8 pb-36 lg:pb-8 flex flex-col gap-5 min-h-[320px] lg:min-h-[440px]`}
      >
        <Eyebrow className="inline-flex self-start border-2 border-current px-3 py-1.5">
          {m.when}
        </Eyebrow>
        <h3 className="text-[26px] lg:text-[30px] leading-[1.1] font-bold max-w-[14ch]">
          {m.title}
        </h3>
        <p className="relative z-10 text-base leading-relaxed font-medium max-w-[34ch] opacity-90">
          {m.text}
        </p>
        {m.art}
      </Tile>
    ))}
  </section>
);

/* ------------------------------------------------------------- ABOUT US */

const VALUES = [
  ['Our mission', 'Turn food surplus into community support across Africa.'],
  ['Community first', 'Connect vendors, customers and NGOs for the most impact.'],
  ['Sustainability', 'Cut food waste while fighting hunger and protecting the planet.'],
  ['Innovation', 'Real-time technology that moves surplus food to the people who need it.'],
  ['Our impact', 'Build a circular food economy across African cities.'],
];

export const AboutUs = () => (
  <section
    id="AboutUs"
    aria-labelledby="about-title"
    className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-4`}
  >
    <Tile className="sm:col-span-2 bg-pepper text-fufu px-5 sm:px-10 lg:px-14 py-8 flex flex-col justify-between gap-10 min-h-[420px] lg:min-h-[540px]">
      <Eyebrow className="text-char">Our vision</Eyebrow>
      <Display id="about-title" className="text-[56px] sm:text-[80px] lg:text-[92px]">
        A hunger-free Africa where no food goes to waste.
      </Display>
      <TomatoHalf className="absolute right-[-10%] top-[-18%] w-[34%] opacity-95 hidden sm:block" />
    </Tile>
    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2">
      {VALUES.slice(0, 4).map(([t, d], i) => (
        <Tile
          key={t}
          className={`${['bg-fufu', 'bg-mint', 'bg-lime', 'bg-fufu'][i]} text-moringa px-5 sm:px-8 py-8 flex flex-col gap-4 min-h-[220px] lg:min-h-[270px] border-hairline ${
            i === 0 || i === 3 ? 'sm:border-l' : ''
          } ${i === 3 ? 'border-t' : ''}`}
        >
          <Eyebrow>{t}</Eyebrow>
          <p className="mt-auto text-[22px] leading-[1.2] font-bold">{d}</p>
        </Tile>
      ))}
    </div>
  </section>
);

/* ---------------------------------------------------- AMBASSADORS + APP */

const MockCard = ({ tone, label, meta, Art }) => (
  <div className="bg-white p-2.5 flex gap-3 items-center">
    <div className={`w-12 h-12 shrink-0 relative overflow-hidden ${tone}`}>{Art}</div>
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-moringa truncate">{label}</p>
      <p className="text-[11px] text-moringa-muted truncate">{meta}</p>
    </div>
  </div>
);

export const Community = () => (
  <section
    aria-label="Ambassadors and the app"
    className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-4`}
  >
    <Tile className="sm:col-span-2 bg-pepper text-fufu px-5 sm:px-10 lg:px-14 py-8 flex flex-col min-h-[460px] lg:min-h-[540px]">
      <Pin
        fill="var(--color-clay)"
        hole="var(--color-pepper)"
        className="absolute right-[-6%] bottom-[-16%] w-[38%] sm:w-[24%]"
      />
      <Eyebrow className="relative text-char">Community ambassadors</Eyebrow>
      <Display className="relative mt-6 text-[56px] sm:text-[96px] lg:text-[124px]">
        Be an
        <br />
        ambassador.
      </Display>
      <p className="relative mt-6 max-w-[440px] text-base lg:text-lg leading-relaxed font-medium">
        Know the kitchens on your street? Introduce vendors and neighbours to ChopNow and help build
        Kigali&apos;s founding network.
      </p>
      <div className="relative mt-auto pt-8">
        <Button to="/contact-us" variant="light" size="lg" className="text-clay">
          Talk to the team <ArrowUpRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </Tile>
    <Tile className="bg-lime text-moringa px-5 sm:px-8 py-8 flex flex-col min-h-[420px] lg:min-h-[540px]">
      <Eyebrow>The app</Eyebrow>
      <Display className="mt-6 text-[64px] lg:text-[84px]">
        On every
        <br />
        phone.
      </Display>
      <p className="mt-5 text-base leading-relaxed font-medium">
        Use ChopNow on the web today. iOS and Android apps are on the way.
      </p>
      <div className="mt-auto pt-8 flex flex-col gap-2">
        <Button to="/shop" variant="primary">
          Open the web app <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <span className="eyebrow h-11 border-2 border-moringa flex items-center justify-center">
            App Store soon
          </span>
          <span className="eyebrow h-11 border-2 border-moringa flex items-center justify-center">
            Google Play soon
          </span>
        </div>
      </div>
    </Tile>
    <Tile className="bg-moringa min-h-[420px] lg:min-h-[540px]" aria-hidden="true">
      <div className="absolute left-1/2 -translate-x-1/2 lg:left-14 lg:translate-x-0 top-12 w-[252px] h-[540px] bg-char rounded-[40px] p-2.5">
        <div className="w-full h-full bg-fufu rounded-[30px] px-3.5 pt-10 pb-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <CMark fill="var(--color-moringa)" className="w-5" />
            <p className="text-[14px] font-bold text-moringa">Rescue near you</p>
          </div>
          <MockCard
            tone="bg-peach"
            label="Bread bundle"
            meta="Bakery · pickup this evening"
            Art={<Bread className="absolute left-[6%] top-[38%] w-[120%]" />}
          />
          <MockCard
            tone="bg-yellow"
            label="Lunch plates"
            meta="Restaurant · pickup at 3pm"
            Art={
              <Spoon
                fill="var(--color-moringa)"
                rotate={-30}
                className="absolute left-[24%] top-[-10%] w-[60%]"
              />
            }
          />
          <MockCard
            tone="bg-lime"
            label="Veg box"
            meta="Grocer · pickup at 5pm"
            Art={
              <Leaf
                fill="var(--color-moringa)"
                detail="var(--color-lime)"
                className="absolute left-[20%] top-[20%] w-[90%]"
              />
            }
          />
          <div className="mt-auto bg-moringa text-yellow text-center py-3 text-[13px] font-bold">
            Reserve
          </div>
        </div>
      </div>
    </Tile>
  </section>
);

/* --------------------------------------------------------------- CTA */

export const ClosingCta = () => (
  <section aria-labelledby="cta-title" className={`${WRAP} grid lg:grid-cols-4`}>
    <Tile className="lg:col-span-3 bg-moringa text-fufu px-5 sm:px-10 lg:px-14 py-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 min-h-[320px] lg:min-h-[360px] border-t border-moringa-2">
      <div>
        <Eyebrow className="text-yellow">Get started</Eyebrow>
        <Display id="cta-title" className="mt-6 text-[64px] sm:text-[96px] lg:text-[128px]">
          Hungry?
          <br />
          <span className="text-yellow">Rescue lunch.</span>
        </Display>
      </div>
      <div className="flex flex-col gap-3 lg:w-[300px]">
        <Button to="/shop" variant="yellow" size="lg">
          Browse food near you
        </Button>
        <Button to="/signup" variant="outline" size="lg" className="text-fufu hover:bg-fufu/10">
          Create an account
        </Button>
      </div>
    </Tile>
    <Link
      to="/shop"
      className="group relative overflow-hidden bg-yellow text-moringa px-5 sm:px-10 lg:px-8 py-8 flex flex-col justify-between min-h-[220px] lg:min-h-[360px]"
    >
      <Fork
        rotate={24}
        className="absolute right-[-8%] bottom-[-44%] w-[26%] sm:w-[20%] lg:w-[40%] transition-transform duration-300 group-hover:-translate-y-3"
      />
      <Eyebrow>Visit</Eyebrow>
      <span className="display relative text-[52px] lg:text-[60px]">chopnow.app</span>
    </Link>
  </section>
);
