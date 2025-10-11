import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import React, {useState} from 'react';
import {icons} from '../constants';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {CustomButton} from '../components';

type Props = {};

const ProfileScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+255 123 456 789',
    bio: 'Fact-checking enthusiast',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleUpdateProfile = async () => {
    // TODO: Implement API call to update profile
    Alert.alert('Success', 'Profile updated successfully');
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    // TODO: Implement API call to change password
    Alert.alert('Success', 'Password changed successfully');
    setPasswords({current: '', new: '', confirm: ''});
  };

  const handleSelectProfilePicture = () => {
    // TODO: Implement image picker
    Alert.alert('Info', 'Image picker will be implemented with backend');
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View style={{backgroundColor: '#0A864D'}} className="pt-16 pb-8 px-6">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-white text-3xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-pbold">Profile Settings</Text>
          <View style={{width: 30}} />
        </View>
      </View>

      {/* Profile Picture */}
      <View className="items-center -mt-12 mb-6">
        <TouchableOpacity
          onPress={handleSelectProfilePicture}
          className="bg-white rounded-full p-2 shadow-lg">
          <Image
            source={icons.profile}
            className="w-28 h-28 rounded-full"
            resizeMode="cover"
          />
          <View
            style={{backgroundColor: '#0A864D'}}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full items-center justify-center border-2 border-white">
            <Image source={icons.pen} className="w-5 h-5" tintColor="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-6">
        {/* Profile Information */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-pbold text-gray-900">
              Profile Information
            </Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text className="text-[#0A864D] font-pmedium">
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">Name</Text>
              <TextInput
                value={profile.name}
                onChangeText={text => setProfile({...profile, name: text})}
                editable={isEditing}
                className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular ${
                  isEditing ? 'border-2 border-[#0A864D]' : ''
                }`}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">Email</Text>
              <TextInput
                value={profile.email}
                editable={false}
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-500 font-pregular"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">Phone</Text>
              <TextInput
                value={profile.phone}
                onChangeText={text => setProfile({...profile, phone: text})}
                editable={isEditing}
                className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular ${
                  isEditing ? 'border-2 border-[#0A864D]' : ''
                }`}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">Bio</Text>
              <TextInput
                value={profile.bio}
                onChangeText={text => setProfile({...profile, bio: text})}
                editable={isEditing}
                multiline
                numberOfLines={3}
                className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular ${
                  isEditing ? 'border-2 border-[#0A864D]' : ''
                }`}
              />
            </View>
          </View>

          {isEditing && (
            <CustomButton
              title="Save Changes"
              handlePress={handleUpdateProfile}
              containerStyle="py-4 mt-4"
            />
          )}
        </View>

        {/* Change Password */}
        <View className="mb-8">
          <Text className="text-xl font-pbold text-gray-900 mb-4">
            Change Password
          </Text>

          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">
                Current Password
              </Text>
              <TextInput
                value={passwords.current}
                onChangeText={text =>
                  setPasswords({...passwords, current: text})
                }
                secureTextEntry
                placeholder="Enter current password"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">
                New Password
              </Text>
              <TextInput
                value={passwords.new}
                onChangeText={text => setPasswords({...passwords, new: text})}
                secureTextEntry
                placeholder="Enter new password"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-pmedium text-gray-600 mb-2">
                Confirm New Password
              </Text>
              <TextInput
                value={passwords.confirm}
                onChangeText={text =>
                  setPasswords({...passwords, confirm: text})
                }
                secureTextEntry
                placeholder="Confirm new password"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular"
              />
            </View>
          </View>

          <CustomButton
            title="Update Password"
            handlePress={handleChangePassword}
            containerStyle="py-4 mt-4"
          />
        </View>

        {/* Danger Zone */}
        <View className="mb-8">
          <Text className="text-xl font-pbold text-red-600 mb-4">
            Danger Zone
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      // TODO: Implement account deletion
                    },
                  },
                ],
              )
            }
            className="bg-red-50 rounded-xl p-4 border border-red-200">
            <Text className="text-red-600 font-pmedium text-center">
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;
