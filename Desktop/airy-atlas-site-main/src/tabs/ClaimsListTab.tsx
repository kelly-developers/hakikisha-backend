import {View, Text, FlatList, TouchableOpacity, TextInput, Image} from 'react-native';
import React, {useState} from 'react';
import {icons} from '../constants';
import {mockClaims, ClaimStatus} from '../constants/claimsData';

type Props = {};

const ClaimsListTab = (props: Props) => {
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
        return '📋 Context Needed';
      default:
        return '⏳ Pending';
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Clean Header */}
      <View className="bg-white pt-4 pb-4 px-6 border-b border-gray-200">
        <Text className="text-gray-900 text-xl font-pbold">My Claims</Text>
        <Text className="text-gray-500 text-xs mt-0.5 font-pregular">Track your submitted claims</Text>
      </View>

      {/* Filter Buttons */}
      <View className="px-6 mt-4">
        <FlatList
          data={[
            {key: 'all', label: 'All'},
            {key: 'verified', label: 'Verified'},
            {key: 'false', label: 'False'},
            {key: 'pending', label: 'Pending'},
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({item}) => (
            <TouchableOpacity
              onPress={() => setSelectedFilter(item.key as any)}
              style={{
                backgroundColor: selectedFilter === item.key ? '#0A864D' : 'white',
              }}
              className="mr-2 px-3 py-1.5 rounded-full border border-gray-200">
              <Text
                className={`text-xs font-pmedium ${
                  selectedFilter === item.key ? 'text-white' : 'text-gray-700'
                }`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.key}
        />
      </View>

      {/* Search Bar - Further Reduced Height */}
      <View className="px-6 mt-3">
        <View className="bg-gray-50 rounded-lg flex-row items-center px-3 py-1.5 border border-gray-200">
          <Image source={icons.search} className="w-3 h-3 mr-2" resizeMode="contain" tintColor="#666" />
          <TextInput
            placeholder="Search claims..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-gray-900 font-pregular text-xs"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Claims List */}
      <FlatList
        data={filteredClaims}
        className="px-5 mt-4"
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <View className="bg-white rounded-xl p-3 mb-3 shadow-sm border border-gray-100">
            <View className="flex flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-2">
                <Text className="text-gray-800 font-pbold text-sm mb-1">{item.title}</Text>
                <Text className="text-gray-500 text-xs font-pregular">{item.category}</Text>
              </View>
              <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                <Text className={`text-xs font-psemibold ${getStatusTextColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
              <Text className="text-gray-400 text-xs font-pregular">
                Submitted: {item.submittedDate}
              </Text>
              {item.verdictDate && (
                <Text className="text-gray-400 text-xs font-pregular">
                  Verdict: {item.verdictDate}
                </Text>
              )}
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-400 text-sm font-pregular">No claims found</Text>
          </View>
        }
      />
    </View>
  );
};

export default ClaimsListTab;