import icons from './icons';
import images from './images';
import {FeaturesTypes, ProductTypes, SplashTypes, TabBarTypes} from './types';
// random number between 1 to 1000 :)
const randomNumber = () => Math.floor(Math.random() * 1000) + 1;
// set the random number to the URL
const randomImage = (): string =>
  `https://picsum.photos/${Math.floor(Math.random() * 1000) + 1}/${
    Math.floor(Math.random() * 1000) + 1
  }`;

const SplashData: SplashTypes[] = [
  {
    image: images.splash1,
    title: 'Combat Misinformation',
    description:
      'Submit suspicious claims and get verified facts from professional fact-checkers',
  },
  {
    image: images.splash2,
    title: 'Real-time Verification',
    description:
      'Track your submitted claims and receive notifications when verdicts are published',
  },
  {
    image: images.splash3,
    title: 'Empower Democracy',
    description:
      'Stay informed with trending topics and educational content to combat fake news',
  },
];

const categories = [
  { id: 1, name: 'Politics' },
  { id: 2, name: 'Health' },
  { id: 3, name: 'Economy' },
  { id: 4, name: 'Education' },
  { id: 5, name: 'Technology' },
  { id: 6, name: 'Environment' },
];
const CategoriesData: FeaturesTypes[] = [
  {
    image: randomImage(),
    title: 'Beauty',
  },
  {
    image: randomImage(),
    title: 'Fashion',
  },
  {
    image: randomImage(),
    title: 'Kids',
  },
  {
    image: randomImage(),
    title: 'Mens',
  },
  {
    image: randomImage(),
    title: 'Womans',
  },
];

// Random Title
const titles = [
  'Women Printed Kurta',
  'HRX by Hrithik Roshan',
  "IWC Schaffhausen 2021 Pilot's Watch",
  'Labbin White Sneakers',
  'Black Winter Jacket',
  'Mens Starry Printed Shirt',
  'Black Dress',
  'Pink Embroidered Dress',
  'Realme 7',
  'Black Jacket',
  'D7200 Digital Camera',
  "Men's & Boys Formal Shoes",
];

const randomTitle = (): string =>
  titles[Math.floor(Math.random() * titles.length)];

const randomPrice = (): number =>
  parseFloat((Math.floor(Math.random() * 5000) + 500).toFixed(2));

const randomPriceBeforeDeal = (): number =>
  parseFloat(
    (randomPrice() + (Math.floor(Math.random() * 1000) + 100)).toFixed(2),
  );

const randomPriceOff = (price: number, priceBeforeDeal: number): string =>
  ((1 - price / priceBeforeDeal) * 100).toFixed(2);

const randomStars = (): number => (Math.random()  * 5);

const randomNumberOfReview = (): number => Math.floor(Math.random() * 10000);

const ProductData: ProductTypes[] = Array.from(
  {length: 15},
  (): ProductTypes => {
    const price = randomPrice();
    const priceBeforeDeal = randomPriceBeforeDeal();
    return {
      image: [randomImage()],
      _id: `product_${randomNumber()}`,
      title: randomTitle(),
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      price: price,
      priceBeforeDeal: priceBeforeDeal,
      priceOff: randomPriceOff(price, priceBeforeDeal),
      stars: randomStars(),
      numberOfReview: randomNumberOfReview(),
      tags: ['sample'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    };
  },
);
/**

 */
// TabBar data
const tabName = ['Home', 'Wishlist', 'Cart', 'Search', 'Setting'];
const TabBarData: TabBarTypes[] = [
  {
    title: tabName[0],
    image: icons.home,
    link: tabName[0],
    inActiveColor: '#000000',
    activeColor: '#EB3030',
  },
  {
    title: tabName[1],
    image: icons.home,
    link: tabName[1],
    inActiveColor: '#000000',
    activeColor: '#EB3030',
  },
  {
    title: tabName[2],
    image: icons.home,
    link: tabName[2],
    inActiveColor: '#050404',
    activeColor: '#EB3030',
    inActiveBGColor: '#FFFFFF',
    activeBGColor: '#EB3030',
  },
  {
    title: tabName[3],
    image: icons.home,
    link: tabName[3],
    inActiveColor: '#000000',
    activeColor: '#EB3030',
  },
  {
    title: tabName[4],
    image: icons.home,
    link: tabName[4],
    inActiveColor: '#000000',
    activeColor: '#EB3030',
  },
];

export { 
  TabBarData,
  ProductData,
  CategoriesData,
  SplashData,
  categories
}