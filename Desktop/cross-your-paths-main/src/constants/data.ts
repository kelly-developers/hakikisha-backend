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
  { id: 1, name: 'Politics', icon: '🏛️' },
  { id: 2, name: 'Health', icon: '🏥' },
  { id: 3, name: 'Economy', icon: '💰' },
  { id: 4, name: 'Education', icon: '📚' },
  { id: 5, name: 'Technology', icon: '💻' },
  { id: 6, name: 'Environment', icon: '🌍' },
];

const trendingClaims = [
  {
    id: 1,
    title: 'Government announces new tax policy for 2025',
    category: 'Politics',
    status: 'Under Review',
    submittedAt: '2025-01-10',
    verdict: null,
  },
  {
    id: 2,
    title: 'New COVID variant detected in major cities',
    category: 'Health',
    status: 'Verified',
    submittedAt: '2025-01-09',
    verdict: 'Mostly True',
  },
  {
    id: 3,
    title: 'Inflation rate reaches 15% this quarter',
    category: 'Economy',
    status: 'False',
    submittedAt: '2025-01-08',
    verdict: 'False',
  },
];

export { 
  SplashData,
  categories,
  trendingClaims
}