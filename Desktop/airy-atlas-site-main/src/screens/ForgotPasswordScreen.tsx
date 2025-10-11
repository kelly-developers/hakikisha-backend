import {View, Text, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {CustomButton, FormField} from '../components';

type Props = {};

const ForgotPasswordScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setEmailError('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your backend API call
      // const response = await fetch('YOUR_BACKEND_URL/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      setTimeout(() => {
        setIsSubmitting(false);
        setResetSent(true);
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      setEmailError('Failed to send reset email. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-white justify-center">
      <View className="px-6">
        <View className="mb-8">
          <Text className="text-2xl font-pbold text-gray-900 mb-3 text-center">
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
            <FormField
              title="Email"
              value={email}
              setError={setEmailError}
              error={emailError}
              handleChangeText={(e: any) => {
                setEmailError('');
                setEmail(e);
              }}
              placeholder="Enter your email"
              otherStyles="mb-6"
            />

            <CustomButton
              title="Send Reset Link"
              handlePress={handleResetPassword}
              isLoading={isSubmitting}
              containerStyle="py-2 mb-6"
            />

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-[#0A864D] text-sm font-pmedium text-center">
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View className="bg-green-50 rounded-xl p-4 mb-6">
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
    </View>
  );
};

export default ForgotPasswordScreen;