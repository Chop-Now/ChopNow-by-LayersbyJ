import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'ChopNow',
  description = 'Save food, save money, save the planet. ChopNow connects you with surplus food from local businesses at discounted prices.',
  keywords = 'food waste, surplus food, discount food, sustainable, Rwanda, Kigali, food rescue',
  // '/og-image.png' doesn't exist anywhere in the repo - every page not
  // passing its own `image` prop was pointing social/search crawlers at a
  // 404. Using the one real PNG asset available as an honest stopgap (see
  // index.html's matching fix) rather than a broken link.
  image = '/apple-touch-icon.png',
  url,
  type = 'website',
}) => {
  const siteTitle = title === 'ChopNow' ? title : `${title} | ChopNow`;

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="ChopNow" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Mobile */}
      <meta name="theme-color" content="#0F3D2E" />
    </Helmet>
  );
};

export default SEO;
