import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

type Props = {};

const PrivacyPolicyScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View style={{backgroundColor: '#0A864D'}} className="pt-16 pb-8 px-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-white text-3xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-pbold">Privacy Policy</Text>
          <View style={{width: 30}} />
        </View>
      </View>

      <View className="px-6 py-6">
        <Text className="text-gray-500 text-sm font-pregular mb-6">
          Last updated: January 2024
        </Text>

        <Text className="text-2xl font-pbold text-gray-900 mb-4">
          CRECO Privacy Policy
        </Text>

        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          At HAKIKISHA, we are committed to protecting your privacy and ensuring
          the security of your personal information. This Privacy Policy outlines
          how we collect, use, and safeguard your data.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          1. Information We Collect
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          We collect information you provide directly to us, including your name,
          email address, and any claims you submit for verification. We also
          collect device information and usage data to improve our services.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          2. How We Use Your Information
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          Your information is used to provide fact-checking services, communicate
          with you about claim statuses, improve our platform, and ensure the
          integrity of our verification process.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          3. Data Sharing and Disclosure
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          We do not sell your personal information. We may share data with our
          fact-checking partners and as required by law. All shared data is
          handled in accordance with data protection regulations.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          4. Data Security
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          We implement appropriate technical and organizational measures to
          protect your personal information against unauthorized access, loss, or
          misuse.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          5. Your Rights
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          You have the right to access, correct, or delete your personal
          information. You may also object to certain processing activities. To
          exercise these rights, please contact us through the app.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          6. Changes to This Policy
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-6 leading-6">
          We may update this Privacy Policy from time to time. We will notify you
          of any significant changes through the app or via email.
        </Text>

        <Text className="text-xl font-pbold text-gray-900 mb-3">
          7. Contact Us
        </Text>
        <Text className="text-base font-pregular text-gray-700 mb-8 leading-6">
          If you have any questions about this Privacy Policy, please contact us
          at privacy@creco.org
        </Text>

        <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <Text className="text-gray-700 font-pmedium text-center">
            📧 privacy@creco.org
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyScreen;
