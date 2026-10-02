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

import { SECTIONS } from './sectionList';

const WRAP = 'mx-auto max-w-[1440px]';

/*
 * Landing page, in reading order. Every numbered section uses the same
 * anatomy (number, label and rule, title, intro, content) so you always know
 * where you are; section grounds alternate fufu / white / moringa so each one
 * reads as a new chapter. SECTIONS drives the header nav and the side rail.
 */

const GROUNDS = {
  fufu: 'bg-fufu text-moringa',
  white: 'bg-white text-moringa',
  moringa: 'bg-moringa text-fufu',
};

/* Section shell: full-width ground, contained content, room to breathe. */
const Section = ({ id, ground = 'fufu', labelledBy, className = '', children }) => (
  <section
    id={id}
    aria-labelledby={labelledBy}
    className={`relative overflow-hidden scroll-mt-16 md:scroll-mt-20 ${GROUNDS[ground]}`}
  >
    <div className={`${WRAP} px-4 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-28 ${className}`}>
      {children}
    </div>
  </section>
);

/* Section header: the same in every section. */
const SectionHead = ({ n, label, title, titleId, intro, aside, dark = false }) => (
  <header className="relative mb-10 lg:mb-14">
    <div className="flex items-center gap-4">
      <span className={`font-mono text-sm font-medium ${dark ? 'text-yellow' : 'text-clay'}`}>
        {n}
      </span>
      <Eyebrow className={dark ? 'text-fufu/80' : 'text-moringa-muted'}>{label}</Eyebrow>
      <span
        data-reveal="rule"
        aria-hidden="true"
        className={`h-px flex-1 origin-left ${dark ? 'bg-moringa-2' : 'bg-hairline'}`}
      />
    </div>
    <div className="mt-6 lg:mt-8 grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-16 items-end">
      <Display
        id={titleId}
        data-reveal
        className={`text-[52px] sm:text-[72px] lg:text-[96px] leading-[0.92] ${dark ? 'text-yellow' : ''}`}
      >
        {title}
      </Display>
      {(intro || aside) && (
        <div data-reveal style={{ '--i': 1 }} className="flex flex-col gap-5 lg:pb-2">
          {intro && (
            <p
              className={`text-lg leading-relaxed font-medium max-w-[46ch] ${
                dark ? 'text-fufu/85' : 'text-moringa-muted'
              }`}
            >
              {intro}
            </p>
          )}
          {aside}
        </div>
      )}
    </div>
  </header>
);

/* ------------------------------------------------------------------ HERO */

