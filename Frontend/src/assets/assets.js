import ChopNowLogo from './ChopNowLogo.svg';
import bg from './bg.png';
import pointing from './pointing.png';
import fresh_produce from './fresh_produce.png';
import login_bg from './login_bg.png';
import google from './google.svg';
import bakery_image from './bakery_image.png';
import dairy_product_image from './dairy_product_image.png';
import drinks from './drinks.png';
import fresh_fruits_image from './fresh_fruits_image.png';
import grain_image from './grain_image.png';
import maggi_image from './maggi_image.png';
import organic_vegitable_image from './organic_vegitable_image.png';
import potato_image_1 from './potato_image_1.png';
import potato_image_2 from './potato_image_2.png';
import potato_image_3 from './potato_image_3.png';
import potato_image_4 from './potato_image_4.png';
import cheese from './cheese.jpg';
import chicken_salad from './chicken_salad.jpg';
import cucumber from './cucumber.jpg';
import fresh_tomatoes from './fresh_tomatoes.jpg';
import lemonade from './lemonade.jpg';
import mango from './mango.jpg';
import noodle from './noodle.JPG';
import pastry_box from './pastry_box.jpg';
import plain_yoghurt from './plain_yoghurt.png';
import sandwich from './sandwich.jpg';
import oops from './oops.png';
import airtel_money from './airtel_money.png';
import bank from './bank.png';
import mastercard from './mastercard.png';
import momo from './momo.png';
import visa from './visa.png';
import lost from './lost.svg';
import mission from './mission.jpeg';
import vision from './vision.jpeg';
import community from './community.jpeg';
import sustainability from './sustainability.jpeg';
import innovation from './innovation.jpg';
import impact from './impact.jpg';
import kigali from './kigali.jpg';
import altwordmark from './altwordmark.svg';
import logomarkgreen from './logomarkgreen.svg';
import logomarkyellow from './logomarkyellow.svg';
import wordmarkalone from './wordmarkalone.svg';
import wordmarkwithlogomark from './wordmarkwithlogomark.svg';
import wordmarklogo from './wordmarklogo.svg';

export const assets = {
  ChopNowLogo,
  bg,
  pointing,
  fresh_produce,
  login_bg,
  google,
  oops,
  airtel_money,
  bank,
  mastercard,
  momo,
  visa,
  lost,
  mission,
  vision,
  community,
  sustainability,
  innovation,
  impact,
  kigali,
  altwordmark,
  logomarkgreen,
  logomarkyellow,
  wordmarkalone,
  wordmarkwithlogomark,
  wordmarklogo,
};

export const categories = [
  {
    text: 'Organic Veggies',
    path: 'Vegetables',
    image: organic_vegitable_image,
    bgColor: '#FEF6DA',
  },
  {
    text: 'Fresh Fruits',
    path: 'Fruits',
    image: fresh_fruits_image,
    bgColor: '#FEE0E0',
  },
  {
    text: 'Drinks',
    path: 'Drinks',
    image: drinks,
    bgColor: '#F0F5DE',
  },
  {
    text: 'Instant Food',
    path: 'Instant',
    image: maggi_image,
    bgColor: '#E1F5EC',
  },
  {
    text: 'Dairy Products',
    path: 'Dairy',
    image: dairy_product_image,
    bgColor: '#FEE6CD',
  },
  {
    text: 'Bakery & Breads',
    path: 'Bakery',
    image: bakery_image,
    bgColor: '#E0F6FE',
  },
  {
    text: 'Grains & Cereals',
    path: 'Grains',
    image: grain_image,
    bgColor: '#F1E3F9',
  },
];

