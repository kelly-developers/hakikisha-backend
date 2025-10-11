import {View, Text, FlatList, TouchableOpacity, Image} from 'react-native';
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
      {/* Header */}
      <View style={{backgroundColor: '#0A864D'}} className="pt-16 pb-8 px-6">
        <Text className="text-white text-3xl font-pbold mb-2">Blog</Text>
        <Text className="text-white/90 text-base font-pregular">
          Insights from fact-checkers
        </Text>
      </View>

      {/* Featured Banner */}
      <View className="px-6 py-6">
        <TouchableOpacity
          style={{backgroundColor: '#EF9334'}}
          className="rounded-2xl p-6">
          <View className="bg-white/20 px-3 py-1 rounded-full self-start mb-3">
            <Text className="text-white text-xs font-pbold">✨ Featured</Text>
          </View>
          <Text className="text-white text-2xl font-pbold mb-2">
            Digital Literacy Guide 2024
          </Text>
          <Text className="text-white/90 font-pregular mb-4">
            Everything you need to know about identifying misinformation
          </Text>
          <View className="bg-white px-4 py-2 rounded-xl self-start">
            <Text style={{color: '#EF9334'}} className="font-pmedium">
              Read Now
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Blog List */}
      <View className="px-6">
        <Text className="text-xl font-pbold text-gray-900 mb-4">
          Latest Articles
        </Text>
        <FlatList
          data={mockBlogs}
          renderItem={({item}) => (
            <TouchableOpacity className="bg-gray-50 rounded-2xl p-5 mb-4 border border-gray-100">
              {/* Category & Read Time */}
              <View className="flex-row items-center mb-3">
                <View className="bg-[#0A864D]/10 px-3 py-1 rounded-full mr-2">
                  <Text style={{color: '#0A864D'}} className="text-xs font-pmedium">
                    {item.category}
                  </Text>
                </View>
                <Text className="text-gray-500 text-xs font-pregular">
                  • {item.readTime}
                </Text>
              </View>

              {/* Title */}
              <Text className="text-gray-900 font-pbold text-lg mb-2">
                {item.title}
              </Text>

              {/* Excerpt */}
              <Text className="text-gray-600 font-pregular text-sm mb-4">
                {item.excerpt}
              </Text>

              {/* Author & Date */}
              <View className="flex-row items-center justify-between pt-3 border-t border-gray-200">
                <Text className="text-gray-500 text-sm font-pmedium">
                  {item.author}
                </Text>
                <Text className="text-gray-400 text-xs font-pregular">
                  {item.date}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-gray-400 text-base font-pregular">
                No blogs available yet
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

export default BlogsTab;