export const Hero = () => (
  <section id="home" className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
    <Tile className="col-span-2 lg:row-span-2 bg-moringa text-fufu px-5 sm:px-10 lg:px-14 pt-8 pb-8 lg:pt-12 lg:pb-12 flex flex-col min-h-[560px] lg:min-h-[720px]">
      <div className="flex justify-between gap-4 text-fufu/85 rise-in">
        <Eyebrow>Food rescue marketplace / Kigali</Eyebrow>
        <Eyebrow className="hidden sm:block">Est. 2026</Eyebrow>
      </div>
      <h1 className="display mt-8 lg:mt-10 whitespace-nowrap">
        <span
          className="block text-yellow text-[clamp(104px,15vw,200px)] rise-in"
          style={{ animationDelay: '80ms' }}
        >
          Rescue
        </span>
        <span
          className="block text-fufu text-[clamp(62px,9vw,124px)] rise-in"
          style={{ animationDelay: '200ms' }}
        >
          Good food
        </span>
        <span
          className="block text-pepper text-[clamp(62px,9vw,124px)] rise-in"
          style={{ animationDelay: '320ms' }}
        >
          for less.
        </span>
      </h1>
      <p
        className="mt-7 max-w-[440px] text-base lg:text-lg leading-relaxed font-medium text-fufu/90 rise-in"
        style={{ animationDelay: '440ms' }}
      >
        Restaurants, bakeries, hotels and supermarkets list today&apos;s unsold food. You order at a
        discount, pay with mobile money and pick it up before it goes to waste.
      </p>
      <div
        className="mt-auto pt-8 flex flex-col sm:flex-row gap-3 rise-in"
        style={{ animationDelay: '560ms' }}
      >
        <Button to="/shop" variant="yellow" size="lg">
          Find food near me <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <Button href="#vendors" variant="outline" size="lg" className="text-fufu hover:bg-fufu/10">
          I sell food
        </Button>
      </div>
    </Tile>

    <Tile
      className="group bg-lime aspect-square lg:aspect-auto lg:min-h-[360px] tile-in"
      style={{ animationDelay: '150ms' }}
    >
      <span className="tile-art absolute inset-0">
        <Fork
          fill="var(--color-moringa)"
          detail="var(--color-lime)"
          rotate={-10}
          className="absolute left-[18%] top-[8%] w-[78%]"
        />
      </span>
      <svg viewBox="0 0 360 360" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <path
          d="M22 360C16 250 50 150 132 90"
          stroke="var(--color-moringa)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </Tile>
    <Tile
      className="group bg-yellow aspect-square lg:aspect-auto lg:min-h-[360px] tile-in"
      style={{ animationDelay: '260ms' }}
    >
      <span className="tile-art absolute inset-0">
        <Chilli rotate={-18} className="absolute left-[4%] top-[4%] w-[118%]" />
      </span>
    </Tile>
    <Tile
      className="group bg-peach aspect-square lg:aspect-auto lg:min-h-[360px] tile-in"
      style={{ animationDelay: '370ms' }}
    >
      <span className="tile-art absolute inset-0">
        <Bread className="absolute left-[8%] top-[42%] w-[112%]" />
      </span>
    </Tile>
    <Tile
      className="group bg-pepper aspect-square lg:aspect-auto lg:min-h-[360px] tile-in"
      style={{ animationDelay: '480ms' }}
    >
      <span className="tile-art absolute inset-0">
        <Leaf className="absolute left-[24%] top-[18%] w-[90%]" />
      </span>
      <div className="absolute left-4 top-4 lg:left-6 lg:top-6 w-[104px] h-[104px] lg:w-[132px] lg:h-[132px] rounded-full bg-yellow text-moringa flex items-center justify-center -rotate-12 badge-spin">
        <span className="display text-center text-[19px] lg:text-[24px] leading-[0.95]">
          Now live
          <br />
          in Kigali
        </span>
      </div>
    </Tile>
  </section>
);

/* ---------------------------------------------------------------- TICKER */

const TICKER = [
  'Bread bundles',
  'Lunch plates',
  'Veg boxes',
  'Pastry boxes',
  'Fresh fruit',
  '50 to 70% off',
  'Pay with mobile money',
  'Pick up today',
];

