import {View, Text, TouchableOpacity, TextInput, Image, ScrollView, StatusBar} from 'react-native';
import React, {useState} from 'react';
import {icons} from '../constants';
import {mockClaims, ClaimStatus} from '../constants/claimsData';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

type Props = {};

type RootStackParamList = {
  ClaimDetails: { claimId: string };
};

const ClaimsListTab = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ClaimStatus>('all');
  
  const filteredClaims = mockClaims.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || claim.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100';
      case 'false':
        return 'bg-red-100';
      case 'misleading':
        return 'bg-orange-100';
      case 'needs_context':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusTextColor = (status: ClaimStatus) => {
    switch (status) {
      case 'verified':
        return 'text-green-700';
      case 'false':
        return 'text-red-700';
      case 'misleading':
        return 'text-orange-700';
      case 'needs_context':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusLabel = (status: ClaimStatus) => {
    switch (status) {
      case 'verified':
        return '✓ True';
      case 'false':
        return '✗ False';
      case 'misleading':
        return '⚠ Misleading';
      case 'needs_context':
        return '📋 Context';
      default:
        return '⏳ Pending';
    }
  };

  const handleClaimPress = (claimId: string) => {
    navigation.navigate('ClaimDetails', { claimId });
  };

  // Calculate counts
  const totalCount = mockClaims.length;
  const pendingCount = mockClaims.filter(claim => claim.status === 'pending').length;
  const verifiedCount = mockClaims.filter(claim => claim.status === 'verified').length;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Modern Header - Like Blogs Tab */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-gray-900 mb-1">
              My Claims
            </Text>
            <Text className="text-sm font-pregular text-gray-500">
              Track and manage your fact-check submissions
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center ml-4">
            <Text className="text-gray-600 font-pbold text-lg">📊</Text>
          </TouchableOpacity>
        </View>
        
        {/* Subtle separator */}
        <View className="border-b border-gray-100 mt-4" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Stats Overview - Like Featured Banner */}
        <View className="px-6 py-5">
          <View 
            style={{
              backgroundColor: '#0A864D',
              shadowColor: '#0A864D',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            className="rounded-2xl p-5"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-pbold">📈 Overview</Text>
              </View>
              <Text className="text-white/80 text-xs font-pmedium">Active</Text>
            </View>
            <Text className="text-white text-xl font-pbold mb-2 leading-6">
              Claim Analytics
            </Text>
            <Text className="text-white/90 font-pregular text-sm mb-4 leading-5">
              Monitor your fact-checking submissions and their status
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-white text-lg font-pbold">{totalCount}</Text>
                <Text className="text-white/80 text-xs font-pregular">Total</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-lg font-pbold">{pendingCount}</Text>
                <Text className="text-white/80 text-xs font-pregular">Pending</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-lg font-pbold">{verifiedCount}</Text>
                <Text className="text-white/80 text-xs font-pregular">Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search & Filters */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-psemibold text-gray-900">
              Your Claims
            </Text>
            <TouchableOpacity>
              <Text className="text-[#0A864D] font-pmedium text-sm">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View 
            className="bg-white rounded-2xl flex-row items-center px-4 py-3 shadow-sm border border-gray-200 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Image source={icons.search} className="w-4 h-4 mr-3" resizeMode="contain" tintColor="#666" />
            <TextInput
              placeholder="Search your claims..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-gray-900 font-pregular text-sm"
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text className="text-gray-400 text-lg">×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Centered Filter Buttons */}
          <View className="flex-row justify-center mb-4">
            <View className="flex-row bg-gray-100 rounded-xl p-1">
              {[
                {key: 'all', label: 'All'},
                {key: 'verified', label: 'Verified'},
                {key: 'false', label: 'False'},
                {key: 'pending', label: 'Pending'},
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setSelectedFilter(item.key as any)}
                  style={{
                    backgroundColor: selectedFilter === item.key ? '#0A864D' : 'transparent',
                  }}
                  className="px-4 py-2 rounded-lg mx-1"
                >
                  <Text
                    className={`text-sm font-pmedium ${
                      selectedFilter === item.key ? 'text-white' : 'text-gray-700'
                    }`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Claims List - Designed Like Blog Posts */}
        <View className="px-6 pb-8">
          {filteredClaims.map((item) => (
            <TouchableOpacity 
              key={item.id}
              onPress={() => handleClaimPress(item.id)}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {/* Status & Category - Like Blog Category & Read Time */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View 
                    style={{backgroundColor: '#0A864D'}}
                    className="px-3 py-1 rounded-full"
                  >
                    <Text className="text-white text-xs font-psemibold">
                      {item.category}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs font-pregular ml-2">
                    • {item.submittedDate}
                  </Text>
                </View>
                <View className="w-2 h-2 bg-gray-300 rounded-full" />
              </View>

              {/* Title - Like Blog Title */}
              <Text className="text-gray-900 font-pbold text-base mb-2 leading-5">
                {item.title}
              </Text>

              {/* Status Badge */}
              <View className={`px-3 py-1.5 rounded-full self-start mb-3 ${getStatusColor(item.status)}`}>
                <Text className={`text-xs font-psemibold ${getStatusTextColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>

              {/* Dates - Like Blog Author & Date */}
              <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-gray-200 rounded-full mr-2" />
                  <Text className="text-gray-700 text-xs font-pmedium">
                    Submitted: {item.submittedDate}
                  </Text>
                </View>
                {item.verdictDate && (
                  <Text className="text-gray-400 text-xs font-pregular">
                    Verdict: {item.verdictDate}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Empty State */}
          {filteredClaims.length === 0 && (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                <Text className="text-gray-400 text-2xl">📋</Text>
              </View>
              <Text className="text-gray-500 font-pregular text-sm text-center">
                No claims found{"\n"}
                <Text className="text-gray-400">Try adjusting your search or filters</Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimsListTab;