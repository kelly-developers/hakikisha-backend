import React from 'react';
import {Text, TextInput, View} from 'react-native';

interface LineInputFieldProps {
  title: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  fieldName: string;
  focusedField: string | null;
  onFocus: () => void;
  onBlur: () => void;
}

const LineInputField: React.FC<LineInputFieldProps> = ({
  title,
  value,
  placeholder,
  onChangeText,
  error,
  secureTextEntry = false,
  fieldName,
  focusedField,
  onFocus,
  onBlur,
}) => (
  <View className="mb-4">
    <Text className="text-gray-700 text-sm font-pmedium mb-1">{title}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      placeholderTextColor="#9CA3AF"
      className="text-gray-900 text-base font-pregular pb-2"
      style={{
        borderBottomWidth: focusedField === fieldName ? 2 : 1,
        borderBottomColor: error
          ? '#EF4444'
          : focusedField === fieldName
          ? '#0A864D'
          : '#D1D5DB',
        height: 35,
      }}
      onFocus={onFocus}
      onBlur={onBlur}
    />
    {error ? (
      <Text className="text-red-500 text-xs font-pregular mt-1">{error}</Text>
    ) : null}
  </View>
);

export default LineInputField;
