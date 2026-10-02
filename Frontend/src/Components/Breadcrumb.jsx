import React from 'react';
import { Link } from 'react-router-dom';

/* Mono breadcrumb trail (tile revamp). Inherits colour from its band. */
const Breadcrumb = ({ category }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-2 eyebrow opacity-90">
      <li>
        <Link to="/" className="hover:underline underline-offset-4">
          Home
        </Link>
      </li>
      <li aria-hidden="true">/</li>
      <li>
        <Link to="/shop" className="hover:underline underline-offset-4">
          Shop
        </Link>
      </li>
      <li aria-hidden="true">/</li>
      <li aria-current="page" className="text-yellow">
        {category}
      </li>
    </ol>
  </nav>
);

export default Breadcrumb;
