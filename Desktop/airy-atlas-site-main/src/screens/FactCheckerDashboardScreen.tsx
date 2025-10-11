import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import {icons} from '../constants';

type Props = {};

type Claim = {
  id: string;
  title: string;
  description: string;
  category: string;
  submittedBy: string;
  submittedDate: string;
  imageUrl?: string;
  videoLink?: string;
  sourceLink?: string;
  aiSuggestion?: {
    status: 'verified' | 'false' | 'misleading' | 'needs_context';
    verdict: string;
    confidence: number;
    sources: string[];
  };
};

type FactCheckerStats = {
  totalVerified: number;
  pendingReview: number;
  timeSpent: string;
  accuracy: string;
};

const FactCheckerDashboardScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState<'pending' | 'ai-suggestions' | 'stats'>('pending');
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Claim[]>([]);
  const [stats, setStats] = useState<FactCheckerStats>({
    totalVerified: 0,
    pendingReview: 0,
    timeSpent: '0 hours',
    accuracy: '0%',
  });
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [verdictForm, setVerdictForm] = useState({
    status: 'verified' as 'verified' | 'false' | 'misleading' | 'needs_context',
    verdict: '',
    sources: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Replace with actual API calls to your backend
    // Mock data for now
    setPendingClaims([
      {
        id: '1',
        title: 'Government increased education budget by 50%',
        description: 'Claim that the government has increased the education budget by 50% this year',
        category: 'Politics',
        submittedBy: 'user123',
        submittedDate: '2025-01-10',
        imageUrl: '',
        videoLink: 'https://youtube.com/...',
        sourceLink: 'https://source.com/...',
      },
      {
        id: '2',
        title: 'New health study shows coffee prevents cancer',
        description: 'Recent study claims that drinking 3 cups of coffee daily can prevent certain types of cancer',
        category: 'Health',
        submittedBy: 'user456',
        submittedDate: '2025-01-11',
      },
    ]);

    setAiSuggestions([
      {
        id: '3',
        title: 'Unemployment rate dropped to 3%',
        description: 'Government claims unemployment rate has dropped to historic low of 3%',
        category: 'Economics',
        submittedBy: 'user789',
        submittedDate: '2025-01-09',
        aiSuggestion: {
          status: 'misleading',
          verdict: 'While the unemployment rate did decrease, it dropped to 3.8%, not 3%. The figure has been rounded down in official statements.',
          confidence: 0.92,
          sources: ['https://stats.gov/unemployment-2025', 'https://labor.ministry.gov/reports'],
        },
      },
    ]);

    setStats({
      totalVerified: 45,
      pendingReview: 12,
      timeSpent: '24 hours',
      accuracy: '95%',
    });
  };

  const handleSubmitVerdict = async () => {
    if (!selectedClaim || !verdictForm.verdict) {
      Alert.alert('Error', 'Please provide a verdict');
      return;
    }

    // TODO: Implement API call to submit verdict
    // POST /api/fact-checker/submit-verdict
    Alert.alert('Success', 'Verdict submitted successfully');
    setSelectedClaim(null);
    setVerdictForm({status: 'verified', verdict: '', sources: ''});
    loadDashboardData();
  };

  const handleApproveAiVerdict = async (claimId: string) => {
    // TODO: Implement API call to approve AI verdict
    // POST /api/fact-checker/approve-ai-verdict
    Alert.alert('Success', 'AI verdict approved and sent to user');
    loadDashboardData();
  };

  const handleEditAiVerdict = (claim: Claim) => {
    if (claim.aiSuggestion) {
      setVerdictForm({
        status: claim.aiSuggestion.status,
        verdict: claim.aiSuggestion.verdict,
        sources: claim.aiSuggestion.sources.join(', '),
      });
      setSelectedClaim(claim);
    }
  };

  const handleLogout = async () => {
    // TODO: Clear auth tokens and redirect to login
    navigation.navigate('Login');
  };

  const renderPendingClaims = () => (
    <View>
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Pending Claims ({pendingClaims.length})
      </Text>
      {pendingClaims.map(claim => (
        <TouchableOpacity
          key={claim.id}
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          onPress={() => setSelectedClaim(claim)}>
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-2">
              <Text className="font-psemibold text-base mb-1">{claim.title}</Text>
              <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
                {claim.description}
              </Text>
            </View>
            <View
              className="px-3 py-1 rounded-full"
              style={{backgroundColor: '#EF9334'}}>
              <Text className="text-white text-xs font-pmedium">{claim.category}</Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-500 text-xs">
              Submitted: {claim.submittedDate}
            </Text>
            <TouchableOpacity
              className="px-4 py-2 rounded-xl"
              style={{backgroundColor: '#0A864D'}}
              onPress={() => setSelectedClaim(claim)}>
              <Text className="text-white font-pmedium text-sm">Review</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAiSuggestions = () => (
    <View>
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        AI Suggested Verdicts
      </Text>
      {aiSuggestions.map(claim => (
        <View key={claim.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <Text className="font-psemibold text-base mb-1">{claim.title}</Text>
              <View
                className="px-3 py-1 rounded-full self-start mb-2"
                style={{
                  backgroundColor:
                    claim.aiSuggestion?.status === 'verified'
                      ? '#0A864D'
                      : claim.aiSuggestion?.status === 'false'
                      ? '#dc2626'
                      : '#EF9334',
                }}>
                <Text className="text-white text-xs font-pmedium">
                  AI: {claim.aiSuggestion?.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View className="items-center">
              <Text className="text-xs text-gray-500 mb-1">Confidence</Text>
              <Text className="font-pbold text-lg" style={{color: '#0A864D'}}>
                {(claim.aiSuggestion?.confidence || 0) * 100}%
              </Text>
            </View>
          </View>

          <Text className="text-gray-700 text-sm mb-3">
            {claim.aiSuggestion?.verdict}
          </Text>

          {claim.aiSuggestion?.sources && claim.aiSuggestion.sources.length > 0 && (
            <View className="mb-3">
              <Text className="font-pmedium text-xs text-gray-600 mb-1">Sources:</Text>
              {claim.aiSuggestion.sources.map((source, idx) => (
                <Text key={idx} className="text-xs text-blue-600 mb-1">
                  • {source}
                </Text>
              ))}
            </View>
          )}

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl"
              style={{backgroundColor: '#0A864D'}}
              onPress={() => handleApproveAiVerdict(claim.id)}>
              <Text className="text-white font-pbold text-center">Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl bg-gray-100"
              onPress={() => handleEditAiVerdict(claim)}>
              <Text className="text-gray-700 font-pbold text-center">Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStats = () => (
    <View>
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Your Statistics
      </Text>
      <View className="flex-row flex-wrap">
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Total Verified</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.totalVerified}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Pending Review</Text>
            <Text className="text-3xl font-pbold" style={{color: '#EF9334'}}>
              {stats.pendingReview}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Time Spent</Text>
            <Text className="text-xl font-pbold text-gray-800">{stats.timeSpent}</Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Accuracy</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.accuracy}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
            Fact Checker
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Image source={icons.profile} style={{width: 32, height: 32, tintColor: '#666'}} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="px-4 py-2 rounded-full mr-2"
          style={{backgroundColor: activeTab === 'pending' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('pending')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'pending' ? 'white' : '#666'}}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 rounded-full mr-2"
          style={{backgroundColor: activeTab === 'ai-suggestions' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('ai-suggestions')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'ai-suggestions' ? 'white' : '#666'}}>
            AI Suggestions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 rounded-full"
          style={{backgroundColor: activeTab === 'stats' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('stats')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'stats' ? 'white' : '#666'}}>
            Stats
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView className="flex-1 px-6 py-6">
        {activeTab === 'pending' && renderPendingClaims()}
        {activeTab === 'ai-suggestions' && renderAiSuggestions()}
        {activeTab === 'stats' && renderStats()}
      </ScrollView>

      <Modal
        visible={selectedClaim !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedClaim(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{maxHeight: '80%'}}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-pbold" style={{color: '#0A864D'}}>
                Submit Verdict
              </Text>
              <TouchableOpacity onPress={() => setSelectedClaim(null)}>
                <Text className="text-gray-600 text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {selectedClaim && (
                <>
                  <Text className="font-psemibold text-base mb-2">
                    {selectedClaim.title}
                  </Text>
                  <Text className="text-gray-600 text-sm mb-4">
                    {selectedClaim.description}
                  </Text>

                  <Text className="font-pmedium mb-2">Status</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {['verified', 'false', 'misleading', 'needs_context'].map(status => (
                      <TouchableOpacity
                        key={status}
                        className="px-4 py-2 rounded-full"
                        style={{
                          backgroundColor:
                            verdictForm.status === status ? '#0A864D' : '#f3f4f6',
                        }}
                        onPress={() =>
                          setVerdictForm({
                            ...verdictForm,
                            status: status as any,
                          })
                        }>
                        <Text
                          className="font-pmedium text-sm"
                          style={{
                            color: verdictForm.status === status ? 'white' : '#666',
                          }}>
                          {status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="font-pmedium mb-2">Verdict</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
                    placeholder="Write your detailed verdict here..."
                    value={verdictForm.verdict}
                    onChangeText={text => setVerdictForm({...verdictForm, verdict: text})}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text className="font-pmedium mb-2">Sources (comma separated)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
                    placeholder="https://source1.com, https://source2.com"
                    value={verdictForm.sources}
                    onChangeText={text => setVerdictForm({...verdictForm, sources: text})}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    className="py-4 rounded-xl"
                    style={{backgroundColor: '#0A864D'}}
                    onPress={handleSubmitVerdict}>
                    <Text className="text-white text-center font-pbold text-lg">
                      Submit Verdict
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FactCheckerDashboardScreen;
