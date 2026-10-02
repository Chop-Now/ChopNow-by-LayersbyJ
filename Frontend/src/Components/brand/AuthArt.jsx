import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Kit';
import { Bread, Chilli, Fork, Leaf } from './Illustrations';

/*
 * Left-hand panel for the auth screens (tile revamp). Fills its parent.
 * Four cut-shape tiles on top, a Moringa statement tile below.
 */
const AuthArt = ({
  eyebrow = 'Good food. Less waste.',
  title = ['Rescue', 'good food', 'for less.'],
}) => (
  <div className="h-full w-full grid grid-rows-[1fr_auto] bg-moringa">
    <div className="grid grid-cols-2 grid-rows-2 min-h-0">
      <div className="relative overflow-hidden bg-lime">
        <Fork rotate={-10} className="absolute left-[20%] top-[8%] w-[70%]" />
      </div>
      <div className="relative overflow-hidden bg-yellow">
        <Chilli rotate={-18} className="absolute left-[2%] top-[4%] w-[115%]" />
      </div>
      <div className="relative overflow-hidden bg-peach">
        <Bread className="absolute left-[8%] top-[40%] w-[110%]" />
      </div>
      <div className="relative overflow-hidden bg-pepper">
        <Leaf className="absolute left-[24%] top-[18%] w-[90%]" />
      </div>
    </div>
    <div className="px-10 xl:px-14 py-10 text-fufu">
      <Link to="/" aria-label="ChopNow home">
        <Logo tone="dark" size="md" />
      </Link>
      <p className="eyebrow text-yellow mt-8">{eyebrow}</p>
      <p className="display mt-3 text-[64px] xl:text-[84px]">
        {title.map((t, i) => (
          <span key={t} className={`block ${i === 0 ? 'text-yellow' : ''}`}>
            {t}
          </span>
        ))}
      </p>
    </div>
  </div>
);

export default AuthArt;
