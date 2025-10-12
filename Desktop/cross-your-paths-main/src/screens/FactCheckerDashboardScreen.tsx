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

type Blog = {
  id: string;
  title: string;
  category: string;
  content: string;
  publishedBy: string;
  publishDate: string;
};

const FactCheckerDashboardScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState<'pending' | 'ai-suggestions' | 'stats' | 'blogs'>('pending');
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
  const [blogForm, setBlogForm] = useState({
    title: '',
    category: '',
    content: '',
  });
  const [publishedBlogs, setPublishedBlogs] = useState<Blog[]>([]);
  const [selectedStat, setSelectedStat] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Mock data
    setPendingClaims([
      {
        id: '1',
        title: 'Government increased education budget by 50%',
        description: 'Claim that the government has increased the education budget by 50% this year',
        category: 'Governance',
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
        category: 'Misinformation',
        submittedBy: 'user456',
        submittedDate: '2025-01-11',
      },
    ]);

    setAiSuggestions([
      {
        id: '3',
        title: 'Unemployment rate dropped to 3%',
        description: 'Government claims unemployment rate has dropped to historic low of 3%',
        category: 'Civic Process',
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

    // Load published blogs
    setPublishedBlogs([
      {
        id: '1',
        title: 'Understanding Digital Literacy in Modern Society',
        category: 'Governance',
        content: 'Digital literacy has become increasingly important...',
        publishedBy: 'Fact Checker Admin',
        publishDate: '2025-01-15',
      },
    ]);
  };

  const handleSubmitVerdict = async () => {
    if (!selectedClaim || !verdictForm.verdict) {
      Alert.alert('Error', 'Please provide a verdict');
      return;
    }

    // TODO: Implement API call to submit verdict to user
    // POST /api/fact-checker/submit-verdict
    Alert.alert('Success', 'Verdict submitted successfully and sent to user');
    
    // Remove the claim from pending list
    setPendingClaims(prev => prev.filter(claim => claim.id !== selectedClaim.id));
    
    setSelectedClaim(null);
    setVerdictForm({status: 'verified', verdict: '', sources: ''});
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalVerified: prev.totalVerified + 1,
      pendingReview: prev.pendingReview - 1,
    }));
  };

  const handleApproveAiVerdict = async (claimId: string) => {
    // TODO: Implement API call to approve AI verdict and send to user
    // POST /api/fact-checker/approve-ai-verdict
    Alert.alert('Success', 'AI verdict approved and sent to user');
    
    // Remove from AI suggestions
    setAiSuggestions(prev => prev.filter(claim => claim.id !== claimId));
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalVerified: prev.totalVerified + 1,
    }));
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

  const handleSubmitEditedVerdict = async () => {
    if (!selectedClaim || !verdictForm.verdict) {
      Alert.alert('Error', 'Please provide a verdict');
      return;
    }

    // TODO: Implement API call to submit edited verdict to user
    // POST /api/fact-checker/submit-edited-verdict
    Alert.alert('Success', 'Edited verdict submitted and sent to user');
    
    // Remove from AI suggestions
    setAiSuggestions(prev => prev.filter(claim => claim.id !== selectedClaim.id));
    
    setSelectedClaim(null);
    setVerdictForm({status: 'verified', verdict: '', sources: ''});
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalVerified: prev.totalVerified + 1,
    }));
  };

  const handlePublishBlog = async () => {
    if (!blogForm.title || !blogForm.category || !blogForm.content) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // TODO: Implement API call to publish blog
    const newBlog: Blog = {
      id: Date.now().toString(),
      title: blogForm.title,
      category: blogForm.category,
      content: blogForm.content,
      publishedBy: 'Fact Checker', // This would come from user context in real app
      publishDate: new Date().toISOString().split('T')[0],
    };

    setPublishedBlogs(prev => [newBlog, ...prev]);
    Alert.alert('Success', 'Blog published successfully!');
    setBlogForm({title: '', category: '', content: ''});
  };

  const handleLogout = async () => {
    // TODO: Clear auth tokens and redirect to login
    navigation.navigate('Login');
  };

  const renderPendingClaims = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Pending Claims ({pendingClaims.length})
      </Text>
      {pendingClaims.map(claim => (
        <View key={claim.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
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
              className="px-3 py-2 rounded-lg"
              style={{backgroundColor: '#0A864D'}}
              onPress={() => {
                setSelectedClaim(claim);
                setVerdictForm({status: 'verified', verdict: '', sources: ''});
              }}>
              <Text className="text-white font-pmedium text-xs">Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderAiSuggestions = () => (
    <View className="pb-6">
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
              className="flex-1 py-2 rounded-lg"
              style={{backgroundColor: '#0A864D'}}
              onPress={() => handleApproveAiVerdict(claim.id)}>
              <Text className="text-white font-pmedium text-center text-sm">Approve & Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2 rounded-lg bg-gray-100"
              onPress={() => {
                handleEditAiVerdict(claim);
              }}>
              <Text className="text-gray-700 font-pmedium text-center text-sm">Edit & Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStats = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Your Statistics
      </Text>
      <View className="flex-row flex-wrap">
        <TouchableOpacity 
          className="w-1/2 p-2"
          onPress={() => setSelectedStat('totalVerified')}>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Total Verified</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.totalVerified}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="w-1/2 p-2"
          onPress={() => setSelectedStat('pendingReview')}>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Pending Review</Text>
            <Text className="text-3xl font-pbold" style={{color: '#EF9334'}}>
              {stats.pendingReview}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="w-1/2 p-2"
          onPress={() => setSelectedStat('timeSpent')}>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Time Spent</Text>
            <Text className="text-xl font-pbold text-gray-800">{stats.timeSpent}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="w-1/2 p-2"
          onPress={() => setSelectedStat('accuracy')}>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Accuracy</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.accuracy}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stat Details Modal */}
      <Modal
        visible={!!selectedStat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedStat('')}>
        <View className="flex-1 justify-center bg-black/50 p-6">
          <View className="bg-white rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-pbold" style={{color: '#0A864D'}}>
                {selectedStat === 'totalVerified' && 'Total Verified Details'}
                {selectedStat === 'pendingReview' && 'Pending Review Details'}
                {selectedStat === 'timeSpent' && 'Time Spent Analysis'}
                {selectedStat === 'accuracy' && 'Accuracy Breakdown'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedStat('')}>
                <Text className="text-gray-600 text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-700 mb-4">
              {selectedStat === 'totalVerified' && `You have successfully verified ${stats.totalVerified} claims. This includes various categories like Governance, Misinformation, and Civic Process.`}
              {selectedStat === 'pendingReview' && `You currently have ${stats.pendingReview} claims awaiting your review. These will be processed based on priority and submission date.`}
              {selectedStat === 'timeSpent' && `You have spent ${stats.timeSpent} on fact-checking activities. This includes reviewing claims, researching sources, and writing verdicts.`}
              {selectedStat === 'accuracy' && `Your fact-checking accuracy is ${stats.accuracy}. This is calculated based on the correctness of your verdicts compared to community feedback and expert reviews.`}
            </Text>

            <TouchableOpacity
              className="py-3 rounded-lg mt-4"
              style={{backgroundColor: '#0A864D'}}
              onPress={() => setSelectedStat('')}>
              <Text className="text-white text-center font-pbold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderBlogs = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Write Blog Article
      </Text>
      
      <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <Text className="font-pmedium mb-2 text-gray-800">Title</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-800"
          placeholder="Enter blog title..."
          placeholderTextColor="#9CA3AF"
          value={blogForm.title}
          onChangeText={text => setBlogForm({...blogForm, title: text})}
        />

        <Text className="font-pmedium mb-2 text-gray-800">Category</Text>
        <View className="mb-4">
          <View className="flex-row justify-between bg-orange-50 rounded-lg p-1">
            {['Governance', 'Misinformation', 'Civic Process'].map(cat => (
              <TouchableOpacity
                key={cat}
                className="flex-1 mx-1 py-2 rounded-md"
                style={{
                  backgroundColor: blogForm.category === cat ? '#EF9334' : 'transparent',
                }}
                onPress={() => setBlogForm({...blogForm, category: cat})}>
                <Text
                  className="text-center font-pmedium text-xs"
                  style={{color: blogForm.category === cat ? 'white' : '#666'}}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="font-pmedium mb-2 text-gray-800">Content</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
          placeholder="Write your blog content here..."
          placeholderTextColor="#9CA3AF"
          value={blogForm.content}
          onChangeText={text => setBlogForm({...blogForm, content: text})}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={{minHeight: 150}}
        />

        <TouchableOpacity
          className="py-3 rounded-lg"
          style={{backgroundColor: '#0A864D'}}
          onPress={handlePublishBlog}>
          <Text className="text-white text-center font-pbold">
            Publish Blog
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-lg font-psemibold mb-3" style={{color: '#0A864D'}}>
        Your Published Blogs
      </Text>
      
      {publishedBlogs.length > 0 ? (
        publishedBlogs.map(blog => (
          <View key={blog.id} className="bg-white rounded-2xl p-4 shadow-sm mb-3">
            <Text className="font-psemibold text-base mb-2">{blog.title}</Text>
            <View className="flex-row justify-between items-center mb-2">
              <View className="px-3 py-1 rounded-full" style={{backgroundColor: '#EF9334'}}>
                <Text className="text-white text-xs font-pmedium">{blog.category}</Text>
              </View>
              <Text className="text-gray-500 text-xs">{blog.publishDate}</Text>
            </View>
            <Text className="text-gray-600 text-sm mb-2" numberOfLines={3}>
              {blog.content}
            </Text>
            <Text className="text-gray-500 text-xs">
              Published by: {blog.publishedBy}
            </Text>
          </View>
        ))
      ) : (
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-gray-500 text-center text-sm">
            No blogs published yet
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-pbold" style={{color: '#0A864D'}}>
            Fact Checker
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Image source={icons.profile} style={{width: 32, height: 32, tintColor: '#666'}} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="px-6 py-3 bg-white border-b border-gray-200">
        <View className="flex-row justify-between">
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'pending' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('pending')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'pending' ? 'white' : '#666'}}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'ai-suggestions' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('ai-suggestions')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'ai-suggestions' ? 'white' : '#666'}}>
              AI Stats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'stats' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('stats')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'stats' ? 'white' : '#666'}}>
              Statistics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'blogs' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('blogs')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'blogs' ? 'white' : '#666'}}>
              Blogs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1 px-6 py-6"
        contentContainerStyle={{paddingBottom: 20}}
        showsVerticalScrollIndicator={true}>
        {activeTab === 'pending' && renderPendingClaims()}
        {activeTab === 'ai-suggestions' && renderAiSuggestions()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'blogs' && renderBlogs()}
      </ScrollView>

      {/* Verdict Modal - Used for both pending claims and editing AI verdicts */}
      <Modal
        visible={selectedClaim !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedClaim(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-pbold" style={{color: '#0A864D'}}>
                {selectedClaim?.aiSuggestion ? 'Edit AI Verdict' : 'Submit Verdict'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedClaim(null)}>
                <Text className="text-gray-600 text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{paddingBottom: 10}}>
              {selectedClaim && (
                <>
                  <Text className="font-psemibold text-base mb-2 text-gray-800">
                    {selectedClaim.title}
                  </Text>
                  <Text className="text-gray-600 text-sm mb-4">
                    {selectedClaim.description}
                  </Text>

                  <Text className="font-pmedium mb-2 text-gray-800">Status</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {['verified', 'false', 'misleading', 'needs_context'].map(status => (
                      <TouchableOpacity
                        key={status}
                        className="px-3 py-2 rounded-lg"
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
                          className="font-pmedium text-xs"
                          style={{
                            color: verdictForm.status === status ? 'white' : '#666',
                          }}>
                          {status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="font-pmedium mb-2 text-gray-800">Verdict</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
                    placeholder="Write your detailed verdict here..."
                    placeholderTextColor="#9CA3AF"
                    value={verdictForm.verdict}
                    onChangeText={text => setVerdictForm({...verdictForm, verdict: text})}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text className="font-pmedium mb-2 text-gray-800">Sources (comma separated)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-gray-800"
                    placeholder="https://source1.com, https://source2.com"
                    placeholderTextColor="#9CA3AF"
                    value={verdictForm.sources}
                    onChangeText={text => setVerdictForm({...verdictForm, sources: text})}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    className="py-3 rounded-lg mb-4"
                    style={{backgroundColor: '#0A864D'}}
                    onPress={selectedClaim.aiSuggestion ? handleSubmitEditedVerdict : handleSubmitVerdict}>
                    <Text className="text-white text-center font-pbold">
                      {selectedClaim.aiSuggestion ? 'Submit Edited Verdict' : 'Submit Verdict'} & Send to User
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