import {View, Text, FlatList, TextInput, Image, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';
import {icons} from '../constants';
import {mockClaims} from '../constants/claimsData';

type Props = {};

const SearchTab: React.FC<Props> = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResults = mockClaims.filter(claim =>
    claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-background">
      {/* Clean Header */}
      <View className="bg-white pt-4 pb-4 px-6 border-b border-gray-200">
        <Text className="text-gray-900 text-xl font-pbold">Search</Text>
        <Text className="text-gray-500 text-xs mt-0.5 font-pregular">Find verified claims</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mt-4">
        <View className="bg-gray-50 rounded-lg flex-row items-center px-3 py-1.5 border border-gray-200">
          <Image source={icons.search} className="w-3 h-3 mr-2" resizeMode="contain" tintColor="#666" />
          <TextInput
            placeholder="Search claims, verdicts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-gray-900 font-pregular text-xs"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      {/* Results */}
      {searchQuery.length > 0 && (
        <View className="px-5 mt-4">
          <Text className="text-gray-900 font-pbold text-base mb-3">
            {filteredResults.length} Results
          </Text>
          <FlatList
            data={filteredResults}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => (
              <View className="bg-white rounded-xl p-3 mb-3 shadow-sm border border-gray-100">
                <Text className="text-gray-800 font-pbold text-sm mb-1">{item.title}</Text>
                <Text className="text-gray-500 text-xs font-pregular mb-2">{item.description}</Text>
                <View className="flex flex-row justify-between items-center">
                  <Text className="text-gray-400 text-xs font-pregular">{item.category}</Text>
                  {item.verdict && (
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-green-700 text-xs font-psemibold">Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            keyExtractor={item => item.id}
          />
        </View>
      )}

      {searchQuery.length === 0 && (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-gray-400 text-sm font-pregular text-center">
            Search for claims, verdicts, and fact-checks
          </Text>
        </View>
      )}
    </View>
  );
};

export default SearchTab;