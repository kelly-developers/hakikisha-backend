import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import React from 'react';
import {icons} from '../constants';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteStackParamList} from '../../App';

type Props = {};

const SettingTab = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RouteStackParamList>>();

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      {/* Clean Header */}
      <View className="bg-white pt-4 pb-4 px-6 border-b border-gray-200">
        <Text className="text-gray-900 text-xl font-pbold">Profile</Text>
        <Text className="text-gray-500 text-xs mt-0.5 font-pregular">Manage your account</Text>
      </View>

      {/* Profile Info */}
      <View className="px-5 mt-4">
        <View className="bg-white rounded-xl p-3 shadow-sm flex-row items-center border border-gray-100">
          <Image source={icons.profile} className="w-12 h-12 mr-3" resizeMode="contain" />
          <View>
            <Text className="text-gray-800 font-pbold text-base">John Doe</Text>
            <Text className="text-gray-500 font-pregular text-xs">john.doe@example.com</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="px-5 mt-4">
        <TouchableOpacity className="bg-white rounded-xl p-3 mb-2 shadow-sm flex-row items-center justify-between border border-gray-100">
          <View className="flex-row items-center">
            <Image source={icons.components} className="w-5 h-5 mr-3" resizeMode="contain" />
            <Text className="text-gray-800 font-pmedium text-sm">My Claims</Text>
          </View>
          <Image source={icons.next1} className="w-4 h-4" resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity className="bg-white rounded-xl p-3 mb-2 shadow-sm flex-row items-center justify-between border border-gray-100">
          <View className="flex-row items-center">
            <Image source={icons.setting} className="w-5 h-5 mr-3" resizeMode="contain" />
            <Text className="text-gray-800 font-pmedium text-sm">Settings</Text>
          </View>
          <Image source={icons.next1} className="w-4 h-4" resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity className="bg-white rounded-xl p-3 mb-2 shadow-sm flex-row items-center justify-between border border-gray-100">
          <View className="flex-row items-center">
            <Image source={icons.lock} className="w-5 h-5 mr-3" resizeMode="contain" />
            <Text className="text-gray-800 font-pmedium text-sm">Privacy Policy</Text>
          </View>
          <Image source={icons.next1} className="w-4 h-4" resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity className="bg-white rounded-xl p-3 mb-2 shadow-sm flex-row items-center justify-between border border-gray-100">
          <View className="flex-row items-center">
            <Image source={icons.mail} className="w-5 h-5 mr-3" resizeMode="contain" />
            <Text className="text-gray-800 font-pmedium text-sm">Contact Support</Text>
          </View>
          <Image source={icons.next1} className="w-4 h-4" resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={{backgroundColor: '#EF9334'}} 
          className="rounded-xl p-3 mt-3" 
          onPress={() => navigation.navigate('Login')}>
          <Text className="text-white font-pbold text-center text-sm">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SettingTab;