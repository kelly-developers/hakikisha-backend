// HAKIKISHA Claims Data

export type ClaimStatus = 'pending' | 'ai_processing' | 'human_review' | 'verified' | 'false' | 'misleading' | 'needs_context';
export type ClaimCategory = 'politics' | 'health' | 'economy' | 'education' | 'technology' | 'environment';

export interface Claim {
  id: string;
  title: string;
  description: string;
  category: ClaimCategory;
  status: ClaimStatus;
  submittedBy: string;
  submittedDate: string;
  verdictDate?: string;
  verdict?: string;
  sources?: string[];
  isTrending: boolean;
}

export const mockClaims: Claim[] = [
  {
    id: '1',
    title: '2024 Election Results Manipulated',
    description: 'Claims that the 2024 election results were manipulated through vote tampering',
    category: 'politics',
    status: 'false',
    submittedBy: 'user123',
    submittedDate: '2024-01-15',
    verdictDate: '2024-01-16',
    verdict: 'False - No evidence of vote manipulation found. Independent electoral commission confirmed results.',
    sources: ['electoral-commission.gov', 'fact-check-org.com'],
    isTrending: true,
  },
  {
    id: '2',
    title: 'New Health Policy Reduces Costs',
    description: 'Government claims new health policy will reduce healthcare costs by 50%',
    category: 'health',
    status: 'verified',
    submittedBy: 'user456',
    submittedDate: '2024-01-14',
    verdictDate: '2024-01-15',
    verdict: 'True - Policy analysis shows projected cost reduction of 45-55% over next 3 years.',
    sources: ['health-ministry.gov', 'policy-analysis-institute.org'],
    isTrending: true,
  },
  {
    id: '3',
    title: 'Education Budget Increased by 50%',
    description: 'Reports suggest education budget has been increased by 50% this fiscal year',
    category: 'education',
    status: 'needs_context',
    submittedBy: 'user789',
    submittedDate: '2024-01-13',
    verdictDate: '2024-01-14',
    verdict: 'Needs Context - Budget increased by 50% but only for primary education, not overall.',
    sources: ['treasury.gov', 'education-watch.org'],
    isTrending: false,
  },
  {
    id: '4',
    title: 'Climate Change Policy Implementation',
    description: 'Claims about new climate change policy implementation timeline',
    category: 'environment',
    status: 'pending',
    submittedBy: 'user101',
    submittedDate: '2024-01-12',
    isTrending: false,
  },
];

export const categories: {id: number; name: ClaimCategory}[] = [
  { id: 1, name: 'politics' },
  { id: 2, name: 'health' },
  { id: 3, name: 'economy' },
  { id: 4, name: 'education' },
  { id: 5, name: 'technology' },
  { id: 6, name: 'environment' },
];
