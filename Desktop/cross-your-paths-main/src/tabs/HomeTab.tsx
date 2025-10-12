import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
} from 'react-native';
import React, {useState} from 'react';
import {icons} from '../constants';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {mockClaims, categories as claimCategories} from '../constants/claimsData';
import {RouteStackParamList} from '../../App';

type Props = {};

const HomeTab = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RouteStackParamList>>();

  const trendingClaims = mockClaims.filter(claim => claim.isTrending);

  const categories = [
    {id: 1, title: 'Governance', icon: '🏛️'},
    {id: 2, title: 'Misinformation', icon: '⚠️'},
    {id: 3, title: 'Civic Processes', icon: '🗳️'},
  ];

  const getStatusColor = (status: string) => {
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

  const getStatusTextColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Professional Header */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-gray-900 mb-1">
              HAKIKISHA
            </Text>
            <Text className="text-sm font-pregular text-gray-500">
              Fact Verification Platform
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            className="w-10 h-10 justify-center items-center bg-gray-100 rounded-full">
            <Image
              source={icons.profile}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        
        {/* Subtle separator */}
        <View className="border-b border-gray-100 mt-4" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View className="px-6 pt-5">
          <Text className="text-lg font-psemibold text-gray-900 mb-4">Quick Actions</Text>
          <View className="flex flex-row justify-between gap-4">
            <TouchableOpacity 
              style={{
                backgroundColor: '#0A864D',
                shadowColor: '#0A864D',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              className="flex-1 rounded-2xl p-4"
              onPress={() => navigation.navigate('SubmitClaim')}>
              <Text className="text-white text-center text-sm font-psemibold">Submit Claim</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{
                backgroundColor: '#EF9334',
                shadowColor: '#EF9334',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              className="flex-1 rounded-2xl p-4">
              <Text className="text-white text-center text-sm font-psemibold">Trending</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories - Reduced Size */}
        <View className="mt-5">
          <View className="flex flex-row justify-between items-center px-6 mb-3">
            <Text className="text-base font-psemibold text-gray-900">Categories</Text>
            <TouchableOpacity>
              <Text className="text-[#0A864D] font-pmedium text-xs">View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({item}) => (
              <TouchableOpacity 
                className={`bg-white rounded-xl p-3 mx-2 shadow-sm items-center border border-gray-100 ${
                  item.title === 'Misinformation' ? 'w-25' : 'w-24'
                }`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 1},
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text className="text-2xl mb-1">{item.icon}</Text>
                <Text className={`text-gray-800 font-pmedium text-center text-xs ${
                  item.title === 'Misinformation' ? 'leading-4' : ''
                }`}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            ListHeaderComponent={<View className="w-3" />}
            ListFooterComponent={<View className="w-3" />}
          />
        </View>

        {/* Trending Claims - Redesigned Like Blog Posts */}
        <View className="mt-6 px-6 pb-8">
          <View className="flex flex-row justify-between items-center mb-4">
            <Text className="text-lg font-psemibold text-gray-900">Trending Claims</Text>
            <TouchableOpacity>
              <Text className="text-[#0A864D] font-pmedium text-sm">View All</Text>
            </TouchableOpacity>
          </View>
          
          {trendingClaims.map(claim => (
            <TouchableOpacity 
              key={claim.id} 
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {/* Category & Status - Like Blog Category & Read Time */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View 
                    style={{backgroundColor: '#0A864D'}}
                    className="px-3 py-1 rounded-full"
                  >
                    <Text className="text-white text-xs font-psemibold">
                      {claim.category}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs font-pregular ml-2">
                    • Trending
                  </Text>
                </View>
                <View className="w-2 h-2 bg-gray-300 rounded-full" />
              </View>

              {/* Title - Like Blog Title */}
              <Text className="text-gray-900 font-pbold text-base mb-2 leading-5">
                {claim.title}
              </Text>

              {/* Description - Like Blog Excerpt */}
              <Text className="text-gray-600 font-pregular text-sm mb-3 leading-5">
                {claim.description || 'Fact-checking analysis in progress for this trending claim.'}
              </Text>

              {/* Status Badge */}
              <View className={`px-3 py-1.5 rounded-full self-start mb-3 ${getStatusColor(claim.status)}`}>
                <Text className={`text-xs font-psemibold ${getStatusTextColor(claim.status)}`}>
                  {getStatusLabel(claim.status)}
                </Text>
              </View>

              {/* Additional Info - Like Blog Author & Date */}
              <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-gray-200 rounded-full mr-2" />
                  <Text className="text-gray-700 text-xs font-pmedium">
                    {claim.verdictDate ? `Verified: ${claim.verdictDate}` : 'Under Review'}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs font-pregular">
                  {claim.submittedDate}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Empty State for Trending Claims */}
          {trendingClaims.length === 0 && (
            <View className="items-center justify-center py-8">
              <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mb-2">
                <Text className="text-gray-400 text-xl">🔥</Text>
              </View>
              <Text className="text-gray-500 font-pregular text-xs text-center">
                No trending claims{"\n"}
                <Text className="text-gray-400">Check back later for updates</Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeTab;