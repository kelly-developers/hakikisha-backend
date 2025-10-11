import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {CustomButton} from '../components';
import {ClaimCategory, categories} from '../constants/claimsData';

type Props = {};

const SubmitClaimScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [selectedCategory, setSelectedCategory] = useState<ClaimCategory | null>(null);
  const [claimText, setClaimText] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!claimText.trim()) {
      Alert.alert('Error', 'Please enter the claim text');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your backend API call
      // const response = await fetch('YOUR_BACKEND_URL/api/claims/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     category: selectedCategory,
      //     claim: claimText,
      //     videoLink,
      //     sourceLink,
      //   }),
      // });
      
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert(
          'Success',
          'Your claim has been submitted for verification',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit claim. Please try again.');
    }
  };

  const handleSelectImage = () => {
    // TODO: Implement image picker
    Alert.alert('Info', 'Image upload will be implemented with backend');
  };

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* Clean Header */}
      <View className="bg-white pt-4 pb-4 px-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-gray-900 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-gray-900 text-lg font-pbold">Submit Claim</Text>
          <View style={{width: 24}} />
        </View>
      </View>

      <View className="px-6 py-4">
        {/* Category Selection */}
        <View className="mb-5">
          <Text className="text-base font-pbold text-gray-900 mb-3 text-center">
            Select Category
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.name)}
                style={{
                  backgroundColor:
                    selectedCategory === cat.name ? '#0A864D' : '#F3F4F6',
                }}
                className="px-3 py-2 rounded-xl">
                <Text
                  className={`text-xs font-pmedium ${
                    selectedCategory === cat.name
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}>
                  {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Claim Text */}
        <View className="mb-5">
          <Text className="text-base font-pbold text-gray-900 mb-2">
            Claim Description
          </Text>
          <TextInput
            value={claimText}
            onChangeText={setClaimText}
            placeholder="Enter the claim you want to verify..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular text-sm"
            style={{minHeight: 100}}
          />
        </View>

        {/* Image Upload */}
        <View className="mb-5">
          <Text className="text-base font-pbold text-gray-900 mb-2">
            Evidence (Optional)
          </Text>
          <TouchableOpacity
            onPress={handleSelectImage}
            className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300 items-center">
            <Text className="text-gray-600 font-pmedium text-xs mb-1">
              📸 Upload Image
            </Text>
            <Text className="text-gray-400 font-pregular text-xs">
              Add photo evidence
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Link */}
        <View className="mb-5">
          <Text className="text-base font-pbold text-gray-900 mb-2">
            Video Link (Optional)
          </Text>
          <TextInput
            value={videoLink}
            onChangeText={setVideoLink}
            placeholder="https://youtube.com/..."
            className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular text-sm"
          />
        </View>

        {/* Source Link */}
        <View className="mb-6">
          <Text className="text-base font-pbold text-gray-900 mb-2">
            Source Link (Optional)
          </Text>
          <TextInput
            value={sourceLink}
            onChangeText={setSourceLink}
            placeholder="https://..."
            className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-pregular text-sm"
          />
        </View>

        {/* Submit Button */}
        <CustomButton
          title="Submit Claim"
          handlePress={handleSubmit}
          isLoading={isSubmitting}
          containerStyle="py-2"
        />

        <View className="mt-5 bg-blue-50 rounded-xl p-3">
          <Text className="text-blue-800 font-pmedium text-xs text-center">
            ℹ️ Your claim will be reviewed by our fact-checkers
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SubmitClaimScreen;