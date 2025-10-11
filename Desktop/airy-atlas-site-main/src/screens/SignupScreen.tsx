import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {CustomButton, FormField} from '../components';
import {icons} from '../constants';

type Props = {};
// let's go with get started first
const SignupScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  type RootStackParamList = {
    ForgotPassword: undefined;
    Login: undefined;
  };
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignup = async () => {
    // Basic validation
    if (!form.email || !form.username || !form.password) {
      setEmailError('Please fill all fields');
      return;
    }
    
    if (form.password !== form.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your backend API call
      // const response = await fetch('YOUR_BACKEND_URL/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: form.email,
      //     username: form.username,
      //     password: form.password,
      //   }),
      // });
      
      // For now, simulate successful signup
      setTimeout(() => {
        setIsSubmitting(false);
        // Navigate to login after successful signup
        navigation.navigate('Login');
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      setEmailError('Signup failed. Please try again.');
    }
  };
  
  const handleSignInWithProvider = () => {};
  
  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };
  return (
    <View className="flex-1 bg-white justify-center">
      <View className="px-6 mt-20">
        <View className="mb-8">
          <Text className="text-2xl font-pbold text-gray-900 mb-2 text-center">
            Create Account
          </Text>
          <Text className="text-sm font-pregular text-gray-600 text-center">
            Join HAKIKISHA to verify facts
          </Text>
        </View>

        <FormField
          title="Email"
          value={form.email}
          setError={setEmailError}
          error={emailError}
          handleChangeText={(e: any) => {
            setEmailError('');
            setForm({...form, email: e});
          }}
          placeholder="Email"
          otherStyles="mb-4"
        />
        <FormField
          title="Username"
          value={form.username}
          setError={setEmailError}
          error={emailError}
          handleChangeText={(e: any) => {
            setEmailError('');
            setForm({...form, username: e});
          }}
          placeholder="Username"
          otherStyles="mb-4"
        />
        <FormField
          title="Password"
          value={form.password}
          setError={setPasswordError}
          error={passwordError}
          handleChangeText={(e: any) => {
            setPasswordError('');
            setForm({...form, password: e});
          }}
          placeholder="Password"
          otherStyles="mb-4"
        />
        <FormField
          title="Confirm Password"
          value={form.confirmPassword}
          setError={setPasswordError}
          error={passwordError}
          handleChangeText={(e: any) => {
            setPasswordError('');
            setForm({...form, confirmPassword: e});
          }}
          placeholder="Confirm Password"
          otherStyles="mb-4"
        />

        <View className="mb-5">
          <Text className="text-gray-600 text-xs font-pregular leading-5 text-center">
            By signing up, you agree to HAKIKISHA's{' '}
            <Text className="text-[#0A864D] font-pmedium">Terms and Conditions</Text>
            {' '}and{' '}
            <Text className="text-[#0A864D] font-pmedium">Privacy Policy</Text>
          </Text>
        </View>

        <CustomButton
          title="Sign Up"
          handlePress={handleSignup}
          isLoading={isSubmitting}
          containerStyle="py-2 mb-5"
        />

        <View className="flex-row items-center justify-center">
          <Text className="text-gray-600 text-sm font-pregular">
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={handleNavigateToLogin}>
            <Text className="text-[#0A864D] text-sm font-pbold">
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SignupScreen;