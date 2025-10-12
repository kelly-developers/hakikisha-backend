import {View, Text, FlatList, TouchableOpacity, Image, ScrollView, StatusBar} from 'react-native';
import React from 'react';

type Blog = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
};

const mockBlogs: Blog[] = [
  {
    id: '1',
    title: 'How to Identify Fake News in the Digital Age',
    excerpt:
      'Learn the key indicators of misinformation and how to verify sources effectively.',
    author: 'Dr. Sarah Johnson',
    date: '2024-01-15',
    category: 'Digital Literacy',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'The Impact of Misinformation on Democracy',
    excerpt:
      'Exploring how false information affects political discourse and public opinion.',
    author: 'Prof. Michael Chen',
    date: '2024-01-14',
    category: 'Politics',
    readTime: '8 min read',
  },
  {
    id: '3',
    title: 'Fact-Checking Methods Used by Professionals',
    excerpt:
      'A behind-the-scenes look at how fact-checkers verify claims and sources.',
    author: 'Emma Williams',
    date: '2024-01-13',
    category: 'Education',
    readTime: '6 min read',
  },
];

type Props = {};

const BlogsTab = (props: Props) => {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Modern Header */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-gray-900 mb-1">
              Blog
            </Text>
            <Text className="text-sm font-pregular text-gray-500">
              Expert insights & fact-checking guides
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center ml-4">
            <Text className="text-gray-600 font-pbold text-lg">🔔</Text>
          </TouchableOpacity>
        </View>
        
        {/* Subtle separator */}
        <View className="border-b border-gray-100 mt-4" />
      </View>

      {/* Featured Banner */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-5">
          <TouchableOpacity
            style={{
              backgroundColor: '#0A864D',
              shadowColor: '#0A864D',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            className="rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-pbold">✨ Featured</Text>
              </View>
              <Text className="text-white/80 text-xs font-pmedium">New</Text>
            </View>
            <Text className="text-white text-xl font-pbold mb-2 leading-6">
              Digital Literacy Guide 2024
            </Text>
            <Text className="text-white/90 font-pregular text-sm mb-4 leading-5">
              Master the art of identifying misinformation with our comprehensive guide
            </Text>
            <View className="bg-white px-4 py-2.5 rounded-xl self-start shadow-sm">
              <Text style={{color: '#0A864D'}} className="font-psemibold text-sm">
                Read Now →
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Blog List */}
        <View className="px-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-psemibold text-gray-900">
              Latest Articles
            </Text>
            <TouchableOpacity>
              <Text className="text-[#0A864D] font-pmedium text-sm">
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          {mockBlogs.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {/* Category & Read Time */}
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
                    • {item.readTime}
                  </Text>
                </View>
                <View className="w-2 h-2 bg-gray-300 rounded-full" />
              </View>

              {/* Title */}
              <Text className="text-gray-900 font-pbold text-base mb-2 leading-5">
                {item.title}
              </Text>

              {/* Excerpt */}
              <Text className="text-gray-600 font-pregular text-sm mb-4 leading-5">
                {item.excerpt}
              </Text>

              {/* Author & Date */}
              <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-6 h-6 bg-gray-200 rounded-full mr-2" />
                  <Text className="text-gray-700 text-xs font-pmedium">
                    {item.author}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs font-pregular">
                  {item.date}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Empty State */}
          {mockBlogs.length === 0 && (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                <Text className="text-gray-400 text-2xl">📝</Text>
              </View>
              <Text className="text-gray-500 font-pregular text-sm text-center">
                No articles available yet{"\n"}
                <Text className="text-gray-400">Check back later for updates</Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default BlogsTab;