/* A slow marquee that marks the move from the hero into the story. */
export const Ticker = () => (
  <div
    className="bg-yellow text-moringa overflow-hidden border-y-2 border-moringa"
    aria-hidden="true"
  >
    <div className="ticker flex w-max">
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center">
          {TICKER.map((t) => (
            <li key={t} className="flex items-center gap-6 pl-6 h-14 sm:h-16">
              <span className="display text-[26px] sm:text-[32px] whitespace-nowrap">{t}</span>
              <CMark fill="var(--color-moringa)" className="w-5 shrink-0" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------ 01 PROBLEM */

export const StatBand = () => (
  <Section id="problem" ground="fufu" labelledBy="problem-title">
    <SectionHead
      n="01"
      label="The problem"
      title="Too good to bin."
      titleId="problem-title"
      intro="In Kigali it's the fresh bread, meals and produce left unsold at closing. ChopNow gets it to a table instead of a bin."
    />
    <div data-reveal className="grid lg:grid-cols-4 rounded-lg overflow-hidden">
      <Tile className="lg:col-span-3 bg-pepper text-fufu px-5 sm:px-10 lg:px-14 pt-8 h-[220px] sm:h-[280px] lg:h-[340px]">
        <Eyebrow className="text-char">Lost or wasted, worldwide</Eyebrow>
        <p className="display absolute left-3 sm:left-8 lg:left-12 -bottom-[0.1em] text-[clamp(112px,24vw,320px)] whitespace-nowrap">
          A third
        </p>
      </Tile>
      <Tile className="bg-moringa text-fufu px-5 sm:px-10 lg:px-9 py-8 flex flex-col justify-end lg:h-[340px]">
        <p className="text-[26px] lg:text-[30px] leading-[1.12] font-bold">
          of all food produced globally is lost or wasted.
        </p>
      </Tile>
    </div>
  </Section>
);

/* ------------------------------------------------------- 02 HOW IT WORKS */

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

/* Light to dark: the colour deepens as you move through the steps. */
const STEP_TONES = [
  'bg-fufu text-moringa',
  'bg-mint text-moringa',
  'bg-lime text-moringa',
  'bg-moringa text-fufu',
];

export const HowItWorks = () => {
  const [who, setWho] = useState('consumer');
  const [swapped, setSwapped] = useState(false);
  const toggle = (
    <div
      role="tablist"
      aria-label="Show steps for"
      className="grid grid-cols-2 border-2 border-moringa max-w-sm"
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
          onClick={() => {
            setWho(key);
            setSwapped(true);
          }}
          className={`eyebrow h-11 transition-colors cursor-pointer ${
            who === key ? 'bg-moringa text-yellow' : 'text-moringa hover:bg-mint'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
  return (
    <Section id="howItWorks" ground="white" labelledBy="how-title">
      <SectionHead
        n="02"
        label="How it works"
        title="Shelf to plate in four steps."
        titleId="how-title"
        intro={
          who === 'consumer'
            ? 'From spotting a deal to eating it, the whole thing takes minutes.'
            : 'Listing surplus takes less time than throwing it away.'
        }
        aside={toggle}
      />
      <ol key={who} className="grid sm:grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden">
        {STEPS[who].map(([title, text], i) => (
          <li
            key={title}
            data-reveal
            style={{ '--i': i, animationDelay: `${i * 90}ms` }}
            className={`${STEP_TONES[i]} relative px-5 sm:px-8 lg:px-7 pt-6 pb-8 flex flex-col gap-6 min-h-[260px] lg:min-h-[400px] ${
              swapped ? 'is-in rise-in' : ''
            }`}
          >
            {/* progress through the four steps */}
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className={`h-1 flex-1 rounded-full ${
                    b <= i ? (i === 3 ? 'bg-yellow' : 'bg-moringa') : 'bg-current opacity-15'
                  }`}
                />
              ))}
            </span>
            <span
              className={`display text-[104px] lg:text-[128px] leading-[0.82] ${
                i === 3 ? 'text-yellow' : ''
              }`}
            >
              0{i + 1}
            </span>
            <h3 className="text-[22px] leading-[1.15] font-bold">{title}</h3>
            <p className="mt-auto text-base leading-relaxed font-medium opacity-90">{text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
};

/* ---------------------------------------------------------- 03 VENDORS */

const BENEFITS = [
  [
    'Turn unsold food into revenue',
    'Surplus that would be thrown away becomes a new, low-effort sales channel.',
  ],
  [
    'You stay in control',
    'You choose what to list, the discount and how much. Nothing is fixed by ChopNow.',
  ],
  ['Mobile money, built in', 'Orders are paid upfront in the app. No extra POS work on your end.'],
  ['Low barrier to join', 'No new hardware or costly setup. One simple vendor dashboard.'],
  [
    'New customers, not just leftovers',
    'Price-conscious, sustainability-minded people nearby find your business.',
  ],
  ['No delivery to manage', 'Customers collect at a time you agree. You keep the revenue.'],
];

export const Vendors = () => (
  <Section id="vendors" ground="moringa" labelledBy="vendors-title">
    <Fork
      fill="var(--color-moringa-2)"
      detail="var(--color-moringa)"
      rotate={14}
      className="absolute right-[-8%] lg:right-[2%] top-[-6%] w-[180px] lg:w-[300px] pointer-events-none"
    />
    <SectionHead
      dark
      n="03"
      label="For vendors"
      title="Your surplus is revenue."
      titleId="vendors-title"
      intro="First cohort in Kigali, featured as founding partners."
      aside={
        <div>
          <Button to="/signup" variant="yellow" size="lg">
            Become a founding vendor <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      }
    />
    <ul className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-moringa rounded-lg overflow-hidden">
      {BENEFITS.map(([title, text], i) => (
        <li
          key={title}
          data-reveal
          style={{ '--i': i % 3 }}
          className="bg-moringa-2 px-5 sm:px-8 py-8 flex flex-col gap-4 min-h-[220px] lg:min-h-[260px] hover:bg-moringa-dark transition-colors"
        >
          <span className="font-mono text-sm text-yellow">0{i + 1}</span>
          <h3 className="text-[22px] lg:text-[26px] leading-[1.15] font-bold">{title}</h3>
          <p className="mt-auto text-base leading-relaxed text-fufu/80">{text}</p>
        </li>
      ))}
    </ul>
  </Section>
);

/* ----------------------------------------------------------- 04 VISION */

const VALUES = [
  ['Our mission', 'Turn food surplus into community support across Africa.', 'bg-yellow'],
  ['Community first', 'Connect vendors, customers and NGOs for the most impact.', 'bg-mint'],
  ['Sustainability', 'Cut food waste while fighting hunger and protecting the planet.', 'bg-lime'],
  [
    'Innovation',
    'Real-time technology that moves surplus food to the people who need it.',
    'bg-peach',
  ],
];

export const AboutUs = () => (
  <Section id="AboutUs" ground="fufu" labelledBy="about-title">
    <TomatoHalf className="absolute right-[-8%] top-[-6%] w-[220px] lg:w-[340px] opacity-95 hidden sm:block pointer-events-none" />
    <SectionHead
      n="04"
      label="Our vision"
      title="A hunger-free Africa where no food goes to waste."
      titleId="about-title"
      intro="Build a circular food economy across African cities, one rescued meal at a time."
    />
    <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {VALUES.map(([t, d, swatch], i) => (
        <li
          key={t}
          data-reveal
          style={{ '--i': i }}
          className="bg-white border border-char/10 p-6 flex flex-col gap-6 min-h-[220px]"
        >
          <span className={`w-10 h-10 rounded-md ${swatch}`} aria-hidden="true" />
          <div className="mt-auto">
            <Eyebrow className="text-clay">{t}</Eyebrow>
            <p className="mt-2 text-[20px] leading-[1.25] font-bold">{d}</p>
          </div>
        </li>
      ))}
    </ul>
  </Section>
);

/* --------------------------------------------------------- 05 MILESTONES */

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
        className="absolute right-[-2%] bottom-[-34%] w-[22%] lg:w-[24%]"
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
        className="absolute right-[-10%] bottom-[-20%] w-[40%] lg:w-[46%]"
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
        className="absolute right-[-8%] bottom-[-18%] w-[38%] lg:w-[44%]"
      />
    ),
  },
];

export const Milestones = () => (
  <Section id="Milestones" ground="white" labelledBy="milestones-title">
    <SectionHead
      n="05"
      label="Road ahead"
      title="Milestones."
      titleId="milestones-title"
      intro="Targets, not results. We will update these as we hit them."
    />
    <ol className="relative grid lg:grid-cols-3 gap-10 lg:gap-6 pl-8 lg:pl-0">
      {/* the timeline: vertical on phones, horizontal on desktop */}
      <span
        data-reveal="rule"
        aria-hidden="true"
        className="absolute left-[7px] top-2 bottom-2 w-0.5 lg:hidden bg-moringa origin-top"
      />
      <span
        data-reveal="rule"
        aria-hidden="true"
        className="hidden lg:block absolute left-0 right-0 top-[7px] h-0.5 bg-moringa origin-left"
      />
      {MILESTONES.map((m, i) => (
        <li key={m.title} data-reveal style={{ '--i': i + 1 }} className="relative">
          <div className="relative flex items-center gap-3 mb-5 w-max bg-white pr-3">
            <span
              className="absolute -left-8 lg:static w-4 h-4 rounded-full bg-moringa ring-4 ring-white shrink-0"
              aria-hidden="true"
            />
            <Eyebrow className="text-moringa">{m.when}</Eyebrow>
          </div>
          <div
            className={`group ${m.tone} relative overflow-hidden rounded-lg px-6 sm:px-8 pt-8 pb-36 lg:pb-32 min-h-[300px] flex flex-col gap-4`}
          >
            <span className="tile-art absolute inset-0 pointer-events-none">{m.art}</span>
            <h3 className="relative text-[26px] lg:text-[28px] leading-[1.1] font-bold max-w-[14ch]">
              {m.title}
            </h3>
            <p className="relative text-base leading-relaxed font-medium max-w-[34ch] opacity-90">
              {m.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </Section>
);

/* ------------------------------------------------- 06 AMBASSADORS + APP */

const MockCard = ({ tone, label, meta, Art }) => (
  <div className="bg-white p-2.5 flex gap-3 items-center rounded-md">
    <div className={`w-12 h-12 shrink-0 relative overflow-hidden rounded-sm ${tone}`}>{Art}</div>
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-moringa truncate">{label}</p>
      <p className="text-[11px] text-moringa-muted truncate">{meta}</p>
    </div>
  </div>
);

export const Community = () => (
  <Section id="community" ground="fufu" labelledBy="community-title">
    <SectionHead
      n="06"
      label="Get involved"
      title="Join the rescue."
      titleId="community-title"
      intro="Spread the word in your neighbourhood, or start rescuing food from your phone today."
    />
    <div data-reveal className="grid sm:grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden">
      <Tile className="sm:col-span-2 bg-pepper text-fufu px-5 sm:px-10 lg:px-12 py-8 flex flex-col min-h-[460px] lg:min-h-[520px]">
        <Pin
          fill="var(--color-clay)"
          hole="var(--color-pepper)"
          className="absolute right-[-6%] bottom-[-16%] w-[38%] sm:w-[24%]"
        />
        <Eyebrow className="relative text-char">Community ambassadors</Eyebrow>
        <Display as="h3" className="relative mt-6 text-[56px] sm:text-[88px] lg:text-[104px]">
          Be an
          <br />
          ambassador.
        </Display>
        <p className="relative mt-6 max-w-[440px] text-base lg:text-lg leading-relaxed font-medium">
          Know the kitchens on your street? Introduce vendors and neighbours to ChopNow and help
          build Kigali&apos;s founding network.
        </p>
        <div className="relative mt-auto pt-8">
          <Button to="/contact-us" variant="light" size="lg" className="text-clay">
            Talk to the team <ArrowUpRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </Tile>
      <Tile className="bg-lime text-moringa px-5 sm:px-8 py-8 flex flex-col min-h-[420px] lg:min-h-[520px]">
        <Eyebrow>The app</Eyebrow>
        <Display as="h3" className="mt-6 text-[64px] lg:text-[80px]">
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
            <span className="eyebrow h-11 border-2 border-moringa rounded-md flex items-center justify-center">
              App Store soon
            </span>
            <span className="eyebrow h-11 border-2 border-moringa rounded-md flex items-center justify-center">
              Google Play soon
            </span>
          </div>
        </div>
      </Tile>
      <Tile className="bg-moringa min-h-[420px] lg:min-h-[520px]" aria-hidden="true">
        <div className="phone-float absolute left-1/2 -translate-x-1/2 top-12 w-[252px] h-[540px] bg-char rounded-[40px] p-2.5">
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
            <div className="mt-auto bg-moringa text-yellow text-center py-3 rounded-md text-[13px] font-bold">
              Reserve
            </div>
          </div>
        </div>
      </Tile>
    </div>
  </Section>
);

/* --------------------------------------------------------------- CTA */

export const ClosingCta = () => (
  <section aria-labelledby="cta-title" className="bg-moringa">
    <div className={`${WRAP} grid lg:grid-cols-4`}>
      <Tile className="lg:col-span-3 bg-moringa text-fufu px-5 sm:px-10 lg:px-14 py-14 lg:py-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 min-h-[320px] lg:min-h-[400px]">
        <div data-reveal>
          <Eyebrow className="text-yellow">Get started</Eyebrow>
          <Display id="cta-title" className="mt-6 text-[64px] sm:text-[96px] lg:text-[128px]">
            Hungry?
            <br />
            <span className="text-yellow">Rescue lunch.</span>
          </Display>
        </div>
        <div data-reveal style={{ '--i': 1 }} className="flex flex-col gap-3 lg:w-[300px]">
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
        className="group relative overflow-hidden bg-yellow text-moringa px-5 sm:px-10 lg:px-8 py-8 flex flex-col justify-between min-h-[220px] lg:min-h-[400px]"
      >
        <Fork
          rotate={24}
          className="absolute right-[-8%] bottom-[-44%] w-[26%] sm:w-[20%] lg:w-[40%] transition-transform duration-300 group-hover:-translate-y-3"
        />
        <Eyebrow>Visit</Eyebrow>
        <span className="display relative text-[52px] lg:text-[60px]">chopnow.app</span>
      </Link>
    </div>
  </section>
);

/* ------------------------------------------------------------ SIDE RAIL */

/* Desktop wayfinding: one dot per section, the current one labelled. */
export const SectionRail = ({ active }) => (
  <nav
    aria-label="Page sections"
    className={`hidden xl:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-3 transition-opacity duration-300 ${
      active ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
  >
    {SECTIONS.map((s) => {
      const on = s.id === active;
      return (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={on ? 'true' : undefined}
          className="group flex items-center gap-3"
        >
          <span
            className={`eyebrow text-[10px] rounded-sm px-2 py-1 bg-char text-fufu transition-all duration-300 ${'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100'}`}
          >
            {s.n} {s.label}
          </span>
          <span
            className={`block rounded-full ring-2 ring-fufu transition-all duration-300 ${
              on ? 'w-3 h-3 bg-pepper' : 'w-2 h-2 bg-char/40 group-hover:bg-char'
            }`}
          />
        </a>
      );
    })}
  </nav>
);