export const dummyProducts = [
  // Vegetables
  {
    _id: '1',
    name: 'Potato 500g',
    category: 'Vegetables',
    vendor: 'Fresh Farm',
    rating: 4.5,
    quantity: 5,
    location: { Near: 'True' },
    pickupTime: '4PM - 6PM Today',
    price: 2500,
    offerPrice: 1500,
    image: [potato_image_1, potato_image_2, potato_image_3, potato_image_4],
    description: ['Fresh and organic', 'Rich in carbohydrates', 'Ideal for curries and fries'],
    createdAt: '2025-03-25T07:17:46.018Z',
    updatedAt: '2025-03-25T07:18:13.103Z',
    inStock: true,
  },
  {
    _id: '2',
    name: 'Sandwich Bread',
    category: 'Bakery',
    vendor: 'The Corner Cafe',
    rating: 4.7,
    dietary_information: ['Vegetarian', 'Dairy Free'],
    ingredients_allergens: [
      {
        ingredient: 'Wheat Flour, water sea salt',
      },
      {
        contains: 'Wheat. May Contain traces of nuts and soy',
      },
    ],
    quantity: 3,
    location: { Near: 'True' },
    pickupTime: '2PM - 4PM Today',
    price: 1200,
    offerPrice: 800,
    image: [sandwich],
    description: [
      'Soft and fresh',
      'The perfect sandwich bread for you, it is prepared with the utmost care to suit your taste buds.',
      'Baked daily',
    ],
    createdAt: '2025-03-26T10:12:30.000Z',
    updatedAt: '2025-03-26T10:15:45.000Z',
    inStock: true,
  },
  {
    _id: '3',
    name: 'Plain Yoghurt 250ml',
    category: 'Dairy',
    vendor: 'Inyange',
    location: { Near: 'False' },
    pickupTime: '5PM - 7PM Today',
    price: 800,
    offerPrice: 500,
    image: [plain_yoghurt],
    description: ['Creamy and smooth', 'Rich in probiotics', 'Perfect for breakfast or snacks'],
    createdAt: '2025-03-27T08:00:00.000Z',
    updatedAt: '2025-03-27T08:30:00.000Z',
    inStock: true,
  },
  {
    _id: '4',
    name: 'Fresh Lemonade 500ml',
    category: 'Drinks',
    vendor: 'Cool Drinks Co.',
    location: { Near: 'False' },
    pickupTime: '1PM - 3PM Today',
    price: 1500,
    offerPrice: 900,
    image: [lemonade],
    description: ['Refreshing and tangy', 'Made with real lemons', 'Perfect for hot days'],
    createdAt: '2025-03-28T09:30:00.000Z',
    updatedAt: '2025-03-28T10:00:00.000Z',
    inStock: true,
  },
  {
    _id: '5',
    name: 'Chicken Salad Pack',
    category: 'Instant',
    vendor: 'Healthy Bites',
    location: { Near: 'True' },
    pickupTime: '12PM - 2PM Today',
    price: 3000,
    offerPrice: 2000,
    image: [chicken_salad],
    description: [
      'Ready-to-eat chicken salad',
      'Fresh vegetables included',
      'Perfect for a quick meal',
    ],
    createdAt: '2025-03-29T11:00:00.000Z',
    updatedAt: '2025-03-29T11:30:00.000Z',
    inStock: true,
  },
  {
    _id: '6',
    name: 'Fresh Cucumber',
    category: 'Vegetables',
    vendor: 'Green Valley Farms',
    location: { Near: 'True' },
    pickupTime: '3PM - 5PM Today',
    price: 1000,
    offerPrice: 600,
    image: [cucumber],
    description: ['Crisp and hydrating', 'Perfect for salads and snacks', 'Rich in vitamins'],
    createdAt: '2025-03-30T07:45:00.000Z',
    updatedAt: '2025-03-30T08:15:00.000Z',
    inStock: true,
  },
  {
    _id: '7',
    name: 'Ripe Mango',
    category: 'Fruits',
    vendor: 'Tropical Delights',
    location: { Near: 'False' },
    pickupTime: '4PM - 6PM Today',
    price: 2000,
    offerPrice: 1200,
    image: [mango],
    description: [
      'Sweet and juicy',
      'Perfect for desserts and smoothies',
      'Rich in vitamins A and C',
    ],
    createdAt: '2025-03-31T10:20:00.000Z',
    updatedAt: '2025-03-31T10:50:00.000Z',
    inStock: true,
  },
  {
    _id: '8',
    name: 'Cheese Block 200g',
    category: 'Dairy',
    vendor: 'Cheese World',
    quantity: 5,
    location: { Near: 'False' },
    pickupTime: '2PM - 4PM Today',
    price: 2500,
    offerPrice: 1500,
    image: [cheese],
    description: ['Rich and creamy cheese', 'Perfect for sandwiches and cooking'],
    createdAt: '2025-04-01T09:00:00.000Z',
    updatedAt: '2025-04-01T09:30:00.000Z',
    inStock: true,
  },
  {
    _id: '9',
    name: 'Noodle Pack',
    category: 'Instant',
    vendor: 'Quick Eats',
    location: { Near: 'True' },
    pickupTime: '1PM - 3PM Today',
    price: 1800,
    offerPrice: 1000,
    image: [noodle],
    description: [
      'Quick and easy to prepare',
      'Delicious and satisfying',
      'Perfect for a fast meal',
    ],
    createdAt: '2025-04-02T08:00:00.000Z',
    updatedAt: '2025-04-02T08:30:00.000Z',
    inStock: true,
  },
  {
    _id: '10',
    name: 'Pastry Box',
    category: 'Bakery',
    vendor: 'Sweet Treats Bakery',
    location: { Near: 'True' },
    pickupTime: '11AM - 1PM Today',
    price: 3500,
    offerPrice: 2000,
    image: [pastry_box],
    description: ['Assorted pastries', 'Freshly baked', 'Perfect for celebrations and snacks'],
    createdAt: '2025-04-02T10:00:00.000Z',
    updatedAt: '2025-04-02T10:30:00.000Z',
    inStock: true,
  },
  {
    _id: '11',
    name: 'Fresh Tomatoes 1kg',
    category: 'Vegetables',
    vendor: 'Sunrise Farms',
    location: { Near: 'False' },
    pickupTime: '3PM - 5PM Today',
    price: 2200,
    offerPrice: 1300,
    image: [fresh_tomatoes],
    description: [
      'Juicy and ripe tomatoes',
      'Perfect for salads and cooking',
      'Rich in antioxidants',
    ],
    createdAt: '2025-04-02T11:00:00.000Z',
    updatedAt: '2025-04-02T11:30:00.000Z',
    inStock: true,
  },
];

export const dummyOrders = [
  {
    _id: 'CN78901',
    userId: '67b5880e4d09769c5ca61644',
    items: [
      {
        product: dummyProducts[3],
        quantity: 2,
        _id: '2',
      },
    ],
    vendor: 'Cool Drinks Co.',
    order_type: 'Single Order',
    type: 'Pickup',
    amount: 8900,
    status: 'Processing',
    paymentMethod: 'Momo by MTN',
    isPaid: true,
    createdAt: '2025-12-23T07:17:46.018Z',
    updatedAt: '2025-12-23T07:18:13.103Z',
  },
  {
    _id: 'CN78852',
    userId: '67b5880e4d09769c5ca61644',
    items: [
      {
        product: dummyProducts[0],
        quantity: 1,
        _id: '1',
      },
      {
        product: dummyProducts[1],
        quantity: 1,
        _id: '2',
      },
    ],
    vendor: 'Fresh Farm',
    order_type: 'Multiple Order',
    type: 'Delivery',
    amount: 17000,
    status: 'Completed',
    paymentMethod: 'Credit Card',
    isPaid: false,
    createdAt: '2025-12-19T07:17:13.068Z',
    updatedAt: '2025-12-19T07:17:13.068Z',
  },
];
