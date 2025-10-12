import {View, Text, ImageBackground} from 'react-native';
import React from 'react';
import {images} from '../constants';
import {CustomButton} from '../components';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

type Props = {};

const GetStartedScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
type RootStackParamList = {
    Login: undefined;
  };

  const GetStarted = () => {
    navigation.navigate('Login');
  };
  return (
    <ImageBackground
      source={images.get_started}
      className="w-full h-full flex-1">
      {/* push it to bottom instead of a big margin */}
      <View className="h-[60vh]" />
      <View className="px-3 h-[40vh] pt-3 shadow-md bg-black-100/30 w-full">
        <Text className="text-white text-4xl text-center font-bold ">
          HAKIKISHA
        </Text>
        <Text className="text-[#F2F2F2] text-lg font-medium text-center mt-3">
          Combat Misinformation. Verify Truth. Empower Democracy.
        </Text>

        <CustomButton
          title="Get Started"
          containerStyle="py-4 my-8"
          handlePress={GetStarted}
        />
      </View>
    </ImageBackground>
  );
};

export default GetStartedScreen;
