import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {CustomButton} from '../components';
import LineInputField from '../components/LineInputField';

type RootStackParamList = {
  ForgotPassword: undefined;
  Login: undefined;
  HomeScreen: undefined;
};

const SignupScreen = () => {
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

  // State to track focused inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignup = async () => {
    if (!form.email || !form.username || !form.password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    try {
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert('Success', 'Account created successfully! Please login.');
        navigation.navigate('Login');
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Signup failed. Please try again.');
    }
  };
  
  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };

  const embassyImage = require('../assets/images/emabsy_of_finlad.png');
  const crecoImage = require('../assets/images/creco-kenya.png');
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView 
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 bg-white pt-12">
          {/* Signup content first */}
          <View className="px-6 pb-4">
            <View className="mb-4">
              <Text className="text-2xl font-pbold text-gray-900 mb-1 text-center">
                Create Account
              </Text>
              <Text className="text-sm font-pregular text-gray-600 text-center">
                Join HAKIKISHA to verify Information
              </Text>
            </View>

            <LineInputField
              title="Email"
              value={form.email}
              placeholder="Enter your email"
              onChangeText={(e: string) => {
                setEmailError('');
                setForm({...form, email: e});
              }}
              error={emailError}
              fieldName="email"
              focusedField={focusedField}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <LineInputField
              title="Username"
              value={form.username}
              placeholder="Choose a username"
              onChangeText={(e: string) => {
                setEmailError('');
                setForm({...form, username: e});
              }}
              error={emailError}
              fieldName="username"
              focusedField={focusedField}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
            />

            <LineInputField
              title="Password"
              value={form.password}
              placeholder="Create a password"
              onChangeText={(e: string) => {
                setPasswordError('');
                setForm({...form, password: e});
              }}
              error={passwordError}
              secureTextEntry={true}
              fieldName="password"
              focusedField={focusedField}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />

            <LineInputField
              title="Confirm Password"
              value={form.confirmPassword}
              placeholder="Confirm your password"
              onChangeText={(e: string) => {
                setPasswordError('');
                setForm({...form, confirmPassword: e});
              }}
              error={passwordError}
              secureTextEntry={true}
              fieldName="confirmPassword"
              focusedField={focusedField}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
            />

            <View className="mb-4">
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
              containerStyle="py-2 mb-4"
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

          {/* Powered by section moved to bottom */}
          <View className="px-4 pb-4">
            <Text className="text-sm font-pregular text-gray-500 text-center mb-2">
              Powered by
            </Text>
            <View className="flex-row justify-between items-center px-2">
              <View className="flex-1 items-center">
                <Image 
                  source={embassyImage}
                  className="w-32 h-16"
                  resizeMode="contain"
                />
              </View>
              
              <View className="flex-1 items-center">
                <Image 
                  source={crecoImage}
                  className="w-32 h-16"
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

export default SignupScreen;