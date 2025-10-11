import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
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
    {id: 1, title: 'Politics', icon: '🏛️'},
    // {id: 3, title: 'Education', icon: '📚'},
    {id: 4, title: 'Economy', icon: '💰'},
    // {id: 5, title: 'Environment', icon: '🌍'},
  ];

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      {/* Modern Clean Header */}
      <View className="px-5 pt-3 pb-3 border-b border-gray-200 bg-white">
        <View className="flex flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-gray-900 text-xl font-pbold">HAKIKISHA</Text>
            <Text className="text-gray-500 text-xs mt-0.5 font-pregular">Fact Verification Platform</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            className="w-8 h-8 justify-center items-center bg-gray-100 rounded-full">
            <Image
              source={icons.profile}
              className="w-4 h-4"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-5 mt-5">
        <Text className="text-lg font-pbold text-foreground mb-3">Quick Actions</Text>
        <View className="flex flex-row justify-between gap-3">
          <TouchableOpacity 
            style={{backgroundColor: '#0A864D'}}
            className="flex-1 rounded-xl p-3 shadow-sm"
            onPress={() => navigation.navigate('PlaceOrder', undefined)}>
            <Text className="text-white text-center text-sm font-psemibold">📝 Submit Claim</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{backgroundColor: '#EF9334'}}
            className="flex-1 rounded-xl p-3 shadow-sm">
            <Text className="text-white text-center text-sm font-psemibold">🔥 Trending</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      <View className="mt-6">
        <View className="flex flex-row justify-between items-center px-5 mb-3">
          <Text className="text-lg font-pbold text-foreground">Categories</Text>
        </View>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({item}) => (
            <TouchableOpacity className="bg-white rounded-xl p-3 mx-2 shadow-sm items-center w-20 border border-gray-100">
              <Text className="text-2xl mb-1">{item.icon}</Text>
              <Text className="text-gray-800 text-xs font-pmedium text-center">{item.title}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={<View className="w-3" />}
          ListFooterComponent={<View className="w-3" />}
        />
      </View>

      {/* Trending Claims */}
      <View className="mt-6 px-5">
        <View className="flex flex-row justify-between items-center mb-3">
          <Text className="text-lg font-pbold text-foreground">Trending Claims</Text>
          <TouchableOpacity>
            <Text style={{color: '#0A864D'}} className="text-sm font-psemibold">View All</Text>
          </TouchableOpacity>
        </View>
        {trendingClaims.map(claim => (
          <View key={claim.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm border border-gray-100">
            <View className="flex flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-foreground font-pbold text-sm mb-1">{claim.title}</Text>
                <Text className="text-gray-500 text-xs font-pregular">{claim.category}</Text>
              </View>
              <View className={`px-2 py-1 rounded-full ${
                claim.status === 'verified' ? 'bg-green-100' : 
                claim.status === 'false' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <Text className={`text-xs font-psemibold ${
                  claim.status === 'verified' ? 'text-green-700' : 
                  claim.status === 'false' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {claim.status === 'verified' ? '✓ True' : 
                   claim.status === 'false' ? '✗ False' : '⚠ Context'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom Spacing */}
      <View className="h-4" />
    </ScrollView>
  );
};

export default HomeTab;