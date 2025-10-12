import {View, Text, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {CustomButton} from '../components';
import LineInputField from '../components/LineInputField';

type Props = {};

const ForgotPasswordScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!email) {
      setEmailError('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your backend API call
      setTimeout(() => {
        setIsSubmitting(false);
        setResetSent(true);
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      setEmailError('Failed to send reset email. Please try again.');
    }
  };

  const embassyImage = require('../assets/images/emabsy_of_finlad.png');
  const crecoImage = require('../assets/images/creco-kenya.png');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView 
        contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 bg-white justify-center">
          {/* Reset password content moved up a little bit */}
          <View className="px-6 pb-4 mt-32">
            <View className="mb-4">
              <Text className="text-2xl font-pbold text-gray-900 mb-1 text-center">
                Reset Password
              </Text>
              <Text className="text-sm font-pregular text-gray-600 text-center">
                {resetSent 
                  ? 'Check your email for reset instructions'
                  : 'Enter your email to receive reset instructions'}
              </Text>
            </View>

            {!resetSent ? (
              <View>
                <LineInputField
                  title="Email"
                  value={email}
                  placeholder="Enter your email"
                  onChangeText={(e: string) => {
                    setEmailError('');
                    setEmail(e);
                  }}
                  error={emailError}
                  fieldName="email"
                  focusedField={focusedField}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  // Remove keyboardType and autoCapitalize as they're not supported by LineInputField
                />

                <CustomButton
                  title="Send Reset Link"
                  handlePress={handleResetPassword}
                  isLoading={isSubmitting}
                  containerStyle="py-2 mb-3"
                />

                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text className="text-[#0A864D] text-sm font-pmedium text-center">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View className="bg-green-50 rounded-xl p-4 mb-3">
                  <Text className="text-green-800 text-sm font-pmedium text-center">
                    ✓ Reset link sent successfully!
                  </Text>
                </View>

                <CustomButton
                  title="Back to Login"
                  handlePress={() => navigation.navigate('Login')}
                  containerStyle="py-2"
                />
              </View>
            )}
          </View>

          {/* Powered by section at bottom */}
          <View className="px-4 pb-4">
            <Text className="text-sm font-pregular text-gray-500 text-center mb-2">
              Powered by
            </Text>
            <View className="flex-row justify-between items-center px-2">
              <View className="flex-1 items-center">
                <Image 
                  source={embassyImage}
                  className="w-36 h-16"
                  resizeMode="contain"
                />
              </View>
              
              <View className="flex-1 items-center">
                <Image 
                  source={crecoImage}
                  className="w-36 h-16"
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;